import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { getAppUrl, getOAuthCallbackUrl } from '@/lib/config/app-url';

export async function POST() {
  try {
    const supabase = createClient();
    
    // Test what URL would be generated
    const redirectUrl = getOAuthCallbackUrl('/onboarding');
    
    // Force production URL in production environment
    const actualRedirectUrl = process.env.NODE_ENV === 'production' 
      ? redirectUrl.replace('http://localhost:3000', 'https://www.flowvya.com')
      : redirectUrl;

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      isRailway: !!process.env.RAILWAY_ENVIRONMENT,
      appUrl: getAppUrl(),
      generatedRedirectUrl: redirectUrl,
      actualRedirectUrl: actualRedirectUrl,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      willUseUrl: actualRedirectUrl
    };

    // Try to initiate OAuth to see what happens
    console.log('Testing OAuth with URL:', actualRedirectUrl);

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      message: 'OAuth debug info generated. Check console for details.'
    });

  } catch (error) {
    console.error('OAuth debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  }
}