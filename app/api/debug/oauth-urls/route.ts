import { NextResponse } from 'next/server';
import { getAppUrl, getOAuthCallbackUrl } from '@/lib/config/app-url';

export async function GET() {
  // Only show in development or with special debug header
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  const debug = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
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
    }
  };
  
  return NextResponse.json(debug);
}