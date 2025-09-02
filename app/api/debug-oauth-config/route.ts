import { NextResponse } from 'next/server'
import { env, isGoogleOAuthConfigured } from '@/lib/config/env'

export async function GET() {
  try {
    // Check all the OAuth configuration values
    const config = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      enableGoogleAuth: env.features.enableGoogleAuth,
      isGoogleOAuthConfigured: isGoogleOAuthConfigured(),
      nodeEnv: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT,
    }

    return NextResponse.json({
      config,
      message: 'OAuth configuration check',
      // Show first few chars of actual values for debugging (safely)
      values: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        googleClientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
      }
    })

  } catch (error) {
    console.error('OAuth config debug error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}