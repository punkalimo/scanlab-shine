import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/integrations/api/client";

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
}

interface AuthResponse {
  session: Session;
  user: User;
  profile: Profile;
}

interface SignUpResponse {
  message: string;
  user: User;
  needsEmailConfirmation: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  signUp: (email: string, password: string, data?: { full_name?: string; phone?: string }) => Promise<SignUpResponse>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string; phone?: string; avatar_url?: string }) => Promise<Profile>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string): Promise<Profile | null> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const profileData = await response.json();
        return profileData as Profile;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.access_token) {
          const profileData = await fetchProfile(session.access_token);
          setProfile(profileData);
          if (session.user) {
            // Role is already in profile, no need for separate RPC call
            setIsAdmin(profileData?.role === 'admin');
          }
        } else {
          setIsAdmin(false);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Initial session check - only if we haven't received auth state yet
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      // Only process if we haven't already processed via onAuthStateChange
      if (session && !user) {
        setSession(session);
        setUser(session.user ?? null);
        if (session.access_token) {
          const profileData = await fetchProfile(session.access_token);
          setProfile(profileData);
          if (session.user) {
            setIsAdmin(profileData?.role === 'admin');
          }
        }
        setLoading(false);
      } else if (!session) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<Profile> => {
    try {
      // Use API for consistent error handling and profile sync
      const response = await api.signIn(email, password) as AuthResponse;
      
      // Persist Supabase session locally so subsequent API calls include Authorization header
      if (response.session?.access_token && response.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });
      }

      if (response.session?.access_token) {
        const profileData = response.profile;
        setProfile(profileData);
        setIsAdmin(profileData.role === 'admin');
        return profileData;
      }
      throw new Error('No session returned');
    } catch (error: any) {
      // Parse error to provide better messages
      const errorMessage = error.message || 'Login failed';
      
      // Check for specific error patterns
      if (errorMessage.toLowerCase().includes('invalid login') || 
          errorMessage.toLowerCase().includes('invalid credentials') ||
          errorMessage.toLowerCase().includes('wrong password')) {
        throw new Error('Invalid email or password');
      }
      
      if (errorMessage.toLowerCase().includes('email not confirmed')) {
        throw new Error('Please confirm your email address before logging in');
      }
      
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string, data?: { full_name?: string; phone?: string }): Promise<SignUpResponse> => {
    try {
      const response = await api.signUp(email, password, data) as { message: string; user: User };
      
      // Check if email confirmation is required
      // Supabase returns user but no session when email confirmation is enabled
      const needsEmailConfirmation = !response.user.email_confirmed_at;
      
      return {
        message: response.message,
        user: response.user,
        needsEmailConfirmation
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Signup failed';
      
      // Parse specific error cases
      if (errorMessage.toLowerCase().includes('user already registered') ||
          errorMessage.toLowerCase().includes('already been registered')) {
        throw new Error('An account with this email already exists');
      }
      
      if (errorMessage.toLowerCase().includes('password')) {
        throw new Error('Password must be at least 6 characters');
      }
      
      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    console.log("[Auth] Signing out...");
    try {
      const result = await supabase.auth.signOut();
      console.log("[Auth] Sign out result:", result);
    } catch (err) {
      console.error("[Auth] Sign out error:", err);
    }
    // Force clear state regardless of result
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    // Clear localStorage
    localStorage.removeItem('supabase.auth.token');
    console.log("[Auth] State cleared, redirecting...");
    window.location.href = '/login';
  };

  const updateProfile = async (data: { full_name?: string; phone?: string; avatar_url?: string }): Promise<Profile> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      throw new Error('No session');
    }
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }
    
    const updatedProfile = await response.json();
    setProfile(updatedProfile);
    return updatedProfile;
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await api.resetPassword(email);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset email';
      
      if (errorMessage.toLowerCase().includes('user not found')) {
        throw new Error('No account found with this email');
      }
      
      throw new Error(errorMessage);
    }
  };

  const updatePassword = async (password: string): Promise<void> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error('No session - please use the reset link from your email');
      }
      
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/update-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update password';
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, signIn, signUp, signOut, updateProfile, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
