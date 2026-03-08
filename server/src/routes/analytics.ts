import { Router, Response, NextFunction } from 'express';
import { getSupabaseService } from '../lib/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';

export const analyticsRouter = Router();

// All analytics routes require admin authentication
analyticsRouter.use(authenticate);
analyticsRouter.use(requireAdmin());

// Get top selling products
analyticsRouter.get('/top-products', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    const supabase = getSupabaseService();

    let query = supabase
      .from('order_items')
      .select(`
        product_id,
        product_name,
        product_sku,
        quantity,
        total_price
      `)
      .order('quantity', { ascending: false })
      .limit(Number(limit));

    // Filter by date if provided
    if (startDate || endDate) {
      const ordersQuery = supabase
        .from('orders')
        .select('id')
        .in('status', ['paid', 'processing', 'completed']);

      if (startDate) {
        ordersQuery.gte('created_at', startDate);
      }
      if (endDate) {
        ordersQuery.lte('created_at', endDate);
      }

      const { data: orders } = await ordersQuery;
      const orderIds = orders?.map(o => o.id) || [];

      if (orderIds.length > 0) {
        query = query.in('order_id', orderIds);
      }
    }

    // Group by product
    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Aggregate
    const productMap = new Map();
    for (const item of data || []) {
      const existing = productMap.get(item.product_id);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.total_price;
      } else {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity_sold: item.quantity,
          revenue: item.total_price,
        });
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a: any, b: any) => b.quantity_sold - a.quantity_sold)
      .slice(0, Number(limit));

    res.json(topProducts);
  } catch (error) {
    next(error);
  }
});

// Get sales summary
analyticsRouter.get('/sales-summary', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const supabase = getSupabaseService();

    let query = supabase
      .from('orders')
      .select('status, total, created_at')
      .in('status', ['paid', 'processing', 'completed', 'refunded']);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: orders, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Calculate totals
    const summary = {
      totalOrders: orders?.length || 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      refundedAmount: 0,
    };

    for (const order of orders || []) {
      if (order.status === 'completed') {
        summary.totalRevenue += order.total;
        summary.completedOrders++;
      } else if (order.status === 'pending_payment' || order.status === 'paid' || order.status === 'processing') {
        summary.pendingOrders++;
      } else if (order.status === 'refunded') {
        summary.refundedAmount += order.total;
      }
    }

    summary.averageOrderValue = summary.completedOrders > 0 
      ? summary.totalRevenue / summary.completedOrders 
      : 0;

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Get sales by date range (daily breakdown)
analyticsRouter.get('/sales-by-date', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const supabase = getSupabaseService();

    let query = supabase
      .from('orders')
      .select('created_at, total, status')
      .in('status', ['paid', 'processing', 'completed', 'refunded']);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: orders, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Group by date
    const dateMap = new Map();
    for (const order of orders || []) {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = dateMap.get(date);
      
      if (existing) {
        existing.count++;
        if (order.status === 'completed') {
          existing.revenue += order.total;
        }
      } else {
        dateMap.set(date, {
          date,
          orderCount: 1,
          revenue: order.status === 'completed' ? order.total : 0,
        });
      }
    }

    const salesByDate = Array.from(dateMap.values())
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    res.json(salesByDate);
  } catch (error) {
    next(error);
  }
});

// Get low stock items
analyticsRouter.get('/low-stock', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        product:products(id, name, sku, price)
      `)
      .order('quantity', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const lowStock = (data || []).filter((item: any) => 
      item.quantity <= item.reorder_level
    );

    res.json(lowStock);
  } catch (error) {
    next(error);
  }
});

// Get order status breakdown
analyticsRouter.get('/order-status', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('orders')
      .select('status');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const statusCounts = new Map();
    for (const order of data || []) {
      statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
    }

    const result = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get customer analytics
analyticsRouter.get('/customers', requireAdmin(), async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    // Get total customers
    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get customers with orders
    const { data: customersWithOrders } = await supabase
      .from('orders')
      .select('user_id')
      .not('user_id', 'is', null);

    const uniqueCustomers = new Set(customersWithOrders?.map(o => o.user_id));

    // Get repeat customers
    const orderCounts = new Map();
    for (const order of customersWithOrders || []) {
      orderCounts.set(order.user_id, (orderCounts.get(order.user_id) || 0) + 1);
    }

    const repeatCustomers = Array.from(orderCounts.values()).filter(count => count > 1).length;

    res.json({
      totalCustomers: totalCustomers || 0,
      customersWithOrders: uniqueCustomers.size,
      repeatCustomers,
      repeatCustomerRate: uniqueCustomers.size > 0 
        ? (repeatCustomers / uniqueCustomers.size) * 100 
        : 0,
    });
  } catch (error) {
    next(error);
  }
});
