import { useEffect, useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, UserPlus, Chrome, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1, "Full name is required").max(100),
  phone: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const { signIn, signUp, resetPassword, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      navigate(isAdmin ? "/admin" : "/", { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Prevent showing the login UI at all when already authenticated
  if (!authLoading && user) {
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  // While auth state is loading, render nothing to avoid flashes
  if (authLoading) {
    return null;
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", full_name: "", phone: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleGoogleAuth = async (isSignUp: boolean) => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch {
      toast({ 
        title: "Google auth failed", 
        description: "Could not connect with Google. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const onLoginSubmit = async (values: LoginForm) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      
      // Wait for session and check admin role before redirecting
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user is admin
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });
        
        if (isAdmin) {
          navigate("/admin");
        } else {
          navigate("/spares");
        }
      } else {
        navigate("/spares");
      }
      
      toast({ title: "Welcome back!" });
    } catch (error: any) {
      // Handle specific error cases
      const errorMessage = error?.message || "Invalid email or password.";
      
      if (errorMessage.includes("confirm your email")) {
        toast({ 
          title: "Email not verified", 
          description: errorMessage, 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Login failed", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const onSignUpSubmit = async (values: SignUpForm) => {
    setLoading(true);
    try {
      const result = await signUp(values.email, values.password, {
        full_name: values.full_name,
        phone: values.phone,
      });
      
      if (result.needsEmailConfirmation) {
        // Show success message and switch to login tab
        setEmailConfirmed(true);
        toast({ 
          title: "Account created!", 
          description: "Please check your email to verify your account before logging in." 
        });
        setActiveTab("login");
      } else {
        // Auto-login case (if email confirmation is disabled)
        toast({ title: "Welcome! Your account has been created." });
        navigate("/spares");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Could not create account. Please try again.";
      toast({ title: "Signup failed", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordSubmit = async (values: ForgotPasswordForm) => {
    setLoading(true);
    try {
      await resetPassword(values.email);
      toast({ 
        title: "Reset email sent!", 
        description: "Check your email for password reset instructions." 
      });
      setActiveTab("login");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send reset email. Please try again.";
      toast({ title: "Reset failed", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="container flex items-center justify-center py-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="forgot-password">Reset</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="font-heading text-2xl">Welcome Back</CardTitle>
                <CardDescription>Sign in to your account to continue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full bg-[#4285F4] hover:bg-[#3574E1] text-white font-medium" 
                  onClick={() => handleGoogleAuth(false)}
                  disabled={googleLoading}
                >
                  <Chrome className="mr-2 h-5 w-5" />
                  {googleLoading ? "Connecting..." : "Continue with Google"}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <button
                            type="button"
                            onClick={() => setActiveTab("forgot-password")}
                            className="text-xs text-primary hover:underline"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"} <LogIn className="h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="font-heading text-2xl">Create Account</CardTitle>
                <CardDescription>Sign up to start shopping and track your orders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full bg-[#4285F4] hover:bg-[#3574E1] text-white font-medium" 
                  onClick={() => handleGoogleAuth(true)}
                  disabled={googleLoading}
                >
                  <Chrome className="mr-2 h-5 w-5" />
                  {googleLoading ? "Connecting..." : "Sign up with Google"}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                    <FormField control={signupForm.control} name="full_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl><Input type="tel" placeholder="+27 82 123 4567" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"} <UserPlus className="h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="forgot-password">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="font-heading text-2xl">Reset Password</CardTitle>
                <CardDescription>Enter your email to receive password reset instructions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...forgotPasswordForm}>
                  <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                    <FormField control={forgotPasswordForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="you@example.com" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="justify-center">
                <button
                  onClick={() => setActiveTab("login")}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to login
                </button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </Layout>
  );
}
