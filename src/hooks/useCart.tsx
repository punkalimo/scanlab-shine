import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '@/integrations/api/client';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_add: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images?: { image_url: string; is_primary: boolean }[];
  };
}

interface Cart {
  cart_id: string;
  items: CartItem[];
  item_count: number;
  subtotal: number;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  cartCount: number;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  mergeCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  wishlist: string[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Initialize guest token
  useEffect(() => {
    const stored = localStorage.getItem('guest_token');
    if (stored) {
      setGuestToken(stored);
    } else {
      const newToken = crypto.randomUUID();
      localStorage.setItem('guest_token', newToken);
      setGuestToken(newToken);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const result = await api.getCart() as Cart;
        setCart(result);
      } else if (guestToken) {
        const result = await api.getCart(guestToken) as Cart;
        setCart(result);
      } else {
        setCart(null);
      }
    } catch (error) {
      console.error('Error refreshing cart:', error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [guestToken]);

  useEffect(() => {
    if (guestToken !== null) {
      refreshCart();
    }
  }, [guestToken, refreshCart]);

  const addToCart = async (productId: string, quantity = 1) => {
    try {
      await api.addToCart(productId, quantity, guestToken || undefined);
      await refreshCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await api.removeCartItem(itemId);
      } else {
        await api.updateCartItem(itemId, quantity);
      }
      await refreshCart();
    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.removeCartItem(itemId);
      await refreshCart();
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      if (guestToken) {
        await api.mergeCart(guestToken);
      }
      await refreshCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const mergeCart = async () => {
    if (guestToken) {
      try {
        await api.mergeCart(guestToken);
        localStorage.removeItem('guest_token');
        setGuestToken(null);
        await refreshCart();
      } catch (error) {
        console.error('Error merging cart:', error);
      }
    }
  };

  const cartCount = cart?.item_count || 0;

  const addToWishlist = async (productId: string) => {
    try {
      setWishlist(prev => [...prev, productId]);
      await api.addToWishlist(productId);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      setWishlist(prev => prev.filter(id => id !== productId));
      await api.removeFromWishlist(productId);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      cartCount,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      mergeCart,
      refreshCart,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      wishlist,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
