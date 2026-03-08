import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { addressSchema, uuidSchema } from '../lib/validation';

export const addressesRouter = Router();

// Get user's addresses
addressesRouter.get('/', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

// Get address by ID
addressesRouter.get('/:id', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Create address
addressesRouter.post('/', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = addressSchema.parse(req.body);
    const supabase = getSupabaseService();

    // If setting as default, unset other defaults
    if (data.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', req.user.id);
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .insert({
        ...data,
        user_id: req.user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(address);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update address
addressesRouter.patch('/:id', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const data = addressSchema.partial().parse(req.body);
    const supabase = getSupabaseService();

    // Verify ownership
    const { data: existing } = await supabase
      .from('addresses')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, unset other defaults
    if (data.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', req.user.id)
        .neq('id', id);
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(address);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delete address
addressesRouter.delete('/:id', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Address deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});
