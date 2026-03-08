import { z } from 'zod';

// Common validation schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Params schema for UUID in route params
export const uuidParamsSchema = z.object({
  id: uuidSchema,
});
export const productIdParamsSchema = z.object({
  productId: uuidSchema,
});
export const orderIdParamsSchema = z.object({
  orderId: uuidSchema,
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const searchSchema = z.object({
  search: z.string().optional(),
  category: uuidSchema.optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(['name', 'price_asc', 'price_desc', 'newest', 'popular']).optional(),
  productType: z.enum(['spares', 'audio']).optional(),
  featured: z.coerce.boolean().optional(),
});

// Product validation
export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  slug: z.string().trim().min(1, 'Slug is required').max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(5000).optional(),
  category_id: uuidSchema.optional(),
  product_type: z.enum(['spares', 'audio']).default('spares'),
  brand: z.string().max(100).optional(),
  sku: z.string().max(50).optional(),
  price: z.number().positive().min(0),
  compare_at_price: z.number().positive().optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_start_date: z.string().datetime().optional(),
  discount_end_date: z.string().datetime().optional(),
  weight_kg: z.number().positive().optional(),
  compatibility_tags: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const updateProductSchema = productSchema.partial();

// Category validation
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  slug: z.string().trim().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  parent_id: uuidSchema.optional(),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

// Cart item validation
export const cartItemSchema = z.object({
  product_id: uuidSchema,
  quantity: z.number().int().positive().min(1).default(1),
});

// Update cart item validation
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0), // 0 deletes the item
});

// Checkout validation
export const checkoutSchema = z.object({
  fulfillment_type: z.enum(['pickup', 'courier']),
  pickup_location: z.string().optional(),
  address_id: uuidSchema.optional(),
  delivery_zone_id: uuidSchema.optional(),
  contact_phone: z.string().min(10, 'Valid phone number required'),
  notes: z.string().max(500).optional(),
  coupon_code: z.string().optional(),
  guest_email: z.string().email().optional(),
  guest_name: z.string().optional(),
});

// Address validation
export const addressSchema = z.object({
  type: z.enum(['delivery', 'pickup']).default('delivery'),
  label: z.string().max(50).optional(),
  recipient_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  street_address: z.string().min(1, 'Street address is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  delivery_zone_id: uuidSchema.optional(),
  is_default: z.boolean().default(false),
});

// Delivery zone validation
export const deliveryZoneSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  city: z.string().min(1, 'City is required').max(100),
  fee: z.number().min(0, 'Fee must be positive'),
  estimated_days: z.number().int().positive().optional(),
  is_active: z.boolean().default(true),
});

// User profile update validation
const profileFieldSchema = z.string().max(100).optional().transform(val => val === '' ? undefined : val);
const phoneFieldSchema = z.string().max(20).optional().transform(val => val === '' ? undefined : val);
const avatarUrlSchema = z.string().url().optional().or(z.literal('').transform(() => undefined));

export const updateProfileSchema = z.object({
  full_name: profileFieldSchema,
  phone: phoneFieldSchema,
  avatar_url: avatarUrlSchema,
});

// Role update validation (admin only)
export const updateUserRoleSchema = z.object({
  role: z.enum(['customer', 'admin', 'accountant', 'store_officer', 'product_manager', 'support_agent']),
  is_active: z.boolean().optional(),
});

// Inventory update validation
export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0),
  reorder_level: z.number().int().min(0).optional(),
  max_stock_level: z.number().int().positive().optional(),
});

// Stock movement validation
export const stockMovementSchema = z.object({
  product_id: uuidSchema,
  movement_type: z.enum(['purchase', 'adjustment', 'sale', 'return', 'damage', 'transfer']),
  quantity: z.number().int(), // positive for in, negative for out
  reference_type: z.string().optional(),
  reference_id: uuidSchema.optional(),
  notes: z.string().max(500).optional(),
});

// Order status update validation
export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending_payment', 'paid', 'processing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled', 'refunded']),
  notes: z.string().max(500).optional(),
});

// Delivery update validation
export const updateDeliverySchema = z.object({
  status: z.enum(['pending', 'assigned', 'in_transit', 'delivered', 'failed', 'cancelled']).optional(),
  driver_name: z.string().max(100).optional(),
  driver_phone: z.string().max(20).optional(),
  vehicle_info: z.string().max(100).optional(),
  estimated_arrival: z.string().datetime().optional(),
  delivery_notes: z.string().max(500).optional(),
  failure_reason: z.string().max(500).optional(),
});

// Payment confirmation validation
export const confirmPaymentSchema = z.object({
  status: z.enum(['confirmed', 'failed']),
  reference: z.string().optional(),
  transaction_id: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Review validation
export const reviewSchema = z.object({
  product_id: uuidSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
});

// Coupon validation
export const couponSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  description: z.string().max(500).optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  min_order_amount: z.number().positive().optional(),
  max_uses: z.number().int().positive().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
});

// Inquiry validation
export const inquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
});

// Date range validation for analytics
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).and(paginationSchema);
