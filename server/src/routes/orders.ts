import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { checkoutSchema, uuidSchema, paginationSchema } from '../lib/validation';

export const ordersRouter = Router();

// Create order from cart (checkout)
ordersRouter.post('/', optionalAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = checkoutSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Get cart items
    let cartId: string | null = null;

    if (req.user) {
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
      cartId = cart?.id;
    } else if (req.body.guest_token) {
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('guest_token', req.body.guest_token)
        .single();
      cartId = cart?.id;
    }

    if (!cartId) {
      return res.status(400).json({ error: 'Cart not found' });
    }

    const { data: cartItems } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(id, name, sku, price, inventory:inventory(quantity, reserved_quantity))
      `)
      .eq('cart_id', cartId);

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check stock availability
    for (const item: any of cartItems) {
      const available = (item.product?.inventory?.quantity || 0) - (item.product?.inventory?.reserved_quantity || 0);
      if (available < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${item.product?.name}. Available: ${available}`
        });
      }
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price_at_add * item.quantity), 0);
    
    // Get delivery fee
    let deliveryFee = 0;
    if (data.fulfillment_type === 'courier' && data.delivery_zone_id) {
      const { data: zone } = await supabase
        .from('delivery_zones')
        .select('fee')
        .eq('id', data.delivery_zone_id)
        .single();
      deliveryFee = zone?.fee || 0;
    }

    // Apply coupon if provided
    let discountAmount = 0;
    if (data.coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', data.coupon_code)
        .eq('is_active', true)
        .single();

      if (coupon) {
        const now = new Date();
        const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          if (!coupon.min_order_amount || subtotal >= coupon.min_order_amount) {
            if (!coupon.max_uses || coupon.used_count < coupon.max_uses) {
              discountAmount = coupon.discount_type === 'percentage'
                ? (subtotal * coupon.discount_value / 100)
                : coupon.discount_value;
            }
          }
        }
      }
    }

    const total = subtotal + deliveryFee - discountAmount;

    // Generate order number
    const { data: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });
    
    const orderNumber = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${String((orderCount?.length || 0) + 1).padStart(6, '0')}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: req.user?.id || null,
        guest_email: data.guest_email || null,
        guest_phone: data.guest_phone,
        fulfillment_type: data.fulfillment_type,
        pickup_location: data.fulfillment_type === 'pickup' ? data.pickup_location : null,
        delivery_address_id: data.fulfillment_type === 'courier' ? data.address_id : null,
        delivery_zone_id: data.delivery_zone_id,
        delivery_fee: deliveryFee,
        courier_name: data.fulfillment_type === 'courier' ? 'Yango' : null,
        subtotal,
        delivery_fee_amount: deliveryFee,
        discount_amount: discountAmount,
        total,
        contact_phone: data.contact_phone,
        notes: data.notes,
        status: 'pending_payment',
      })
      .select()
      .single();

    if (orderError) {
      return res.status(400).json({ error: orderError.message });
    }

    // Create order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product?.name,
      product_sku: item.product?.sku,
      quantity: item.quantity,
      unit_price: item.price_at_add,
      total_price: item.price_at_add * item.quantity,
    }));

    await supabase.from('order_items').insert(orderItems);

    // Update inventory (reserve stock)
    for (const item: any of cartItems) {
      await supabase
        .from('inventory')
        .update({ reserved_quantity: item.product.inventory.reserved_quantity + item.quantity })
        .eq('product_id', item.product_id);

      // Record stock movement
      await supabase.from('stock_movements').insert({
        product_id: item.product_id,
        movement_type: 'sale',
        quantity: -item.quantity,
        reference_type: 'order',
        reference_id: order.id,
        notes: `Reserved for order ${orderNumber}`,
      });
    }

    // Apply coupon usage
    if (data.coupon_code && discountAmount > 0) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('id')
        .eq('code', data.coupon_code)
        .single();

      if (coupon) {
        await supabase.from('coupon_usage').insert({
          coupon_id: coupon.id,
          order_id: order.id,
          user_id: req.user?.id,
          discount_amount: discountAmount,
        });

        await supabase
          .from('coupons')
          .update({ used_count: +1 })
          .eq('id', coupon.id);
      }
    }

    // Clear cart
    await supabase.from('cart_items').delete().eq('cart_id', cartId);

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Get user's orders
ordersRouter.get('/', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const query = paginationSchema.parse(req.query);
    const supabase = getSupabaseService();

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        delivery:deliveries(*)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range((query.page - 1) * query.limit, query.page * query.limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    res.json({
      orders: orders || [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / query.limit),
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get order by ID
ordersRouter.get('/:id', optionalAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        delivery:deliveries(*),
        payment:payments(*)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access
    if (order.user_id !== req.user?.id && !req.user?.role?.startsWith('admin')) {
      // Check guest access
      if (!req.user && order.guest_email !== req.body.guest_email) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Cancel order
ordersRouter.post('/:id/cancel', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check ownership
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow cancellation of pending orders
    if (order.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id);

    // Restore inventory
    for (const item of order.items) {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('quantity, reserved_quantity')
        .eq('product_id', item.product_id)
        .single();

      if (inventory) {
        await supabase
          .from('inventory')
          .update({
            quantity: inventory.quantity + item.quantity,
            reserved_quantity: inventory.reserved_quantity - item.quantity,
          })
          .eq('product_id', item.product_id);
      }

      // Record stock movement
      await supabase.from('stock_movements').insert({
        product_id: item.product_id,
        movement_type: 'return',
        quantity: item.quantity,
        reference_type: 'order',
        reference_id: order.id,
        notes: `Order ${order.order_number} cancelled - stock restored`,
      });
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});
