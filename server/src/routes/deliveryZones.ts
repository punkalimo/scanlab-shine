import { Router, Response, NextFunction } from 'express';
import { getSupabaseService } from '../lib/supabase';

export const deliveryZonesRouter = Router();

// Get all active delivery zones (public)
deliveryZonesRouter.get('/', async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

// Get delivery zone by ID
deliveryZonesRouter.get('/:id', async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});
