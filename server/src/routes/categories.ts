import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';
import { categorySchema, uuidSchema } from '../lib/validation';

export const categoriesRouter = Router();

// Get all categories (public)
categoriesRouter.get('/', async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Build tree structure
    const categories = data || [];
    const roots = categories.filter((c: any) => !c.parent_id);
    const children = categories.filter((c: any) => c.parent_id);

    const buildTree = (parent: any) => {
      const kids = children.filter((c: any) => c.parent_id === parent.id);
      return { ...parent, children: kids.map(buildTree) };
    };

    res.json(roots.map(buildTree));
  } catch (error) {
    next(error);
  }
});

// Get category by ID
categoriesRouter.get('/:id', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Create category (admin only)
categoriesRouter.post('/', authenticate, requireAdmin('admin'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = categorySchema.parse(req.body);
    const supabase = getSupabaseService();

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', data.slug)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Category with this slug already exists' });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert(data)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'create',
      table_name: 'categories',
      record_id: category.id,
      new_values: category,
    });

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update category (admin only)
categoriesRouter.patch('/:id', authenticate, requireAdmin('admin'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const data = categorySchema.partial().parse(req.body);
    const supabase = getSupabaseService();

    const { data: category, error } = await supabase
      .from('categories')
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
      table_name: 'categories',
      record_id: id,
      new_values: category,
    });

    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delete category (admin only)
categoriesRouter.delete('/:id', authenticate, requireAdmin('admin'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    // Soft delete
    const { error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'delete',
      table_name: 'categories',
      record_id: id,
    });

    res.json({ message: 'Category deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});
