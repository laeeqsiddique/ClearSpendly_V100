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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { toast } from "sonner";
import { AuthErrorBoundary } from "@/components/error-boundary";
import { LoadingButton, AuthLoadingState } from "@/components/loading-states";
import { useAnalytics, analyticsEvents } from "@/components/analytics-wrapper";
import { getOAuthRedirectUrl } from "@/lib/utils/auth-helpers";
import { env, isGoogleOAuthConfigured } from "@/lib/config/env";

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'idle' | 'connecting' | 'authenticating' | 'redirecting'>('idle');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const error = searchParams.get("error");
  const analytics = useAnalytics();

  // Display error messages from OAuth redirects
  React.useEffect(() => {
    if (error) {
      let errorMessage = "Authentication failed. Please try again.";
      
      switch (error) {
        case 'access_denied':
          errorMessage = "Access was denied. Please try again or use email sign-in.";
          break;
        case 'config_error':
          errorMessage = "Google Sign-in is not properly configured on this server. Please use email sign-in or contact support.";
          break;
        case 'oauth_error':
          errorMessage = "OAuth authentication failed. Please try email sign-in.";
          break;
        case 'invalid_code':
          errorMessage = "Invalid authentication code. Please try signing in again.";
          break;
        case 'code_expired':
          errorMessage = "Authentication code expired. Please try signing in again.";
          break;
        case 'auth_failed':
        default:
          errorMessage = "Authentication failed. Please try again.";
          break;
      }
      
      toast.error(errorMessage);
      analytics?.trackEvent('sign_in_error', analyticsEvents.signInError('oauth_callback', errorMessage));
      
      // Clear the error parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [error, analytics]);

  const supabase = createClient();
  
  // Debug: Log environment variable status (remove in production)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Supabase URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Anon Key present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthStep('connecting');

    // Track sign-in attempt
    analytics?.trackEvent('sign_in_attempt', analyticsEvents.signInAttempt('email'));

    try {
      setAuthStep('authenticating');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        analytics?.trackEvent('sign_in_error', analyticsEvents.signInError('email', error.message));
        setAuthStep('idle');
      } else if (data.user) {
        setAuthStep('redirecting');
        toast.success("Welcome back!");
        analytics?.trackEvent('sign_in_success', analyticsEvents.signInSuccess('email'));
        router.push(returnTo || "/dashboard");
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      const errorMessage = "Something went wrong. Please try again.";
      toast.error(errorMessage);
      analytics?.trackEvent('sign_in_error', analyticsEvents.signInError('email', errorMessage));
      setAuthStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Check if Google OAuth is properly configured
    if (!isGoogleOAuthConfigured()) {
      toast.error("Google Sign-in is not configured. Please use email sign-in or contact support.");
      console.warn("Google OAuth attempted but not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
      return;
    }

    setLoading(true);
    setAuthStep('connecting');

    // Track Google sign-in attempt
    analytics?.trackEvent('sign_in_attempt', analyticsEvents.signInAttempt('google'));
    
    try {
      setAuthStep('authenticating');
      // Use the working OAuth callback URL (same as sign-up page)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.flowvya.com';
      const redirectUrl = `${baseUrl}/api/oauth-callback?returnTo=${encodeURIComponent(returnTo || '/dashboard')}`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        
        // Provide specific error messages based on error type
        let userMessage = 'Google sign-in failed. ';
        
        // Check for specific OAuth error types and provide helpful messages
        if (error.message.includes('Unsupported provider') || error.message.includes('missing OAuth secret')) {
          userMessage = 'Google Sign-in is not configured on this server. Please use email sign-in or contact support.';
        } else if (error.code === 'MOCK_CLIENT_ERROR' || error.message.includes('service unavailable')) {
          userMessage = 'Authentication service is currently unavailable. Please try email sign-in instead.';
        } else if (error.message.includes('unauthorized_client') || error.message.includes('invalid_client')) {
          userMessage = 'Google OAuth configuration error. Please use email sign-in or contact support.';
        } else if (error.message.includes('access_denied')) {
          userMessage = 'Access was denied during Google sign-in. Please try again or use email sign-in.';
        } else if (error.message.includes('popup_blocked')) {
          userMessage = 'Browser blocked the Google sign-in popup. Please allow popups and try again.';
        } else if (error.message.includes('network')) {
          userMessage = 'Network error occurred. Please check your connection and try again.';
        } else if (error.message.includes('redirect_uri_mismatch')) {
          userMessage = 'OAuth redirect URL mismatch. Please use email sign-in or contact support.';
        } else if (error.message.includes('invalid_request')) {
          userMessage = 'Invalid OAuth request. Please try again or use email sign-in.';
        } else {
          userMessage += 'Please try email sign-in instead.';
        }
        
        toast.error(userMessage);
        analytics?.trackEvent('sign_in_error', analyticsEvents.signInError('google', userMessage));
        setAuthStep('idle');
        setLoading(false);
      } else {
        setAuthStep('redirecting'); 
        // If no error, the redirect will happen automatically
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      
      let errorMessage = "Something went wrong. Please try email sign-in instead.";
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes('MOCK_CLIENT_ERROR')) {
          errorMessage = "Authentication service is currently unavailable. Please try email sign-in instead.";
        } else {
          errorMessage = "Google sign-in is currently unavailable. Please use email sign-in instead.";
        }
      }
      
      toast.error(errorMessage);
      analytics?.trackEvent('sign_in_error', analyticsEvents.signInError('google', errorMessage));
      setAuthStep('idle');
      setLoading(false);
    }
  };

  // Show detailed loading state during authentication steps
  if (authStep !== 'idle') {
    return (
      <div className="flex flex-col justify-center items-center w-full h-screen p-4">
        <AuthLoadingState 
          step={authStep}
          onRetry={() => {
            setAuthStep('idle');
            setLoading(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center w-full h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in to your Flowvya account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <LoadingButton 
              type="submit" 
              className="w-full" 
              isLoading={loading}
              loadingText="Signing in..."
              disabled={!email || !password}
            >
              Sign In
            </LoadingButton>
          </form>

          {env.features.enableGoogleAuth && (
            <>
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

              <LoadingButton
                variant="outline"
                className="w-full"
                isLoading={loading}
                loadingText="Connecting to Google..."
                onClick={handleGoogleSignIn}
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
              </LoadingButton>
            </>
          )}

          <div className="text-center text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link 
                href="/sign-up" 
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400 max-w-md">
        By signing in, you agree to our{" "}
        <Link
          href="/terms-of-service"
          className="underline hover:text-gray-700 dark:hover:text-gray-300"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy-policy"
          className="underline hover:text-gray-700 dark:hover:text-gray-300"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

export default function SignIn() {
  return (
    <AuthErrorBoundary>
      <Suspense
        fallback={
          <div className="flex flex-col justify-center items-center w-full h-screen">
            <div className="max-w-md w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg h-96"></div>
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </AuthErrorBoundary>
  );
}
