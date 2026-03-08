import { supabase } from '@/integrations/supabase/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = await this.getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const requestBody = options.body ? JSON.stringify(options.body) : undefined;
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[API] ${options.method || 'GET'} ${url}`, {
      body: options.body,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: requestBody,
      });
    } catch (error: any) {
      console.error(`[API] Network error for ${url}:`, error);
      // Provide more detailed error message
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error(`Cannot connect to server at ${this.baseUrl}. Is the backend running on port 3001?`);
      }
      throw new Error(error.message || 'Network error occurred');
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    
    console.log(`[API] Response ${endpoint}`, {
      status: response.status,
      ok: response.ok,
      data
    });

    if (!response.ok) {
      const errorText = typeof data.error === 'string'
        ? data.error
        : data.error
          ? JSON.stringify(data.error)
          : `Request failed with status ${response.status}`;
      throw new Error(errorText);
    }

    return data;
  }

  // Auth
  async signUp(email: string, password: string, data?: { full_name?: string; phone?: string }) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: { email, password, ...data },
    });
  }

  async signIn(email: string, password: string) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: { email, password },
    });
  }

  async signOut() {
    return this.request('/auth/signout', { method: 'POST' });
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  async updateProfile(data: { full_name?: string; phone?: string; avatar_url?: string }) {
    return this.request('/auth/me', {
      method: 'PATCH',
      body: data,
    });
  }

  async resetPassword(email: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: { email },
    });
  }

  // Products
  async getProducts(params?: {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    productType?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request(`/products?${query}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async getFeaturedProducts() {
    return this.request('/products/featured');
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  // Cart
  async getCart(guestToken?: string) {
    const query = guestToken ? `?guest_token=${guestToken}` : '';
    return this.request(`/cart${query}`);
  }

  async addToCart(productId: string, quantity: number, guestToken?: string) {
    return this.request('/cart/items', {
      method: 'POST',
      body: { product_id: productId, quantity, guest_token: guestToken },
    });
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.request(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: { quantity },
    });
  }

  async removeCartItem(itemId: string) {
    return this.request(`/cart/items/${itemId}`, { method: 'DELETE' });
  }

  async mergeCart(guestToken: string) {
    return this.request('/cart/merge', {
      method: 'POST',
      body: { guest_token: guestToken },
    });
  }

  // Orders
  async createOrder(data: {
    fulfillment_type: 'pickup' | 'courier';
    pickup_location?: string;
    address_id?: string;
    delivery_zone_id?: string;
    contact_phone: string;
    notes?: string;
    coupon_code?: string;
    guest_email?: string;
    guest_token?: string;
  }) {
    return this.request('/orders', {
      method: 'POST',
      body: data,
    });
  }

  async getOrders(page?: number, limit?: number) {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));
    return this.request(`/orders?${query}`);
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async cancelOrder(id: string) {
    return this.request(`/orders/${id}/cancel`, { method: 'POST' });
  }

  // Addresses
  async getAddresses() {
    return this.request('/addresses');
  }

  async createAddress(data: {
    type?: 'delivery' | 'pickup';
    label?: string;
    recipient_name?: string;
    phone?: string;
    street_address: string;
    city: string;
    province?: string;
    postal_code?: string;
    delivery_zone_id?: string;
    is_default?: boolean;
  }) {
    return this.request('/addresses', {
      method: 'POST',
      body: data,
    });
  }

  async updateAddress(id: string, data: any) {
    return this.request(`/addresses/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteAddress(id: string) {
    return this.request(`/addresses/${id}`, { method: 'DELETE' });
  }

  // Delivery Zones
  async getDeliveryZones() {
    return this.request('/delivery-zones');
  }

  // Coupons
  async validateCoupon(code: string, orderTotal: number) {
    return this.request('/coupons/validate', {
      method: 'POST',
      body: { code, order_total: orderTotal },
    });
  }

  // Wishlists
  async getWishlist() {
    return this.request('/wishlists');
  }

  async addToWishlist(productId: string) {
    return this.request('/wishlists', {
      method: 'POST',
      body: { product_id: productId },
    });
  }

  async removeFromWishlist(productId: string) {
    return this.request(`/wishlists/${productId}`, { method: 'DELETE' });
  }

  // Reviews
  async getProductReviews(productId: string) {
    return this.request(`/reviews/product/${productId}`);
  }

  async createReview(productId: string, data: { rating: number; title?: string; comment?: string }) {
    return this.request('/reviews', {
      method: 'POST',
      body: { product_id: productId, ...data },
    });
  }

  // Admin - Users
  async getUsers() {
    return this.request('/admin/users');
  }

  async getAllUsers(role?: string) {
    const query = role ? `?role=${role}` : '';
    return this.request(`/admin/users${query}`);
  }

  async toggleUserActive(userId: string, isActive: boolean) {
    return this.request(`/admin/users/${userId}/active`, {
      method: 'PATCH',
      body: { is_active: isActive },
    });
  }

  async updateUserRole(userId: string, role: string) {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role },
    });
  }

  async adminResetUserPassword(userId: string, password: string) {
    return this.request(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: { password },
    });
  }

  async adminDeleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, { method: 'DELETE' });
  }

  async adminCreateUser(data: { email: string; full_name?: string; phone?: string; role: string }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: data,
    });
  }

  async adminGeneratePasswordLink(userId: string) {
    return this.request(`/admin/users/${userId}/password-link`, {
      method: 'POST',
    });
  }

  // Messaging - user
  async getMyConversations() {
    return this.request('/messages/conversations');
  }

  async createConversation() {
    return this.request('/messages/conversations', { method: 'POST' });
  }

  async getConversationMessages(conversationId: string) {
    return this.request(`/messages/conversations/${conversationId}/messages`);
  }

  async sendConversationMessage(conversationId: string, data: { ciphertext: string; sender_public_key?: string; nonce?: string }) {
    return this.request(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: data,
    });
  }

  // Messaging - admin
  async adminGetConversations() {
    return this.request('/admin/conversations');
  }

  async adminGetConversationMessages(conversationId: string) {
    return this.request(`/admin/conversations/${conversationId}/messages`);
  }

  async adminSendConversationMessage(conversationId: string, data: { ciphertext: string; sender_public_key?: string; nonce?: string }) {
    return this.request(`/admin/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: data,
    });
  }

  async adminAssignConversation(conversationId: string, data: { assignee_role?: string; assignee_id?: string | null }) {
    return this.request(`/admin/conversations/${conversationId}/assign`, {
      method: 'PATCH',
      body: data,
    });
  }

  async adminCreateConversation(data: { user_id: string; ciphertext?: string; sender_public_key?: string; nonce?: string }) {
    return this.request(`/admin/conversations`, {
      method: 'POST',
      body: data,
    });
  }

  // Admin - Products
  async adminCreateProduct(data: any) {
    return this.request('/admin/products', {
      method: 'POST',
      body: data,
    });
  }

  async adminListProducts() {
    return this.request('/admin/products');
  }

  async adminUpdateProduct(id: string, data: any) {
    return this.request(`/admin/products/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async adminDeleteProduct(id: string) {
    return this.request(`/admin/products/${id}`, { method: 'DELETE' });
  }

  // Admin - Inventory
  async getInventory() {
    return this.request('/admin/inventory');
  }

  async getLowStockItems() {
    return this.request('/admin/inventory/low-stock');
  }

  async updateInventory(productId: string, data: { quantity?: number; reorder_level?: number }) {
    return this.request(`/admin/inventory/${productId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async addStockMovement(data: {
    product_id: string;
    movement_type: string;
    quantity: number;
    notes?: string;
  }) {
    return this.request('/admin/stock-movements', {
      method: 'POST',
      body: data,
    });
  }

  // Admin - Orders
  async getAllOrders(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request(`/admin/orders?${query}`);
  }

  async updateOrderStatus(orderId: string, status: string, notes?: string) {
    return this.request(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status, notes },
    });
  }

  async assignOrder(orderId: string, assignedTo: string) {
    return this.request(`/admin/orders/${orderId}/assign`, {
      method: 'PATCH',
      body: { assigned_to: assignedTo },
    });
  }

  // Admin - Payments
  async getPendingPayments() {
    return this.request('/admin/payments');
  }

  async confirmPayment(orderId: string) {
    return this.request(`/admin/payments/${orderId}/confirm`, {
      method: 'POST',
      body: {},
    });
  }

  async rejectPayment(orderId: string) {
    return this.request(`/admin/payments/${orderId}/reject`, {
      method: 'POST',
      body: {},
    });
  }

  // Admin - Deliveries
  async getAllDeliveries(params?: { status?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    return this.request(`/admin/deliveries?${query}`);
  }

  async createDelivery(orderId: string, data: { driver_name?: string; driver_phone?: string; vehicle_info?: string }) {
    return this.request('/admin/deliveries', {
      method: 'POST',
      body: { order_id: orderId, ...data },
    });
  }

  async updateDelivery(deliveryId: string, data: any) {
    return this.request(`/admin/deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      body: data,
    });
  }

  // Admin - Delivery Zones
  async getDeliveryZonesAdmin() {
    return this.request('/admin/delivery-zones');
  }

  async createDeliveryZone(data: any) {
    return this.request('/admin/delivery-zones', {
      method: 'POST',
      body: data,
    });
  }

  async updateDeliveryZone(id: string, data: any) {
    return this.request(`/admin/delivery-zones/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  // Admin - Inquiries
  async getInquiries() {
    return this.request('/admin/inquiries');
  }

  async markInquiryRead(id: string) {
    return this.request(`/admin/inquiries/${id}/read`, { method: 'PATCH' });
  }

  // Admin - Analytics
  async getTopProducts(days?: string, limit?: string) {
    const query = new URLSearchParams();
    if (days) query.append('days', days);
    if (limit) query.append('limit', limit);
    return this.request(`/analytics/top-products?${query}`);
  }

  async getSalesSummary(days?: string) {
    const query = new URLSearchParams();
    if (days) query.append('days', days);
    return this.request(`/analytics/sales-summary?${query}`);
  }

  async getSalesByDate(startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    return this.request(`/analytics/sales-by-date?${query}`);
  }

  async getOrderStatusAnalytics() {
    return this.request('/analytics/order-status');
  }

  async getCustomerAnalytics() {
    return this.request('/analytics/customers');
  }

  async exportOrders(startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    return this.request(`/admin/orders/export?${query}`);
  }
}

export const api = new ApiClient(API_URL);
