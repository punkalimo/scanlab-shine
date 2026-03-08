import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { updateProfileSchema } from '../lib/validation';

export const authRouter = Router();

// Sign up with email/password
const signUpSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, phone } = signUpSchema.parse(req.body);
    const supabase = getSupabaseService();

    // Create user in auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone,
        },
        // If you want to skip email confirmation, set this to false
        // emailConfirm: true means confirmation IS required (default behavior)
      }
    });

    if (error) {
      const isRateLimit = error.status === 429 || error.message?.toLowerCase().includes('rate limit');
      const status = isRateLimit ? 429 : 400;
      const message = isRateLimit
        ? 'Too many signup attempts. Please wait and try again.'
        : error.message;
      return res.status(status).json({ error: message });
    }

    // Profile is automatically created via trigger
    if (data.user) {
      // Update profile with additional fields
      await supabase
        .from('profiles')
        .update({ full_name, phone })
        .eq('id', data.user.id);
    }

    // Check if email confirmation is required
    // If session is null but user exists, email confirmation is required
    const needsEmailConfirmation = !data.session;

    res.status(201).json({
      message: needsEmailConfirmation 
        ? 'Signup successful. Please check your email to verify your account.'
        : 'Signup successful',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        email_confirmed_at: data.user?.email_confirmed_at,
        created_at: data.user?.created_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Sign in with email/password
const signInSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string(),
});

authRouter.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = signInSchema.parse(req.body);
    const supabase = getSupabaseService();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user?.id)
      .single();

    res.json({
      session: data.session,
      user: data.user,
      profile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Sign out
authRouter.post('/signout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();
    const token = req.headers.authorization?.substring(7);
    
    await supabase.auth.signOut();
    
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user - profile already fetched by authenticate middleware
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Profile is already attached to req.profile from middleware - no need to fetch again
    if (!req.profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(req.profile);
  } catch (error) {
    next(error);
  }
});

// Update current user profile
authRouter.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const supabase = getSupabaseService();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: req.user?.email || '',
          ...data,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(400).json({ error: createError.message });
      }

      return res.json(newProfile);
    }

    // Update existing profile - filter out undefined values
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      // No data to update, return current profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return res.json(currentProfile);
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Google OAuth - generate URL
authRouter.get('/google/url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.CLIENT_URL}/auth/callback`,
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ url: data.url });
  } catch (error) {
    next(error);
  }
});

// Password reset request
const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

authRouter.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = resetPasswordSchema.parse(req.body);
    const supabase = getSupabaseService();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/reset-password`,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update password (with token)
const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

authRouter.post('/update-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = updatePasswordSchema.parse(req.body);
    const supabase = getSupabaseService();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});
