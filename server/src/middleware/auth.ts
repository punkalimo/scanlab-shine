import { Request, Response, NextFunction } from 'express';
import { getSupabaseService } from '../lib/supabase';
import type { AppRole } from '../types/supabase';

// Extended Request type with user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: AppRole;
      };
      // Store full profile for routes that need it
      profile?: {
        id: string;
        email: string;
        full_name: string | null;
        phone: string | null;
        role: string;
        avatar_url: string | null;
        created_at?: string;
        updated_at?: string;
      };
    }
  }
}

// Type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: AppRole;
  };
}

// Middleware to verify JWT token from Authorization header
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseService();

    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get full user profile - this is reused by /auth/me route to avoid double-fetching
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role as AppRole
    };

    // Store full profile for routes that need it (avoids double-fetching)
    req.profile = profile;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

// Middleware to check if user has required role(s)
export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
}

// Middleware to check if user is admin (includes all roles)
export function requireAdmin(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const adminRoles: string[] = ['admin', 'accountant', 'store_officer', 'product_manager', 'support_agent'];
    
    if (!adminRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  };
}

// Optional authentication - doesn't fail if no token
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseService();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next();
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      req.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role as AppRole
      };
      // Store full profile for routes that need it
      req.profile = profile;
    }

    next();
  } catch {
    next();
  }
}
