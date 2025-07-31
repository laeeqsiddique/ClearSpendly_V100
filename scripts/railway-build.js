#!/usr/bin/env node

/**
 * Railway Build Script
 * Ensures environment variables are available during Next.js build
 */

console.log('🚂 Railway Build Script Starting...\n');

// Check critical environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

console.log('📋 Checking environment variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.error(`❌ ${varName}: NOT FOUND`);
  }
});

// Log all NEXT_PUBLIC variables
console.log('\n🔍 All NEXT_PUBLIC variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('NEXT_PUBLIC_'))
  .forEach(key => {
    console.log(`  ${key}: ${process.env[key]?.substring(0, 30)}...`);
  });

// Set build flag
process.env.BUILDING = 'true';

// Run the actual build
console.log('\n🏗️  Starting Next.js build...\n');
const { execSync } = require('child_process');

try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n✅ Build completed successfully!');
} catch (error) {
  console.error('\n❌ Build failed!');
  process.exit(1);
}