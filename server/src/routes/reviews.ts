import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';
import { reviewSchema, uuidSchema } from '../lib/validation';

export const reviewsRouter = Router();

// Get reviews for a product (public - only moderated)
reviewsRouter.get('/product/:productId', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .eq('product_id', productId)
      .eq('is_moderated', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Calculate average
    const avgRating = data?.length 
      ? data.reduce((sum, r) => sum + r.rating, 0) / data.length 
      : 0;

    res.json({
      reviews: data || [],
      average_rating: avgRating,
      total_reviews: data?.length || 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Create review (authenticated users)
reviewsRouter.post('/', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = reviewSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Check if product exists
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', data.product_id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user already reviewed
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', data.product_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        ...data,
        user_id: req.user.id,
        is_moderated: false, // Require moderation
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Get user's reviews
reviewsRouter.get('/my-reviews', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        product:products(id, name, slug)
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

// Moderate review (admin only)
reviewsRouter.patch('/:id/moderate', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const { is_moderated } = req.body;
    const supabase = getSupabaseService();

    const { data: review, error } = await supabase
      .from('reviews')
      .update({ is_moderated })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'moderate_review',
      table_name: 'reviews',
      record_id: id,
      new_values: { is_moderated },
    });

    res.json(review);
  } catch (error) {
    next(error);
  }
});

// Delete review (admin or owner)
reviewsRouter.delete('/:id', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    // Check ownership or admin
    const { data: review } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const isAdmin = ['admin', 'support_agent'].includes(req.user.role);
    if (review.user_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Review deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});
