#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Ensures code is deployment-ready by testing build with missing environment variables
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting Deployment Validation...\n');

// Step 1: Check for unsafe patterns in code
console.log('📋 Checking for unsafe coding patterns...');

function checkUnsafePatterns() {
  const patterns = [
    {
      pattern: /process\.env\.[A-Z_]+!/g,
      message: '❌ Found unsafe non-null assertion on environment variable',
      file: null,
      severity: 'error'
    },
    {
      pattern: /createServerClient\(\s*process\.env\.[^,\s]+!\s*,/g,
      message: '❌ Found unsafe Supabase client creation',
      file: null,
      severity: 'error'
    },
    {
      pattern: /window\./g,
      message: '⚠️  Found window object usage (ensure it\'s client-side guarded)',
      file: null,
      severity: 'warning'
    }
  ];

  const checkDirectory = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        checkDirectory(fullPath);
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        patterns.forEach(pattern => {
          const matches = content.match(pattern.pattern);
          if (matches) {
            console.log(`${pattern.message}: ${fullPath}`);
            if (pattern.severity === 'error') {
              process.exit(1);
            }
          }
        });
      }
    }
  };

  checkDirectory('./app');
  checkDirectory('./lib');
  checkDirectory('./components');
  console.log('✅ Code pattern check completed\n');
}

// Step 2: Test build without environment variables
function testBuildResilience() {
  return new Promise((resolve, reject) => {
    console.log('🏗️  Testing build resilience without environment variables...');
    
    // Store original environment variables
    const originalEnvs = {};
    const criticalEnvs = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'OPENAI_API_KEY',
      'STRIPE_SECRET_KEY'
    ];
    
    // Backup and remove critical env vars
    criticalEnvs.forEach(key => {
      if (process.env[key]) {
        originalEnvs[key] = process.env[key];
        delete process.env[key];
      }
    });
    
    // Run build
    exec('npm run build', (error, stdout, stderr) => {
      // Restore environment variables
      Object.assign(process.env, originalEnvs);
      
      if (error) {
        console.log('❌ Build failed without environment variables:');
        console.log(stderr);
        reject(error);
      } else {
        console.log('✅ Build successful without environment variables');
        resolve();
      }
    });
  });
}

// Step 3: Test build with environment variables
function testNormalBuild() {
  return new Promise((resolve, reject) => {
    console.log('🏗️  Testing normal build with environment variables...');
    
    exec('npm run build', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Normal build failed:');
        console.log(stderr);
        reject(error);
      } else {
        console.log('✅ Normal build successful');
        console.log(stdout.split('\n').filter(line => 
          line.includes('✓') || line.includes('Route') || line.includes('Size')
        ).join('\n'));
        resolve();
      }
    });
  });
}

// Step 4: Check deployment configuration
function checkDeploymentConfig() {
  console.log('⚙️  Checking deployment configuration...');
  
  // Check next.config.ts
  const nextConfigPath = './next.config.ts';
  if (fs.existsSync(nextConfigPath)) {
    const config = fs.readFileSync(nextConfigPath, 'utf8');
    
    const checks = [
      {
        pattern: /output:\s*['"]standalone['"]/,
        message: '✅ Standalone output configured',
        required: true
      },
      {
        pattern: /typescript:\s*{[^}]*ignoreBuildErrors:\s*(true|false)/,
        message: '✅ TypeScript configuration present',
        required: false
      },
      {
        pattern: /env:\s*{/,
        message: '✅ Environment variables configured',
        required: false
      }
    ];
    
    checks.forEach(check => {
      if (config.match(check.pattern)) {
        console.log(check.message);
      } else if (check.required) {
        console.log(`❌ Missing required config: ${check.message.replace('✅', '')}`);
        process.exit(1);
      }
    });
  } else {
    console.log('❌ next.config.ts not found');
    process.exit(1);
  }
  
  // Check package.json scripts
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  if (!packageJson.scripts.build) {
    console.log('❌ Build script not found in package.json');
    process.exit(1);
  }
  
  console.log('✅ Deployment configuration check completed\n');
}

// Step 5: Generate deployment report
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    status: 'READY_FOR_DEPLOYMENT',
    checks: [
      '✅ Unsafe coding patterns check passed',
      '✅ Build resilience test passed',
      '✅ Normal build test passed',
      '✅ Deployment configuration verified'
    ]
  };
  
  fs.writeFileSync('./deployment-report.json', JSON.stringify(report, null, 2));
  console.log('📄 Deployment report generated: deployment-report.json');
}

// Run validation
async function main() {
  try {
    checkUnsafePatterns();
    checkDeploymentConfig();
    await testBuildResilience();
    await testNormalBuild();
    generateReport();
    
    console.log('\n🎉 DEPLOYMENT VALIDATION PASSED!');
    console.log('✅ Your code is ready for production deployment.');
  } catch (error) {
    console.log('\n❌ DEPLOYMENT VALIDATION FAILED!');
    console.log('Please fix the issues above before deploying.');
    process.exit(1);
  }
}

main();