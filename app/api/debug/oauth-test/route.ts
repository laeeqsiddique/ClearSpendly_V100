import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testRedirect = searchParams.get('redirect') || '/dashboard';
  
  // Get current request info
  const origin = request.headers.get('origin') || 'unknown';
  const host = request.headers.get('host') || 'unknown';
  const referer = request.headers.get('referer') || 'unknown';
  
  // Test OAuth URL generation
  const supabase = createClient();
  
  // Get the OAuth URL without actually redirecting
  const redirectUrl = `${origin}/auth/callback?returnTo=${testRedirect}`;
  
  const debugInfo = {
    request: {
      origin,
      host,
      referer,
      url: request.url,
    },
    oauth: {
      provider: 'google',
      redirectUrl,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + '...',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    },
    possibleIssues: [],
  };
  
  // Check for common issues
  if (origin !== process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL) {
    debugInfo.possibleIssues.push(`Origin mismatch: ${origin} vs ${process.env.NEXT_PUBLIC_APP_URL}`);
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')) {
    debugInfo.possibleIssues.push('Invalid Supabase URL format');
  }
  
  return NextResponse.json(debugInfo, { 
    headers: {
      'Content-Type': 'application/json',
    }
  });
}