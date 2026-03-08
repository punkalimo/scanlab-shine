import { Router, Response, NextFunction, Request } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';
import { uuidSchema, uuidParamsSchema, productIdParamsSchema, orderIdParamsSchema, updateUserRoleSchema, updateInventorySchema, stockMovementSchema, updateOrderStatusSchema, updateDeliverySchema, confirmPaymentSchema, deliveryZoneSchema } from '../lib/validation';

export const adminRouter = Router();

// All admin routes require authentication
adminRouter.use(authenticate);

// User Management

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().default('customer'),
});

const messageSchema = z.object({
  ciphertext: z.string().min(1),
  sender_public_key: z.string().optional(),
  nonce: z.string().optional(),
});

const startConversationSchema = z.object({
  user_id: uuidSchema,
  ciphertext: z.string().min(1).optional(),
  sender_public_key: z.string().optional(),
  nonce: z.string().optional(),
});

// Create user and return a password setup link
adminRouter.post('/users', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const payload = createUserSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Create auth user without a password; mark password_set false
    const tempPassword = crypto.randomBytes(12).toString('hex');

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { password_set: false },
    });

    if (createError || !created?.user) {
      return res.status(400).json({ error: createError?.message || 'Failed to create user' });
    }

    // Ensure profile exists/updated
    await supabase
      .from('profiles')
      .upsert({
        id: created.user.id,
        email: payload.email,
        full_name: payload.full_name || null,
        phone: payload.phone || null,
        role: payload.role,
      });

    const redirectBase = (process.env.AUTH_REDIRECT_BASE || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const redirectTo = `${redirectBase}/reset-password`;
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: payload.email,
      options: { redirectTo },
    });

    const actionLink = linkData?.properties?.action_link || linkData?.action_link;

    if (linkError || !actionLink) {
      console.error('Generate link error (create user):', linkError, linkData);
      return res.status(400).json({
        error: linkError?.message || 'Failed to generate password link',
        hint: 'Ensure redirect URL is whitelisted in Supabase Auth settings.',
        redirectTo,
      });
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'create_user',
      table_name: 'profiles',
      record_id: created.user.id,
      new_values: { role: payload.role, email: payload.email },
    });

    res.status(201).json({
      user: {
        id: created.user.id,
        email: payload.email,
        full_name: payload.full_name || null,
        phone: payload.phone || null,
        role: payload.role,
        password_set: false,
      },
      password_link: actionLink,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Regenerate password setup link for a user
adminRouter.post('/users/:id/password-link', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single();

    if (!profile?.email) {
      return res.status(404).json({ error: 'User not found' });
    }

    const redirectBase = (process.env.AUTH_REDIRECT_BASE || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const redirectTo = `${redirectBase}/reset-password`;
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
      options: { redirectTo },
    });

    const actionLink = data?.properties?.action_link || data?.action_link;

    if (error || !actionLink) {
      console.error('Generate link error (regen):', error, data);
      return res.status(400).json({
        error: error?.message || 'Failed to generate link',
        hint: 'Ensure redirect URL is whitelisted in Supabase Auth settings.',
        redirectTo,
      });
    }

    // Mark password_set as false until user sets it
    await supabase.auth.admin.updateUserById(id, { user_metadata: { password_set: false } });

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'regenerate_password_link',
      table_name: 'profiles',
      record_id: id,
      new_values: { action_link: data.action_link },
    });

    res.json({ password_link: actionLink, email: profile.email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Get all users (profiles + auth metadata)
adminRouter.get('/users', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { role } = req.query;
    const supabase = getSupabaseService();
    
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data: profiles, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Fetch auth metadata for password status
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const passwordStatus = new Map<string, boolean>();
    authUsers?.users?.forEach((u: any) => {
      const metaFlag = u.user_metadata?.password_set;
      const hasSignedIn = Boolean(u.last_sign_in_at);
      passwordStatus.set(u.id, metaFlag !== undefined ? Boolean(metaFlag) : hasSignedIn);
    });

    const merged = (profiles || []).map((p: any) => ({
      ...p,
      password_set: passwordStatus.get(p.id) ?? false,
    }));

    res.json({ users: merged });
  } catch (error) {
    next(error);
  }
});

// Delete a user (removes auth user; cascades to profile)
adminRouter.delete('/users/:id', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    if (req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'delete_user',
      table_name: 'profiles',
      record_id: id,
      old_values: existing,
    });

    res.json({ message: 'User deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update user role
adminRouter.patch('/users/:id/role', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const { role, is_active } = updateUserRoleSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Get existing user
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role, is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'update_role',
      table_name: 'profiles',
      record_id: id,
      old_values: { role: existing.role, is_active: existing.is_active },
      new_values: { role, is_active },
    });

    res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Admin reset user password (sets a new password directly, no email required)
adminRouter.post('/users/:id/reset-password', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single();

    // Generate a password reset link instead of setting a password directly
    const redirectBase = (process.env.AUTH_REDIRECT_BASE || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const redirectTo = `${redirectBase}/reset-password`;
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: profile?.email,
      options: { redirectTo },
    });

    const actionLink = data?.properties?.action_link || data?.action_link;

    if (error || !actionLink) {
      console.error('Generate link error (reset):', error, data);
      return res.status(400).json({
        error: error?.message || 'Failed to generate reset link',
        hint: 'Ensure redirect URL is whitelisted in Supabase Auth settings.',
        redirectTo,
      });
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'reset_password_link',
      table_name: 'profiles',
      record_id: id,
      new_values: { action_link: data.action_link },
    });

    // Ensure password_set stays false until user sets it themselves
    await supabase.auth.admin.updateUserById(id, { user_metadata: { password_set: false } });

    res.json({ password_link: actionLink, email: profile?.email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Deactivate/Activate user
adminRouter.patch('/users/:id/active', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const { is_active } = req.body;
    const supabase = getSupabaseService();

    const { error } = await supabase
      .from('profiles')
      .update({ is_active })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: is_active ? 'activate' : 'deactivate',
      table_name: 'profiles',
      record_id: id,
    });

    res.json({ message: is_active ? 'User activated' : 'User deactivated' });
  } catch (error) {
    next(error);
  }
});

// Deactivate user
adminRouter.post('/users/:id/deactivate', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'deactivate',
      table_name: 'profiles',
      record_id: id,
    });

    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
});

// Messaging (admin-facing)
adminRouter.get('/conversations', requireAdmin(), async (_req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('conversations')
      .select('*, user:profiles!conversations_user_id_fkey(id, email, full_name, role)')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ conversations: data || [] });
  } catch (error) {
    next(error);
  }
});

// Admin can start a conversation with any user (or reuse the latest existing one)
adminRouter.post('/conversations', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const payload = startConversationSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Ensure target user exists
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', payload.user_id)
      .single();

    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Try to reuse the most recent conversation with this user
    const { data: existingList } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', payload.user_id)
      .order('created_at', { ascending: false })
      .limit(1);

    let conversation = existingList?.[0];

    if (!conversation) {
      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({
          user_id: payload.user_id,
          assignee_role: req.user.role,
          assignee_id: req.user.id,
        })
        .select()
        .single();

      if (createError || !created) {
        return res.status(400).json({ error: createError?.message || 'Failed to create conversation' });
      }

      conversation = created;
    }

    let initialMessage = null;
    if (payload.ciphertext) {
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: req.user.id,
          sender_role: req.user.role,
          ciphertext: payload.ciphertext,
          sender_public_key: payload.sender_public_key || null,
          nonce: payload.nonce || null,
        })
        .select()
        .single();

      if (messageError) {
        return res.status(400).json({ error: messageError.message });
      }
      initialMessage = message;
    }

    res.status(201).json({ conversation, initial_message: initialMessage, reused: Boolean(existingList?.length) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

adminRouter.get('/conversations/:id/messages', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data: convo } = await supabase.from('conversations').select('*').eq('id', id).single();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ messages: data || [] });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/conversations/:id/assign', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const { assignee_role, assignee_id } = req.body as { assignee_role?: string; assignee_id?: string | null };
    const supabase = getSupabaseService();

    const { data: convo } = await supabase.from('conversations').select('*').eq('id', id).single();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const { data, error } = await supabase
      .from('conversations')
      .update({ assignee_role: assignee_role || null, assignee_id: assignee_id || null })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ conversation: data });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/conversations/:id/messages', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const payload = messageSchema.parse(req.body);
    const supabase = getSupabaseService();

    const { data: convo } = await supabase.from('conversations').select('*').eq('id', id).single();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: req.user.id,
        sender_role: req.user.role,
        ciphertext: payload.ciphertext,
        sender_public_key: payload.sender_public_key || null,
        nonce: payload.nonce || null,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ message: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Inventory Management

// Get all inventory
adminRouter.get('/inventory', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        product:products(id, name, sku, price)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ inventory: data || [] });
  } catch (error) {
    next(error);
  }
});

// Get all inventory with low stock alerts
adminRouter.get('/inventory/low-stock', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        product:products(id, name, sku, price)
      `);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Filter for low stock (quantity <= reorder_level)
      const lowStockData = (data || []).filter((item: any) => item.quantity <= item.reorder_level);

      res.json(lowStockData);
  } catch (error) {
    next(error);
  }
});

// Update inventory
adminRouter.patch('/inventory/:productId', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = productIdParamsSchema.parse(req.params);
    const data = updateInventorySchema.parse(req.body);
    const supabase = getSupabaseService();

    const { data: inventory, error } = await supabase
      .from('inventory')
      .update(data)
      .eq('product_id', productId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(inventory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Create stock movement
adminRouter.post('/stock-movements', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = stockMovementSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Get current inventory; create a baseline record if missing and the movement is an addition
    let { data: inventory } = await supabase
      .from('inventory')
      .select('id, quantity, reserved_quantity')
      .eq('product_id', data.product_id)
      .single();

    if (!inventory) {
      if (data.quantity < 0) {
        return res.status(400).json({ error: 'Inventory record not found for this product' });
      }
      const { data: created, error: createError } = await supabase
        .from('inventory')
        .insert({ product_id: data.product_id, quantity: data.quantity })
        .select('id, quantity, reserved_quantity')
        .single();
      if (createError) {
        return res.status(400).json({ error: createError.message });
      }
      inventory = created;
    }

    // Calculate new quantity
    const newQuantity = inventory.quantity + data.quantity;
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Update inventory
    await supabase
      .from('inventory')
      .update({ quantity: newQuantity })
      .eq('product_id', data.product_id);

    // Record movement
    const { data: movement, error } = await supabase
      .from('stock_movements')
      .insert({
        ...data,
        performed_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(movement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Order Management

// Get all orders
adminRouter.get('/orders', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const supabase = getSupabaseService();

    let query = supabase
      .from('orders')
      .select(`
        *,
        user:profiles(id, email, full_name),
        items:order_items(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      orders: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit)),
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update order status
adminRouter.patch('/orders/:id/status', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const { status, notes } = updateOrderStatusSchema.parse(req.body);
    const supabase = getSupabaseService();

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status, notes: notes || null })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'update_status',
      table_name: 'orders',
      record_id: id,
      new_values: { status },
    });

    // Send notification to user
    if (order.user_id) {
      await supabase.from('notifications').insert({
        user_id: order.user_id,
        type: 'order',
        title: 'Order Status Updated',
        message: `Your order ${order.order_number} status has been updated to ${status}`,
        data: { order_id: id, status },
      });
    }

    res.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Assign order to store officer
adminRouter.patch('/orders/:id/assign', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const { assigned_to } = req.body;
    const supabase = getSupabaseService();

    const { data: order, error } = await supabase
      .from('orders')
      .update({ assigned_to })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Notify assigned officer
    if (assigned_to) {
      await supabase.from('notifications').insert({
        user_id: assigned_to,
        type: 'order',
        title: 'New Order Assigned',
        message: `You have been assigned order ${order.order_number}`,
        data: { order_id: id },
      });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Payment Management

// Get all payments
adminRouter.get('/payments', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        order:orders(id, order_number, user_id, guest_email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ payments: data || [] });
  } catch (error) {
    next(error);
  }
});

// Confirm payment
adminRouter.post('/payments/:orderId/confirm', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    // Get or create payment record
    let { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (payment) {
      // Update existing payment
      const { data: updated, error } = await supabase
        .from('payments')
        .update({
          status: 'confirmed',
          confirmed_by: req.user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('order_id', orderId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      payment = updated;
    } else {
      // Get order total
      const { data: order } = await supabase
        .from('orders')
        .select('total')
        .eq('id', orderId)
        .single();

      const { data: created, error } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: order?.total || 0,
          payment_method: 'cash',
          status: 'confirmed',
          confirmed_by: req.user.id,
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      payment = created;
    }

    // Update order status to paid
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId);

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'confirm_payment',
      table_name: 'payments',
      record_id: payment.id,
      new_values: { status: 'confirmed' },
    });

    res.json(payment);
  } catch (error) {
    next(error);
  }
});

// Reject payment
adminRouter.post('/payments/:orderId/reject', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    // Update payment status
    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status: 'failed',
        confirmed_by: req.user.id,
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'reject_payment',
      table_name: 'payments',
      record_id: payment.id,
      new_values: { status: 'failed' },
    });

    res.json(payment);
  } catch (error) {
    next(error);
  }
});

// Delivery Management

// Get all deliveries
adminRouter.get('/deliveries', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const supabase = getSupabaseService();

    let query = supabase
      .from('deliveries')
      .select(`
        *,
        order:orders(id, order_number, user_id, guest_email, contact_phone, delivery_address)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ deliveries: data || [] });
  } catch (error) {
    next(error);
  }
});

// Create delivery record
adminRouter.post('/deliveries', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { order_id, driver_name, driver_phone, vehicle_info, estimated_arrival } = req.body;
    const supabase = getSupabaseService();

    // Check if delivery already exists
    const { data: existing } = await supabase
      .from('deliveries')
      .select('id')
      .eq('order_id', order_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Delivery record already exists' });
    }

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert({
        order_id,
        status: 'pending',
        driver_name,
        driver_phone,
        vehicle_info,
        estimated_arrival,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(delivery);
  } catch (error) {
    next(error);
  }
});

// Update delivery status
adminRouter.patch('/deliveries/:id/status', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const data = updateDeliverySchema.parse(req.body);
    const supabase = getSupabaseService();

    // Add actual_arrival if delivered
    if (data.status === 'delivered') {
      (data as any).actual_arrival = new Date().toISOString();
    }

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update order status if delivery completed
    if (data.status === 'delivered') {
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', delivery.order_id);
    }

    res.json(delivery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delivery Zones

// Get all delivery zones
adminRouter.get('/delivery-zones', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .order('city', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

// Create delivery zone
adminRouter.post('/delivery-zones', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = deliveryZoneSchema.parse(req.body);
    const supabase = getSupabaseService();

    const { data: zone, error } = await supabase
      .from('delivery_zones')
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
      table_name: 'delivery_zones',
      record_id: zone.id,
      new_values: zone,
    });

    res.status(201).json(zone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update delivery zone
adminRouter.patch('/delivery-zones/:id', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const data = deliveryZoneSchema.partial().parse(req.body);
    const supabase = getSupabaseService();

    const { data: zone, error } = await supabase
      .from('delivery_zones')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(zone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delete delivery zone
adminRouter.delete('/delivery-zones/:id', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    // Soft delete
    const { error } = await supabase
      .from('delivery_zones')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Delivery zone deleted' });
  } catch (error) {
    next(error);
  }
});

// Inquiries Management

// Get all inquiries
adminRouter.get('/inquiries', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('inquiries')
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

// Mark inquiry as read
adminRouter.patch('/inquiries/:id/read', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamsSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('inquiries')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Audit Logs

// Get audit logs
adminRouter.get('/audit-logs', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const supabase = getSupabaseService();

    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      logs: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Export orders as CSV
adminRouter.get('/orders/export', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const supabase = getSupabaseService();

    let query = supabase
      .from('orders')
      .select(`
        order_number,
        status,
        fulfillment_type,
        total,
        contact_phone,
        created_at,
        user:profiles(email, full_name)
      `);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Convert to CSV
    const headers = ['Order Number', 'Status', 'Type', 'Total', 'Phone', 'Date', 'Customer'];
    const rows = data?.map((order: any) => [
      order.order_number,
      order.status,
      order.fulfillment_type,
      order.total,
      order.contact_phone,
      new Date(order.created_at).toISOString(),
      order.user?.email || order.user?.full_name || 'Guest',
    ]);

    const csv = [headers.join(','), ...rows?.map((row: any) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});
