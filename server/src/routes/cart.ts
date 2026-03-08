import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate, optionalAuth } from '../middleware/auth';
import { cartItemSchema, updateCartItemSchema, uuidSchema } from '../lib/validation';

export const cartRouter = Router();

// Get current cart
cartRouter.get('/', optionalAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();
    let cartId: string | null = null;

    // Get or create cart
    if (req.user) {
      // User's cart
      const { data: existingCart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (existingCart) {
        cartId = existingCart.id;
      } else {
        const { data: newCart } = await supabase
          .from('carts')
          .insert({ user_id: req.user.id })
          .select('id')
          .single();
        cartId = newCart?.id;
      }
    } else if (req.query.guest_token) {
      // Guest cart
      const { data: guestCart } = await supabase
        .from('carts')
        .select('id')
        .eq('guest_token', req.query.guest_token)
        .single();
      cartId = guestCart?.id;
    }

    if (!cartId) {
      return res.json({ items: [], total: 0 });
    }

    // Get cart items with product details
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(
          id, name, slug, price, compare_at_price, discount_percentage,
          images:product_images(image_url, is_primary)
        )
      `)
      .eq('cart_id', cartId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const items = cartItems || [];
    const total = items.reduce((sum: number, item: any) => sum + (item.price_at_add * item.quantity), 0);

    res.json({
      cart_id: cartId,
      items,
      item_count: items.length,
      subtotal: total,
    });
  } catch (error) {
    next(error);
  }
});

// Add item to cart
cartRouter.post('/items', optionalAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { product_id, quantity } = cartItemSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Get or create cart
    let cartId: string | null = null;

    if (req.user) {
      const { data: existingCart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (existingCart) {
        cartId = existingCart.id;
      } else {
        const { data: newCart } = await supabase
          .from('carts')
          .insert({ user_id: req.user.id })
          .select('id')
          .single();
        cartId = newCart?.id;
      }
    } else if (req.body.guest_token) {
      const { data: guestCart } = await supabase
        .from('carts')
        .select('id')
        .eq('guest_token', req.body.guest_token)
        .single();

      if (guestCart) {
        cartId = guestCart.id;
      } else {
        const { data: newCart } = await supabase
          .from('carts')
          .insert({ guest_token: req.body.guest_token })
          .select('id')
          .single();
        cartId = newCart?.id;
      }
    }

    if (!cartId) {
      return res.status(400).json({ error: 'Could not create cart' });
    }

    // Get product price
    const { data: product } = await supabase
      .from('products')
      .select('price')
      .eq('id', product_id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if item exists in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', product_id)
      .single();

    if (existingItem) {
      // Update quantity
      const { data: item, error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(item);
    } else {
      // Add new item
      const { data: item, error } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cartId,
          product_id,
          quantity,
          price_at_add: product.price,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json(item);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update cart item
cartRouter.patch('/items/:id', optionalAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const { quantity } = updateCartItemSchema.parse(req.body);
    const supabase = getSupabaseService();

    if (quantity === 0) {
      // Delete item
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Item removed from cart' });
    }

    // Update quantity
    const { data: item, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Remove item from cart
cartRouter.delete('/items/:id', optionalAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidSchema.parse(req.params);
    const supabase = getSupabaseService();

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Clear cart
cartRouter.delete('/', optionalAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    let cartId: string | null = null;

    if (req.user) {
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
      cartId = cart?.id;
    } else if (req.query.guest_token) {
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('guest_token', req.query.guest_token)
        .single();
      cartId = cart?.id;
    }

    if (cartId) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId);
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
});

// Merge guest cart with user cart on login
cartRouter.post('/merge', authenticate, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { guest_token } = req.body;
    const supabase = getSupabaseService();

    if (!guest_token) {
      return res.status(400).json({ error: 'Guest token required' });
    }

    // Get guest cart
    const { data: guestCart } = await supabase
      .from('carts')
      .select('id')
      .eq('guest_token', guest_token)
      .single();

    if (!guestCart) {
      return res.json({ message: 'No guest cart to merge' });
    }

    // Get user cart or create one
    let userCart: any;
    const { data: existingUserCart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (existingUserCart) {
      userCart = existingUserCart;
    } else {
      const { data: newCart } = await supabase
        .from('carts')
        .insert({ user_id: req.user.id })
        .select('id')
        .single();
      userCart = newCart;
    }

    // Get guest cart items
    const { data: guestItems } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', guestCart.id);

    // Merge items into user cart
    for (const item of guestItems || []) {
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', userCart.id)
        .eq('product_id', item.product_id)
        .single();

      if (existingItem) {
        // Update quantity
        await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + item.quantity })
          .eq('id', existingItem.id);
      } else {
        // Add item
        await supabase
          .from('cart_items')
          .insert({
            cart_id: userCart.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_add: item.price_at_add,
          });
      }
    }

    // Delete guest cart
    await supabase
      .from('carts')
      .delete()
      .eq('id', guestCart.id);

    res.json({ message: 'Cart merged successfully' });
  } catch (error) {
    next(error);
  }
});
