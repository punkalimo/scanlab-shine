-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ScanLab Sparkle eCommerce
-- =============================================================================

-- =============================================================================
-- PUBLIC ACCESS (READ-ONLY CATALOG)
-- =============================================================================

-- Categories: public read access
CREATE POLICY "Public can view categories" ON public.categories
  FOR SELECT USING (is_active = true);

-- Products: public read access (only active products)
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (is_active = true);

-- Product images: public read access
CREATE POLICY "Public can view product images" ON public.product_images
  FOR SELECT USING (true);

-- Product reviews: public read access (only moderated)
CREATE POLICY "Public can view moderated reviews" ON public.reviews
  FOR SELECT USING (is_moderated = true);

-- Delivery zones: public read access
CREATE POLICY "Public can view delivery zones" ON public.delivery_zones
  FOR SELECT USING (is_active = true);

-- Coupons: public read access (active ones only)
CREATE POLICY "Public can view active coupons" ON public.coupons
  FOR SELECT USING (
    is_active = true AND 
    (valid_from IS NULL OR valid_from <= NOW()) AND 
    (valid_until IS NULL OR valid_until >= NOW())
  );

-- =============================================================================
-- AUTHENTICATED USERS
-- =============================================================================

-- Profiles: users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Addresses: users can manage their own addresses
CREATE POLICY "Users can manage own addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);

-- Carts: users can manage their own cart
CREATE POLICY "Users can manage own cart" ON public.carts
  FOR ALL USING (auth.uid() = user_id);

-- Cart items: users can manage their own cart items
CREATE POLICY "Users can manage own cart items" ON public.cart_items
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.carts WHERE id = cart_id)
  );

-- Orders: users can read their own orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (guest_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Order items: users can read their own order items
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

-- Payments: users can view their own payments
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

-- Deliveries: users can view their own deliveries
CREATE POLICY "Users can view own deliveries" ON public.deliveries
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

-- Wishlists: users can manage their own wishlists
CREATE POLICY "Users can manage own wishlists" ON public.wishlists
  FOR ALL USING (auth.uid() = user_id);

-- Reviews: users can manage their own reviews
CREATE POLICY "Users can manage own reviews" ON public.reviews
  FOR ALL USING (auth.uid() = user_id);

-- Notifications: users can manage their own notifications
CREATE POLICY "Users can manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- ADMIN ROLES (admin, accountant, store_officer, product_manager, support_agent)
-- =============================================================================

-- Helper function to check admin roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'accountant', 'store_officer', 'product_manager', 'support_agent')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check specific admin role
CREATE OR REPLACE FUNCTION public.is_role(role_check public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = role_check AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- ADMIN FULL ACCESS
-- =============================================================================

-- Profiles: admins can manage all profiles
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (public.is_role('admin'));

-- Categories: admins and product managers can manage
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_role('admin'));

-- Products: admins and product managers can manage
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_role('admin') OR public.is_role('product_manager'));

-- Product images: admins and product managers can manage
CREATE POLICY "Admins can manage product images" ON public.product_images
  FOR ALL USING (public.is_role('admin') OR public.is_role('product_manager'));

-- Inventory: admins and store officers can manage
CREATE POLICY "Admins can manage inventory" ON public.inventory
  FOR ALL USING (public.is_role('admin') OR public.is_role('store_officer'));

-- Stock movements: admins and store officers can manage
CREATE POLICY "Admins can manage stock movements" ON public.stock_movements
  FOR ALL USING (public.is_role('admin') OR public.is_role('store_officer'));

-- Delivery zones: admins can manage
CREATE POLICY "Admins can manage delivery zones" ON public.delivery_zones
  FOR ALL USING (public.is_role('admin'));

-- Orders: admins can manage all orders
CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL USING (public.is_role('admin'));

-- Order items: admins can manage all order items
CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL USING (public.is_role('admin'));

-- Payments: admins and accountants can manage
CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (public.is_role('admin') OR public.is_role('accountant'));

-- Deliveries: admins and store officers can manage
CREATE POLICY "Admins can manage deliveries" ON public.deliveries
  FOR ALL USING (public.is_role('admin') OR public.is_role('store_officer'));

-- Coupons: admins can manage
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (public.is_role('admin'));

-- Coupon usage: admins can view
CREATE POLICY "Admins can view coupon usage" ON public.coupon_usage
  FOR SELECT USING (public.is_role('admin'));

-- Reviews: admins and support agents can manage (moderate)
CREATE POLICY "Admins can manage reviews" ON public.reviews
  FOR ALL USING (public.is_role('admin') OR public.is_role('support_agent'));

-- Inquiries: admins and support agents can manage
CREATE POLICY "Admins can manage inquiries" ON public.inquiries
  FOR ALL USING (public.is_role('admin') OR public.is_role('support_agent'));

-- Audit logs: admins can view
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_role('admin'));

-- Notifications: admins can send system notifications
CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL USING (public.is_role('admin') OR auth.uid() = user_id);

-- =============================================================================
-- ACCOUNTANT SPECIFIC
-- =============================================================================

-- Accountants can view orders and payments for accounting purposes
CREATE POLICY "Accountants can view orders" ON public.orders
  FOR SELECT USING (
    public.is_role('admin') OR 
    public.is_role('accountant') OR 
    user_id = auth.uid()
  );

CREATE POLICY "Accountants can view payments" ON public.payments
  FOR SELECT USING (
    public.is_role('admin') OR 
    public.is_role('accountant')
  );

-- =============================================================================
-- STORE OFFICER SPECIFIC
-- =============================================================================

-- Store officers can view all orders for fulfillment
CREATE POLICY "Store officers can view orders" ON public.orders
  FOR SELECT USING (
    public.is_role('admin') OR 
    public.is_role('store_officer') OR 
    user_id = auth.uid()
  );

-- =============================================================================
-- PRODUCT MANAGER SPECIFIC
-- =============================================================================

-- Product managers can view inventory for product planning
CREATE POLICY "Product managers can view inventory" ON public.inventory
  FOR SELECT USING (public.is_role('admin') OR public.is_role('product_manager'));

-- =============================================================================
-- SUPPORT AGENT SPECIFIC
-- =============================================================================

-- Support agents can view all orders for customer support
CREATE POLICY "Support agents can view orders" ON public.orders
  FOR SELECT USING (
    public.is_role('admin') OR 
    public.is_role('support_agent') OR 
    user_id = auth.uid()
  );

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Product images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND 
    (public.is_role('admin') OR public.is_role('product_manager'))
  );

CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images' AND 
    (public.is_role('admin') OR public.is_role('product_manager'))
  );

CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images' AND 
    (public.is_role('admin') OR public.is_role('product_manager'))
  );

-- User avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS (Optional - for live updates)
-- =============================================================================

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for orders (for admin dashboards)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
