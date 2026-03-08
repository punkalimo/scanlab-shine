# ScanLab Sparkle - Deployment Guide

## Architecture Overview

### Components
- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth (Email/Password + Google OAuth)
- **Storage**: Supabase Storage (product images)

### Auth Flow
1. User signs up/in via Supabase Auth
2. Supabase triggers create profile in `profiles` table
3. JWT token returned to client
4. Express server verifies JWT via Supabase service role
5. Role-based access control enforced via middleware

---

## Database Setup

### 1. Run Migrations
Execute the SQL migrations in Supabase SQL Editor:

1. First: `supabase/migrations/20260305140000_complete_schema.sql`
2. Then: `supabase/migrations/20260305150000_rls_policies.sql`

### 2. Seed Test Data
```bash
cd server
npm install
npx tsx src/seed.ts
```

Test credentials:
- Admin: `admin@scanlab.com` / `admin123`
- Customer: `customer@test.com` / `customer123`

---

## Backend Server Setup

### 1. Environment Variables
Create `server/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_ANON_KEY=your-anon-key
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 2. Install & Run
```bash
cd server
npm install
npm run dev  # Development
npm run build && npm start  # Production
```

### 3. Security Notes
- Use Service Role Key only for server-side operations
- Anon key is safe for client-side (RLS protects data)
- JWT secret must match Supabase project settings

---

## Frontend Setup

### 1. Environment Variables
Create `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_API_URL=http://localhost:3001/api
```

### 2. Install & Run
```bash
npm install
npm run dev
```

---

## Supabase Configuration

### Auth Providers
1. Go to Authentication > Providers
2. Enable Email/Password
3. Enable Google OAuth (optional)

### Storage Buckets
Buckets are created automatically via SQL:
- `product-images` - for product images
- `avatars` - for user avatars

### Edge Functions (Optional)
For advanced features like webhooks, consider using Supabase Edge Functions.

---

## API Endpoints Summary

### Public
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `GET /api/categories` - List categories
- `GET /api/delivery-zones` - List delivery zones
- `POST /api/coupons/validate` - Validate coupon
- `POST /api/auth/signup` - Sign up
- `POST /api/auth/signin` - Sign in

### Authenticated
- `GET /api/cart` - Get cart
- `POST /api/cart/items` - Add to cart
- `PATCH /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove from cart
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order
- `GET /api/addresses` - List addresses
- `POST /api/addresses` - Create address
- `GET /api/wishlists` - List wishlist
- `POST /api/wishlists` - Add to wishlist

### Admin
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/role` - Update user role
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - List all orders
- `PATCH /api/admin/orders/:id/status` - Update order status
- `POST /api/admin/payments/:orderId/confirm` - Confirm payment
- `POST /api/admin/deliveries` - Create delivery
- `PATCH /api/admin/deliveries/:id/status` - Update delivery
- `GET /api/analytics/top-products` - Top selling products
- `GET /api/analytics/sales-summary` - Sales summary

---

## Testing Plan

### Unit Tests (Vitest)
```bash
npm test
```

### API Tests (Supertest)
Create `server/test/api.test.ts`:
```typescript
import request from 'supertest';
import app from '../src/index.js';

describe('API Tests', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});
```

### Test Coverage
- Auth: signup, signin, signout
- Products: CRUD operations
- Cart: add, update, remove items
- Orders: create, cancel
- Admin: user management, order management

---

## Production Checklist

1. ✅ Database migrations applied
2. ✅ RLS policies configured
3. ✅ Environment variables set
4. ✅ HTTPS enabled (Supabase provides)
5. ✅ Rate limiting configured
6. ✅ Error logging configured
7. ✅ Backup strategy in place

---

## Common Issues

### CORS Errors
- Update `CLIENT_URL` in server `.env`
- Check Supabase project URL settings

### Auth Errors
- Verify JWT secret matches Supabase
- Check token expiration

### RLS Errors
- Test queries in Supabase SQL Editor
- Verify user roles are set correctly
