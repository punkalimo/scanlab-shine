import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Create a loose-typed version for service operations that bypasses strict type checking
// This works around issues where the Database type doesn't have complete table definitions
function createLooseClient(url: string, key: string): any {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

let supabaseAdmin: any = null;
let supabaseService: any = null;

export function getSupabaseAdmin(): any {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    supabaseAdmin = createLooseClient(supabaseUrl, serviceRoleKey);
  }

  return supabaseAdmin;
}

export function getSupabaseService(): any {
  if (!supabaseService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    supabaseService = createLooseClient(supabaseUrl, serviceRoleKey);
  }

  return supabaseService;
}

// For user-authenticated requests (uses anon key but with user's JWT)
export function getSupabaseClient(authToken?: string): any {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
