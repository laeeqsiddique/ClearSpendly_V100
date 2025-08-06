#!/usr/bin/env node

/**
 * Railway Environment Setup Helper
 * This script helps you set up the required environment variables for Railway deployment
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Flowvya Railway Environment Setup\n');
console.log('This will help you set up the required environment variables for Railway deployment.\n');

// Required environment variables
const requiredVars = [
  {
    name: 'SUPABASE_PROJECT_REF',
    description: 'Your Supabase project ID (found in project URL)',
    example: 'abcdefghijklmnop'
  },
  {
    name: 'SUPABASE_ACCESS_TOKEN',
    description: 'Personal access token from supabase.com/dashboard/account/tokens',
    example: 'sbp_1234567890abcdef...',
    sensitive: true
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Your Supabase project URL',
    example: 'https://your-project.supabase.co'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anon public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    sensitive: true
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (NEVER expose client-side)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    sensitive: true
  }
];

// Optional but recommended variables
const optionalVars = [
  {
    name: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth client ID',
    example: 'your-app.googleusercontent.com'
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth client secret',
    example: 'GOCSPX-...',
    sensitive: true
  },
  {
    name: 'OPENAI_API_KEY',
    description: 'OpenAI API key for AI features',
    example: 'sk-proj-...',
    sensitive: true
  }
];

let envVars = {};

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function collectEnvironmentVariables() {
  console.log('📋 Required Environment Variables:\n');
  
  for (const variable of requiredVars) {
    console.log(`\n${variable.name}:`);
    console.log(`  Description: ${variable.description}`);
    console.log(`  Example: ${variable.sensitive ? '[HIDDEN]' : variable.example}`);
    
    const value = await question(`  Enter value: `);
    if (value.trim()) {
      envVars[variable.name] = value.trim();
    } else {
      console.log('  ⚠️ This is a required variable!');
      return false;
    }
  }
  
  // Generate BETTER_AUTH_SECRET automatically
  const crypto = require('crypto');
  const authSecret = crypto.randomBytes(32).toString('hex');
  envVars['BETTER_AUTH_SECRET'] = authSecret;
  console.log(`\n✅ Generated BETTER_AUTH_SECRET automatically`);
  
  // Get Railway domain
  const railwayDomain = await question('\n🌐 What is your Railway domain? (e.g., your-app.up.railway.app): ');
  if (railwayDomain.trim()) {
    envVars['BETTER_AUTH_URL'] = `https://${railwayDomain.trim()}`;
    envVars['NEXT_PUBLIC_APP_URL'] = `https://${railwayDomain.trim()}`;
  }
  
  // Set production environment
  envVars['NODE_ENV'] = 'production';
  
  console.log('\n📋 Optional Environment Variables (press Enter to skip):\n');
  
  for (const variable of optionalVars) {
    console.log(`\n${variable.name} (optional):`);
    console.log(`  Description: ${variable.description}`);
    
    const value = await question(`  Enter value (or press Enter to skip): `);
    if (value.trim()) {
      envVars[variable.name] = value.trim();
    }
  }
  
  return true;
}

async function setRailwayVariables() {
  console.log('\n🚀 Setting Railway Environment Variables...\n');
  
  try {
    // Check if Railway CLI is installed and user is logged in
    execSync('railway whoami', { stdio: 'pipe' });
    
    for (const [name, value] of Object.entries(envVars)) {
      console.log(`Setting ${name}...`);
      execSync(`railway variables set ${name}="${value}"`, { stdio: 'pipe' });
      console.log(`✅ ${name} set successfully`);
    }
    
    console.log('\n🎉 All environment variables set successfully!');
    return true;
  } catch (error) {
    console.log('\n⚠️ Railway CLI not available or not logged in.');
    console.log('\nPlease set these variables manually in Railway dashboard:');
    console.log('👉 https://railway.app/dashboard\n');
    
    for (const [name, value] of Object.entries(envVars)) {
      if (name.includes('SECRET') || name.includes('KEY') || name.includes('TOKEN')) {
        console.log(`${name}=[HIDDEN FOR SECURITY]`);
      } else {
        console.log(`${name}=${value}`);
      }
    }
    
    return false;
  }
}

async function main() {
  try {
    const success = await collectEnvironmentVariables();
    if (!success) {
      console.log('\n❌ Missing required environment variables. Please try again.');
      process.exit(1);
    }
    
    console.log('\n📊 Environment Variables Summary:');
    console.log('================================');
    
    for (const [name, value] of Object.entries(envVars)) {
      if (name.includes('SECRET') || name.includes('KEY') || name.includes('TOKEN')) {
        console.log(`${name}: [HIDDEN FOR SECURITY]`);
      } else {
        console.log(`${name}: ${value}`);
      }
    }
    
    const proceed = await question('\n✅ Proceed with setting these variables? (y/N): ');
    if (proceed.toLowerCase() === 'y' || proceed.toLowerCase() === 'yes') {
      await setRailwayVariables();
      
      console.log('\n🚀 Next Steps:');
      console.log('1. Apply database migrations: npm run deployment:migrate');
      console.log('2. Deploy your application: railway up');
      console.log('3. Check deployment: railway logs');
      console.log('\n📖 Full guide: ./RAILWAY_ENV_SETUP.md');
    } else {
      console.log('\n📋 Setup cancelled. You can run this script again anytime.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();