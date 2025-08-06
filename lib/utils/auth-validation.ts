// Authentication configuration validation utilities

export interface AuthValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export function validateAuthConfiguration(): AuthValidationResult {
  const result: AuthValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    recommendations: []
  };

  // Check Supabase configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    result.errors.push('NEXT_PUBLIC_SUPABASE_URL is not set');
    result.isValid = false;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    result.errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    result.isValid = false;
  }

  // Check Google OAuth configuration
  const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;

  if (hasGoogleClientId && !hasGoogleClientSecret) {
    result.errors.push('GOOGLE_CLIENT_ID is set but GOOGLE_CLIENT_SECRET is missing');
    result.isValid = false;
  }

  if (!hasGoogleClientId && hasGoogleClientSecret) {
    result.errors.push('GOOGLE_CLIENT_SECRET is set but GOOGLE_CLIENT_ID is missing');
    result.isValid = false;
  }

  if (!hasGoogleClientId && !hasGoogleClientSecret) {
    result.warnings.push('Google OAuth is not configured - Google Sign-in will be disabled');
    result.recommendations.push('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google Sign-in');
  }

  // Check production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      result.warnings.push('NEXT_PUBLIC_APP_URL is not set in production');
      result.recommendations.push('Set NEXT_PUBLIC_APP_URL for proper OAuth redirects in production');
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')) {
      result.errors.push('Production environment is using localhost Supabase URL');
      result.isValid = false;
    }
  }

  return result;
}

export function logAuthConfigurationStatus(): void {
  if (typeof window !== 'undefined' || process.env.NODE_ENV !== 'development') {
    return; // Only log in development server-side
  }

  const validation = validateAuthConfiguration();
  
  console.log('🔐 Authentication Configuration Status:');
  
  if (validation.isValid) {
    console.log('✅ All required authentication configuration is valid');
  } else {
    console.log('❌ Authentication configuration issues found');
  }

  if (validation.errors.length > 0) {
    console.error('🚨 Configuration Errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration Warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (validation.recommendations.length > 0) {
    console.info('💡 Recommendations:');
    validation.recommendations.forEach(rec => console.info(`  - ${rec}`));
  }

  // OAuth provider status
  console.log('\n📋 OAuth Provider Status:');
  console.log(`  Google OAuth: ${process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
  
  // Environment-specific info
  console.log(`\n🌍 Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`  Railway: ${process.env.RAILWAY_ENVIRONMENT ? '✅ Detected' : '❌ Not detected'}`);
  console.log(`  Vercel: ${process.env.VERCEL ? '✅ Detected' : '❌ Not detected'}`);
}

// Auto-run validation in development
if (process.env.NODE_ENV === 'development') {
  logAuthConfigurationStatus();
}