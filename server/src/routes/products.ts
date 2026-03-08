import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { optionalAuth, authenticate, AuthenticatedRequest } from '../middleware/auth';
import { searchSchema, productSchema, updateProductSchema, uuidSchema } from '../lib/validation';

export const productsRouter = Router();

// Get all products (public)
productsRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = searchSchema.parse(req.query);
    const supabase = getSupabaseService();

    let dbQuery = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        images:product_images(*),
        inventory:inventory(*)
      `)
      .eq('is_active', true);

    // Apply filters
    if (query.search) {
      dbQuery = dbQuery.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%,brand.ilike.%${query.search}%`);
    }

    if (query.category) {
      dbQuery = dbQuery.eq('category_id', query.category);
    }

    if (query.productType) {
      dbQuery = dbQuery.eq('product_type', query.productType);
    }

    if (query.minPrice) {
      dbQuery = dbQuery.gte('price', query.minPrice);
    }

    if (query.maxPrice) {
      dbQuery = dbQuery.lte('price', query.maxPrice);
    }

    if (query.featured) {
      dbQuery = dbQuery.eq('is_featured', true);
    }

    // Sorting
    switch (query.sort) {
      case 'price_asc':
        dbQuery = dbQuery.order('price', { ascending: true });
        break;
      case 'price_desc':
        dbQuery = dbQuery.order('price', { ascending: false });
        break;
      case 'newest':
        dbQuery = dbQuery.order('created_at', { ascending: false });
        break;
      default:
        dbQuery = dbQuery.order('name', { ascending: true });
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    dbQuery = dbQuery.range(from, to);

    const { data, error } = await dbQuery;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get total count
    let countQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (query.search) {
      countQuery = countQuery.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }

    const { count } = await countQuery;

    res.json({
      products: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Get featured products
productsRouter.get('/featured', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        images:product_images(*),
        inventory:inventory(*)
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Get product by ID
productsRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        images:product_images(*),
        inventory:inventory(*),
        reviews:reviews(*, user:profiles(id, full_name, avatar_url))
          .order('created_at', { ascending: false })
          .limit(10)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get average rating
    const { data: ratingData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', id)
      .eq('is_moderated', true);

    const avgRating = ratingData?.length 
      ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length 
      : 0;

    res.json({
      ...product,
      average_rating: avgRating,
      review_count: ratingData?.length || 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Create product (admin only)
productsRouter.post('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !['admin', 'product_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const data = productSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('slug', data.slug)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Product with this slug already exists' });
    }

    // Check for duplicate SKU
    if (data.sku) {
      const { data: skuExisting } = await supabase
        .from('products')
        .select('id')
        .eq('sku', data.sku)
        .single();

      if (skuExisting) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert(data)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create initial inventory record
    await supabase
      .from('inventory')
      .insert({ product_id: product.id });

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'create',
      table_name: 'products',
      record_id: product.id,
      new_values: product,
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
    });

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update product (admin only)
productsRouter.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !['admin', 'product_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = uuidSchema.parse(req.params);
    const data = updateProductSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Get existing product
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'update',
      table_name: 'products',
      record_id: id,
      old_values: existing,
      new_values: product,
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
    });

    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delete product (admin only)
productsRouter.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !['admin', 'product_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    // Soft delete - just mark as inactive
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'delete',
      table_name: 'products',
      record_id: id,
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
    });

    res.json({ message: 'Product deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Upload product image (admin only)
productsRouter.post('/:id/images', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !['admin', 'product_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = uuidSchema.parse(req.params);
    const { image_url, alt_text, is_primary } = req.body;
    const supabase = getSupabaseService();

    // Check if product exists
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If setting as primary, unset other primaries
    if (is_primary) {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', id);
    }

    // Get current max order
    const { data: lastImage } = await supabase
      .from('product_images')
      .select('display_order')
      .eq('product_id', id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const { data: image, error } = await supabase
      .from('product_images')
      .insert({
        product_id: id,
        image_url,
        alt_text,
        is_primary: is_primary || false,
        display_order: (lastImage?.display_order || 0) + 1,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(image);
  } catch (error) {
    next(error);
  }
});

// Delete product image (admin only)
productsRouter.delete('/:productId/images/:imageId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !['admin', 'product_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { productId, imageId } = uuidSchema.parse({ productId: req.params.id, imageId: req.params.imageId });
    const supabase = getSupabaseService();

    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('product_id', productId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Image deleted' });
  } catch (error) {
    next(error);
  }
});
