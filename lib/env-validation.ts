/**
 * Environment validation utility for production deployments
 * Ensures critical environment variables are available and provides fallbacks
 */

export interface EnvValidation {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  isBuildTime: boolean;
  platform: 'vercel' | 'railway' | 'other';
}

export function validateEnvironment(): EnvValidation {
  const isBuildTime = typeof window === 'undefined' && (
    process.env.NODE_ENV === 'production' && 
    process.env.CI === 'true' && 
    (!process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT)
  );

  const platform = process.env.VERCEL ? 'vercel' : 
                   process.env.RAILWAY_ENVIRONMENT ? 'railway' : 'other';

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const optional = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
    'UPLOADTHING_SECRET',
    'POLAR_ACCESS_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);
  const warnings = optional.filter(key => !process.env[key]);

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    isBuildTime,
    platform,
  };
}

export function getEnvironmentConfig() {
  const validation = validateEnvironment();
  
  return {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    auth: {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      secret: process.env.BETTER_AUTH_SECRET || '',
      url: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '',
    },
    services: {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      resendApiKey: process.env.RESEND_API_KEY || '',
      uploadthingSecret: process.env.UPLOADTHING_SECRET || '',
      polarAccessToken: process.env.POLAR_ACCESS_TOKEN || '',
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      environment: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000'),
    },
    validation,
  };
}

export function logEnvironmentStatus() {
  const config = getEnvironmentConfig();
  const { validation } = config;

  if (validation.isBuildTime) {
    console.log('🔧 Build-time environment detected, using mock services');
    return;
  }

  console.log(`🚀 Platform: ${validation.platform}`);
  console.log(`🌍 Environment: ${config.app.environment}`);
  
  if (!validation.isValid) {
    console.error('❌ Missing required environment variables:', validation.missing);
    throw new Error(`Missing required environment variables: ${validation.missing.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Optional services not configured:', validation.warnings);
  }

  console.log('✅ Environment validation passed');
}