import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';
import { couponSchema, uuidSchema } from '../lib/validation';

export const couponsRouter = Router();

// Validate coupon (public)
couponsRouter.post('/validate', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { code, order_total } = req.body;
    const supabase = getSupabaseService();

    if (!code) {
      return res.status(400).json({ error: 'Coupon code required' });
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !coupon) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }

    // Check if active
    if (!coupon.is_active) {
      return res.status(400).json({ error: 'Coupon is not active' });
    }

    // Check validity dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({ error: 'Coupon is not yet valid' });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    // Check usage limits
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    // Check minimum order amount
    if (coupon.min_order_amount && order_total < coupon.min_order_amount) {
      return res.status(400).json({ 
        error: `Minimum order amount of ${coupon.min_order_amount} required`,
        min_order_amount: coupon.min_order_amount 
      });
    }

    // Calculate discount
    let discount_amount = 0;
    if (coupon.discount_type === 'percentage') {
      discount_amount = (order_total * coupon.discount_value) / 100;
    } else {
      discount_amount = coupon.discount_value;
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
      discount_amount,
    });
  } catch (error) {
    next(error);
  }
});

// Get all coupons (admin only)
couponsRouter.get('/', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

// Create coupon (admin only)
couponsRouter.post('/', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = couponSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', data.code.toUpperCase())
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert({
        ...data,
        code: data.code.toUpperCase(),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'create',
      table_name: 'coupons',
      record_id: coupon.id,
      new_values: coupon,
    });

    res.status(201).json(coupon);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update coupon (admin only)
couponsRouter.patch('/:id', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const data = couponSchema.partial().parse(req.body);
    const supabase = getSupabaseService();

    if (data.code) {
      data.code = data.code.toUpperCase();
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
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
      table_name: 'coupons',
      record_id: id,
      new_values: coupon,
    });

    res.json(coupon);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delete coupon (admin only)
couponsRouter.delete('/:id', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    // Soft delete
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'delete',
      table_name: 'coupons',
      record_id: id,
    });

    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});
