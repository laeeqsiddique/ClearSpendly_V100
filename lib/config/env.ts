// Centralized environment configuration
// This helps manage environment variables across different deployment environments

export const env = {
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  // OAuth Providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  
  // Deployment Environment
  deployment: {
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isRailway: !!process.env.RAILWAY_ENVIRONMENT,
    railwayEnv: process.env.RAILWAY_ENVIRONMENT || '',
    publicUrl: process.env.NEXT_PUBLIC_APP_URL || '',
  },
  
  // Feature Flags
  features: {
    enableGoogleAuth: !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
                     !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                     !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, // Only check client-side available variables
    enableEmailAuth: true, // Always enabled as fallback
  },
};

// Helper function to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!(env.supabase.url && env.supabase.anonKey);
}

// Helper function to get OAuth redirect URL
export function getOAuthRedirectUrl(returnTo?: string): string {
  const baseUrl = env.deployment.publicUrl || 
    (typeof window !== 'undefined' ? window.location.origin : '');
  
  return `${baseUrl}/auth/callback${returnTo ? `?returnTo=${returnTo}` : ''}`;
}

// Helper function to check if Google OAuth is properly configured
export function isGoogleOAuthConfigured(): boolean {
  // On client-side, only check for public client ID
  if (typeof window !== 'undefined') {
    return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  }
  // On server-side, check for both client ID and secret
  return !!(env.oauth.google.clientId && env.oauth.google.clientSecret);
}

// Log configuration issues in development only
if (env.deployment.environment === 'development' && typeof window !== 'undefined') {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase environment variables not configured:', {
      hasUrl: !!env.supabase.url,
      hasAnonKey: !!env.supabase.anonKey,
    });
  }
  
  if (!isGoogleOAuthConfigured()) {
    console.warn('Google OAuth environment variables not configured:', {
      hasClientId: !!env.oauth.google.clientId,
      hasClientSecret: !!env.oauth.google.clientSecret,
    });
    console.info('To enable Google Sign-in, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
  }
}