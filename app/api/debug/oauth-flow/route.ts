import { NextResponse } from 'next/server';
import { getAppUrl, getOAuthCallbackUrl } from '@/lib/config/app-url';

export async function GET() {
  // Always show this endpoint for debugging OAuth issues
  
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN || 'not set',
      // Don't expose sensitive data, just show if they exist
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    urls: {
      getAppUrl: getAppUrl(),
      getOAuthCallbackUrl: getOAuthCallbackUrl('/onboarding'),
      getOAuthCallbackUrlDashboard: getOAuthCallbackUrl('/dashboard'),
    },
    conditions: {
      hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      isProduction: process.env.NODE_ENV === 'production',
      isRailway: !!process.env.RAILWAY_ENVIRONMENT,
      windowUndefined: typeof window === 'undefined',
    },
    expectedBehavior: {
      productionUrl: 'https://www.flowvya.com',
      callbackUrl: 'https://www.flowvya.com/auth/callback',
      shouldUseProduction: process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT,
    }
  };
  
  return NextResponse.json(debug, { 
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}