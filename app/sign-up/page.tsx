"use client";

export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AuthErrorBoundary } from "@/components/error-boundary";

function SignUpContent() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const supabase = createClient();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // User is already signed in, redirect to dashboard
          router.push(returnTo || "/dashboard");
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [supabase, router, returnTo]);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="flex flex-col justify-center items-center w-full h-screen p-4">
        <div className="max-w-md w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg h-96"></div>
      </div>
    );
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!organizationName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            organization_name: organizationName.trim(),
          }
        },
      });

      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        toast.success("Check your email for confirmation link!");
        // Don't redirect immediately, wait for email confirmation
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    
    try {
      // Check if authentication service is available
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        toast.error('Authentication service is currently unavailable. Please try email sign-up instead.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${returnTo || '/dashboard'}`,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        
        // Provide specific error messages based on error type
        let userMessage = 'Google sign-up failed. ';
        
        if (error.message.includes('unauthorized_client')) {
          userMessage += 'Google OAuth is not properly configured. Please use email sign-up instead.';
        } else if (error.message.includes('access_denied')) {
          userMessage += 'Access was denied. Please try again or use email sign-up.';
        } else if (error.message.includes('popup_blocked')) {
          userMessage += 'Popup was blocked. Please allow popups for this site and try again.';
        } else if (error.message.includes('network')) {
          userMessage += 'Please check your internet connection and try again.';
        } else {
          userMessage += 'Please try email sign-up instead.';
        }
        
        toast.error(userMessage);
        setLoading(false);
      }
      // If no error, the redirect will happen automatically
    } catch (error) {
      console.error("Google sign-up error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          toast.error("Network error. Please check your connection and try again.");
        } else {
          toast.error("Google sign-up is currently unavailable. Please use email sign-up instead.");
        }
      } else {
        toast.error("Something went wrong. Please try email sign-up instead.");
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center w-full h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Join Flowvya
          </CardTitle>
          <CardDescription>
            Create your account to start flowing with Flowvya
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Enter your organization name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !email || !password || !confirmPassword || !organizationName}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleSignUp}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 256 262"
              className="mr-2"
            >
              <path
                fill="#4285F4"
                d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
              />
              <path
                fill="#34A853"
                d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
              />
              <path
                fill="#FBBC05"
                d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
              />
              <path
                fill="#EB4335"
                d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link 
              href="/sign-in" 
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignUp() {
  return (
    <AuthErrorBoundary>
      <Suspense
        fallback={
          <div className="flex flex-col justify-center items-center w-full h-screen">
            <div className="max-w-md w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg h-96"></div>
          </div>
        }
      >
        <SignUpContent />
      </Suspense>
    </AuthErrorBoundary>
  );
}
