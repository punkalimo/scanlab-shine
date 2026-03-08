import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { uuidSchema } from '../lib/validation';

export const wishlistsRouter = Router();

// Get user's wishlist
wishlistsRouter.get('/', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        *,
        product:products(
          id, name, slug, price, compare_at_price, discount_percentage,
          images:product_images(image_url, is_primary),
          inventory:inventory(quantity)
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

// Add to wishlist
wishlistsRouter.post('/', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { product_id } = uuidSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Check if product exists
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in wishlist
    const { data: existing } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    const { data: wishlistItem, error } = await supabase
      .from('wishlists')
      .insert({
        user_id: req.user.id,
        product_id,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(wishlistItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Remove from wishlist
wishlistsRouter.delete('/:productId', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', productId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Check if product is in wishlist
wishlistsRouter.get('/check/:productId', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return res.status(400).json({ error: error.message });
    }

    res.json({ inWishlist: !!data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});
