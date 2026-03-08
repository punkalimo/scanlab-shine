// Seed script for test data
// Run with: npx tsx server/src/seed.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Starting database seed...');

  // Create test admin user
  const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
    email: 'admin@scanlab.com',
    password: 'admin123',
    email_confirm: true,
  });

  if (adminError) {
    console.log('Admin user might already exist:', adminError.message);
  }

  if (adminUser?.user) {
    // Set admin role
    await supabase.from('profiles').upsert({
      id: adminUser.user.id,
      email: 'admin@scanlab.com',
      role: 'admin',
      full_name: 'Admin User',
    });
    console.log('✓ Admin user created');
  }

  // Create test customer
  const { data: customerUser, error: customerError } = await supabase.auth.admin.createUser({
    email: 'customer@test.com',
    password: 'customer123',
    email_confirm: true,
  });

  if (customerError) {
    console.log('Customer user might already exist:', customerError.message);
  }

  if (customerUser?.user) {
    await supabase.from('profiles').upsert({
      id: customerUser.user.id,
      email: 'customer@test.com',
      role: 'customer',
      full_name: 'Test Customer',
      phone: '+260977123456',
    });
    console.log('✓ Customer user created');
  }

  // Create categories
  const categories = [
    { name: 'Truck Spares', slug: 'truck-spares', description: 'Parts for heavy-duty trucks' },
    { name: 'Car Audio', slug: 'car-audio', description: 'Speakers, radios, and accessories' },
    { name: 'Car Lights', slug: 'car-lights', description: 'Headlights, tail lights, and accessories' },
    { name: 'Interior Accessories', slug: 'interior', description: 'Seat covers, mats, and more' },
  ];

  for (const cat of categories) {
    await supabase.from('categories').upsert(cat);
  }
  console.log('✓ Categories created');

  // Get category IDs
  const { data: truckSpares } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'truck-spares')
    .single();

  const { data: carAudio } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'car-audio')
    .single();

  // Create products
  const products = [
    {
      name: 'Premium Truck Speakers 6x9',
      slug: 'premium-truck-speakers-6x9',
      description: 'High-quality 6x9 inch speakers for trucks',
      category_id: carAudio?.id,
      product_type: 'audio',
      brand: 'ScanLab',
      sku: 'SL-AUD-001',
      price: 450.00,
      is_featured: true,
    },
    {
      name: 'Car Stereo Receiver Bluetooth',
      slug: 'car-stereo-receiver-bluetooth',
      description: 'Modern stereo with Bluetooth connectivity',
      category_id: carAudio?.id,
      product_type: 'audio',
      brand: 'ScanLab',
      sku: 'SL-AUD-002',
      price: 899.00,
      is_featured: true,
    },
    {
      name: 'LED Headlight Kit H7',
      slug: 'led-headlight-kit-h7',
      description: 'Bright LED headlights for night driving',
      category_id: truckSpares?.id,
      product_type: 'spares',
      brand: 'BrightDrive',
      sku: 'SL-SPR-001',
      price: 1250.00,
      is_featured: true,
    },
    {
      name: 'Heavy Duty Brake Pads',
      slug: 'heavy-duty-brake-pads',
      description: 'Long-lasting brake pads for trucks',
      category_id: truckSpares?.id,
      product_type: 'spares',
      brand: 'SafeStop',
      sku: 'SL-SPR-002',
      price: 680.00,
    },
    {
      name: 'Car Subwoofer 12 inch',
      slug: 'car-subwoofer-12-inch',
      description: 'Powerful 12 inch subwoofer for bass lovers',
      category_id: carAudio?.id,
      product_type: 'audio',
      brand: 'BassMax',
      sku: 'SL-AUD-003',
      price: 1500.00,
    },
    {
      name: 'Truck Air Filter',
      slug: 'truck-air-filter',
      description: 'Premium air filter for truck engines',
      category_id: truckSpares?.id,
      product_type: 'spares',
      brand: 'CleanAir',
      sku: 'SL-SPR-003',
      price: 250.00,
    },
    {
      name: 'Car Amplifier 4 Channel',
      slug: 'car-amplifier-4-channel',
      description: '4-channel amplifier for car audio systems',
      category_id: carAudio?.id,
      product_type: 'audio',
      brand: 'PowerSound',
      sku: 'SL-AUD-004',
      price: 2200.00,
    },
    {
      name: 'Tail Light Assembly LED',
      slug: 'tail-light-assembly-led',
      description: 'LED tail light for enhanced visibility',
      category_id: truckSpares?.id,
      product_type: 'spares',
      brand: 'BrightDrive',
      sku: 'SL-SPR-004',
      price: 890.00,
    },
  ];

  for (const product of products) {
    const { data: insertedProduct } = await supabase
      .from('products')
      .upsert(product)
      .select()
      .single();

    if (insertedProduct) {
      // Create inventory
      await supabase.from('inventory').upsert({
        product_id: insertedProduct.id,
        quantity: Math.floor(Math.random() * 100) + 10,
        reorder_level: 10,
      });
    }
  }
  console.log('✓ Products created');

  // Create delivery zones
  const zones = [
    { name: 'Lusaka Central', city: 'Lusaka', fee: 0, estimated_days: 1 },
    { name: 'Lusaka South', city: 'Lusaka', fee: 50, estimated_days: 2 },
    { name: 'Copperbelt', city: 'Kitwe', fee: 150, estimated_days: 3 },
    { name: 'Kafue', city: 'Kafue', fee: 80, estimated_days: 2 },
    { name: 'Livingstone', city: 'Livingstone', fee: 200, estimated_days: 4 },
  ];

  for (const zone of zones) {
    await supabase.from('delivery_zones').upsert(zone);
  }
  console.log('✓ Delivery zones created');

  // Create a coupon
  await supabase.from('coupons').upsert({
    code: 'WELCOME10',
    description: '10% off for new customers',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 500,
    max_uses: 100,
    is_active: true,
  });
  console.log('✓ Coupon created');

  console.log('✅ Seed completed successfully!');
}

seed().catch(console.error);
