import { NextResponse } from 'next/server';
import { env } from '@/lib/config/env';

export async function GET() {
  // Only show in development or with special header
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  // Check configuration status
  const config = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
      isRailway: env.deployment.isRailway,
    },
    supabase: {
      hasUrl: !!env.supabase.url,
      hasAnonKey: !!env.supabase.anonKey,
      hasServiceKey: !!env.supabase.serviceRoleKey,
      urlPrefix: env.supabase.url ? env.supabase.url.substring(0, 30) + '...' : 'not set',
    },
    oauth: {
      google: {
        hasClientId: !!env.oauth.google.clientId,
        hasClientSecret: !!env.oauth.google.clientSecret,
      },
    },
    features: {
      googleAuthEnabled: env.features.enableGoogleAuth,
      emailAuthEnabled: env.features.enableEmailAuth,
    },
    publicUrl: env.deployment.publicUrl || 'not set',
  };
  
  return NextResponse.json(config);
}