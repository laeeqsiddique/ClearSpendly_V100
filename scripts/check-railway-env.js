#!/usr/bin/env node

/**
 * Railway Environment Checker
 * Validates that all required environment variables are set for Railway deployment
 */

const requiredEnvVars = {
  // Supabase (Public)
  'NEXT_PUBLIC_SUPABASE_URL': {
    description: 'Supabase project URL',
    example: 'https://your-project.supabase.co',
    critical: true,
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    description: 'Supabase anonymous/public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    critical: true,
  },
  
  // Supabase (Server)
  'SUPABASE_SERVICE_ROLE_KEY': {
    description: 'Supabase service role key (server-side only)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    critical: true,
  },
  
  // OAuth Providers (Optional but needed for Google Auth)
  'GOOGLE_CLIENT_ID': {
    description: 'Google OAuth client ID',
    example: '1234567890-abcdefg.apps.googleusercontent.com',
    critical: false,
  },
  'GOOGLE_CLIENT_SECRET': {
    description: 'Google OAuth client secret',
    example: 'GOCSPX-...',
    critical: false,
  },
  
  // AI Enhancement (Optional but needed for AI-powered OCR)
  'OPENAI_API_KEY': {
    description: 'OpenAI API key for AI-enhanced receipt processing',
    example: 'sk-...',
    critical: false,
  },
  'NEXT_PUBLIC_OPENAI_API_KEY': {
    description: 'OpenAI API key (client-side) - alternative to OPENAI_API_KEY',
    example: 'sk-...',
    critical: false,
  },
  
  // App Configuration
  'NEXT_PUBLIC_APP_URL': {
    description: 'Public URL of your app',
    example: 'https://your-app.up.railway.app',
    critical: false,
  },
  
  // Railway Specific
  'RAILWAY_ENVIRONMENT': {
    description: 'Railway environment name',
    example: 'production',
    critical: false,
  },
};

console.log('🚂 Railway Environment Checker\n');

let hasErrors = false;
let hasCriticalErrors = false;

// Check each required environment variable
Object.entries(requiredEnvVars).forEach(([varName, config]) => {
  const value = process.env[varName];
  
  if (!value) {
    if (config.critical) {
      console.error(`❌ CRITICAL: ${varName} is not set`);
      console.error(`   Description: ${config.description}`);
      console.error(`   Example: ${config.example}\n`);
      hasCriticalErrors = true;
    } else {
      console.warn(`⚠️  WARNING: ${varName} is not set`);
      console.warn(`   Description: ${config.description}`);
      console.warn(`   Example: ${config.example}\n`);
    }
    hasErrors = true;
  } else {
    // Mask sensitive values
    const maskedValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? value.substring(0, 10) + '...' 
      : value;
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('\n📋 Summary:');

if (!hasErrors) {
  console.log('✅ All environment variables are properly configured!');
} else if (hasCriticalErrors) {
  console.error('❌ Critical environment variables are missing. The app will not function properly.');
  console.error('\n🔧 To fix this in Railway:');
  console.error('1. Go to your Railway project dashboard');
  console.error('2. Click on your service');
  console.error('3. Go to the "Variables" tab');
  console.error('4. Add the missing variables listed above');
  console.error('5. Redeploy your service');
  process.exit(1);
} else {
  console.warn('⚠️  Some optional environment variables are missing.');
  console.warn('   The app will work but some features may be disabled.');
}

// Additional checks for Google OAuth
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n🔐 OAuth Configuration:');
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Google OAuth is not configured. Users will only be able to sign in with email.');
    console.warn('\n   To enable Google sign-in:');
    console.warn('   1. Go to Supabase Dashboard > Authentication > Providers');
    console.warn('   2. Enable Google provider');
    console.warn('   3. Add your Google OAuth credentials');
    console.warn('   4. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Railway');
  } else {
    console.log('✅ Google OAuth is configured');
  }
  
  // Check redirect URL configuration
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_STATIC_URL;
  if (appUrl) {
    console.log(`\n🔗 OAuth Redirect URL: ${appUrl}/auth/callback`);
    console.log('   Make sure this URL is added to:');
    console.log('   - Supabase: Authentication > URL Configuration > Redirect URLs');
    console.log('   - Google Cloud Console: OAuth 2.0 Client > Authorized redirect URIs');
  }
}

console.log('\n💡 Tips:');
console.log('- Environment variables starting with NEXT_PUBLIC_ are exposed to the browser');
console.log('- Other variables are only available server-side');
console.log('- Railway automatically provides RAILWAY_ENVIRONMENT and other deployment variables');
console.log('- After adding variables, redeploy your service for changes to take effect');