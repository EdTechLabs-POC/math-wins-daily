import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, UserPlus } from 'lucide-react';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72, { message: "Password must be less than 72 characters" }),
});

const emailOnlySchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255, { message: "Email must be less than 255 characters" }),
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const validateForm = () => {
    if (mode === 'forgot') {
      const result = emailOnlySchema.safeParse({ email });
      if (!result.success) {
        const formattedErrors: { email?: string } = {};
        result.error.errors.forEach((err) => {
          if (err.path[0] === 'email') formattedErrors.email = err.message;
        });
        setErrors(formattedErrors);
        return false;
      }
      setErrors({});
      return true;
    }

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const formattedErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') formattedErrors.email = err.message;
        if (err.path[0] === 'password') formattedErrors.password = err.message;
      });
      setErrors(formattedErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const checkEmailAllowed = async (emailToCheck: string): Promise<boolean> => {
    // Use database function for case-insensitive allowlist check (bypasses RLS)
    const { data, error } = await supabase
      .rpc('is_email_allowlisted', { p_email: emailToCheck.trim() });
    
    if (error) {
      console.error('Error checking email allowlist:', error);
      return false;
    }
    
    return data === true;
  };

  const linkUserToStudent = async (userId: string, userEmail: string) => {
    // Update the student record to link it to the authenticated user (case-insensitive)
    const { error } = await supabase
      .from('students')
      .update({ user_id: userId })
      .ilike('parent_email', userEmail.trim())
      .is('user_id', null); // Only update if not already linked
    
    if (error) {
      console.error('Error linking user to student:', error);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const trimmedEmail = email.trim().toLowerCase();

    try {
      // First check if email is in the allowlist
      const isAllowed = await checkEmailAllowed(trimmedEmail);
      
      if (!isAllowed) {
        toast({
          variant: "destructive",
          title: "Email Not Found",
          description: "This email is not registered in our system.",
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
        setMode('signin');
        setEmail('');
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot') {
      await handleForgotPassword();
      return;
    }

    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const trimmedEmail = email.trim().toLowerCase();

    try {
      // First check if email is in the allowlist
      const isAllowed = await checkEmailAllowed(trimmedEmail);
      
      if (!isAllowed) {
        toast({
          variant: "destructive",
          title: "Restricted Access",
          description: "This email is not authorized to access the platform. Please contact support if you believe this is an error.",
        });
        setIsSubmitting(false);
        return;
      }

      if (mode === 'signup') {
        const { error } = await signUp(trimmedEmail, password);

        if (error) {
          let errorMessage = error.message;
          
          if (error.message.includes('User already registered')) {
            errorMessage = 'This email is already registered. Please sign in instead.';
          }

          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: errorMessage,
          });
        } else {
          // Get the current user and link to student
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await linkUserToStudent(newUser.id, trimmedEmail);
          }
          
          toast({
            title: "Account created!",
            description: "You are now signed in.",
          });
        }
      } else {
        const { error } = await signIn(trimmedEmail, password);

        if (error) {
          let errorMessage = error.message;
          
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email to confirm your account.';
          }

          toast({
            variant: "destructive",
            title: "Sign in failed",
            description: errorMessage,
          });
        }
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return "Create Account";
      case 'forgot': return "Reset Password";
      default: return "Welcome Back!";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'signup': return "Set up your password to start your child's learning journey";
      case 'forgot': return "Enter your email and we'll send you a reset link";
      default: return "Sign in to continue your child's learning journey";
    }
  };

  const getIcon = () => {
    return mode === 'signup' ? UserPlus : Lock;
  };

  const IconComponent = getIcon();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-purple-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            {getTitle()}
          </CardTitle>
          <CardDescription>
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Please wait...' : (
                mode === 'signup' ? 'Create Account' : 
                mode === 'forgot' ? 'Send Reset Link' : 
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setErrors({}); }}
                className="text-sm text-muted-foreground hover:text-primary hover:underline block w-full"
              >
                Forgot your password?
              </button>
            )}
            
            <button
              type="button"
              onClick={() => { 
                setMode(mode === 'signin' ? 'signup' : 'signin'); 
                setErrors({}); 
                setPassword('');
              }}
              className="text-sm text-primary hover:underline"
            >
              {mode === 'signup' 
                ? "Already have an account? Sign in" 
                : mode === 'forgot'
                ? "Back to sign in"
                : "Don't have an account? Sign up"}
            </button>
            
            <p className="text-sm text-muted-foreground">
              Access is restricted to registered parents only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}