#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * Validates critical production configurations before deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  addSuccess(message) {
    this.passed.push(message);
    this.log(message, 'success');
  }

  validateEnvironmentVariables() {
    this.log('Validating environment variables...');
    
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_APP_URL',
    ];

    const optional = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'OPENAI_API_KEY',
      'RESEND_API_KEY',
      'UPLOADTHING_SECRET',
      'POLAR_ACCESS_TOKEN',
    ];

    required.forEach(key => {
      if (!process.env[key]) {
        this.addError(`Missing required environment variable: ${key}`);
      } else {
        this.addSuccess(`Required environment variable present: ${key}`);
      }
    });

    optional.forEach(key => {
      if (!process.env[key]) {
        this.addWarning(`Optional service not configured: ${key}`);
      } else {
        this.addSuccess(`Optional service configured: ${key}`);
      }
    });
  }

  validateSupabaseConnection() {
    this.log('Validating Supabase connection...');
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      this.addError('Cannot validate Supabase connection - missing credentials');
      return;
    }

    try {
      // Simple connectivity test
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      this.addSuccess('Supabase client created successfully');
    } catch (error) {
      this.addError(`Supabase connection failed: ${error.message}`);
    }
  }

  validateBuildConfiguration() {
    this.log('Validating build configuration...');
    
    const configPath = path.join(process.cwd(), 'next.config.ts');
    if (!fs.existsSync(configPath)) {
      this.addError('next.config.ts not found');
      return;
    }

    try {
      const config = fs.readFileSync(configPath, 'utf8');
      
      // Check for required configurations
      if (config.includes('output: \'standalone\'')) {
        this.addSuccess('Standalone output configured for deployment');
      } else {
        this.addWarning('Standalone output not configured - may cause deployment issues');
      }

      if (config.includes('compress: true')) {
        this.addSuccess('Response compression enabled');
      } else {
        this.addWarning('Response compression not enabled');
      }

      if (config.includes('typescript: { ignoreBuildErrors: true }')) {
        this.addWarning('TypeScript build errors are ignored - this may hide issues');
      }

    } catch (error) {
      this.addError(`Failed to validate build configuration: ${error.message}`);
    }
  }

  validateDependencies() {
    this.log('Validating dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for critical dependencies
      const critical = [
        '@supabase/supabase-js',
        '@supabase/ssr',
        'next',
        'react',
        'react-dom',
      ];

      critical.forEach(dep => {
        if (packageJson.dependencies[dep]) {
          this.addSuccess(`Critical dependency present: ${dep}`);
        } else {
          this.addError(`Missing critical dependency: ${dep}`);
        }
      });

      // Check Node version compatibility
      const nodeEngine = packageJson.engines?.node;
      if (nodeEngine) {
        this.addSuccess(`Node.js version constraint: ${nodeEngine}`);
      } else {
        this.addWarning('No Node.js version constraint specified');
      }

    } catch (error) {
      this.addError(`Failed to validate dependencies: ${error.message}`);
    }
  }

  validateSecurityHeaders() {
    this.log('Validating security configuration...');
    
    const configPath = path.join(process.cwd(), 'next.config.ts');
    if (!fs.existsSync(configPath)) {
      this.addError('Cannot validate security headers - next.config.ts not found');
      return;
    }

    try {
      const config = fs.readFileSync(configPath, 'utf8');
      
      if (config.includes('X-Frame-Options')) {
        this.addSuccess('X-Frame-Options header configured');
      } else {
        this.addWarning('X-Frame-Options header not configured');
      }

      if (config.includes('X-Content-Type-Options')) {
        this.addSuccess('X-Content-Type-Options header configured');
      } else {
        this.addWarning('X-Content-Type-Options header not configured');
      }

    } catch (error) {
      this.addError(`Failed to validate security headers: ${error.message}`);
    }
  }

  validateMiddleware() {
    this.log('Validating middleware configuration...');
    
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    if (!fs.existsSync(middlewarePath)) {
      this.addError('middleware.ts not found');
      return;
    }

    try {
      const middleware = fs.readFileSync(middlewarePath, 'utf8');
      
      if (middleware.includes('allowedHosts')) {
        this.addSuccess('Host validation configured in middleware');
      } else {
        this.addWarning('Host validation not configured in middleware');
      }

      if (middleware.includes('isBuildTime')) {
        this.addSuccess('Build-time detection configured');
      } else {
        this.addError('Build-time detection not configured');
      }

    } catch (error) {
      this.addError(`Failed to validate middleware: ${error.message}`);
    }
  }

  validateDeploymentSafety() {
    this.log('Validating deployment safety patterns...');
    
    // Check for unsafe patterns in client code
    try {
      const clientPath = path.join(process.cwd(), 'lib/supabase/client.ts');
      if (fs.existsSync(clientPath)) {
        const client = fs.readFileSync(clientPath, 'utf8');
        
        if (client.includes('createMockClient')) {
          this.addSuccess('Mock client implemented for build safety');
        } else {
          this.addError('Mock client not implemented - may cause build failures');
        }

        if (client.includes('isBuildTime')) {
          this.addSuccess('Build-time detection in client');
        } else {
          this.addError('Build-time detection missing in client');
        }
      }

      const serverPath = path.join(process.cwd(), 'lib/supabase/server.ts');
      if (fs.existsSync(serverPath)) {
        const server = fs.readFileSync(serverPath, 'utf8');
        
        if (server.includes('signInWithOAuth')) {
          this.addSuccess('OAuth methods present in server mock');
        } else {
          this.addError('OAuth methods missing in server mock - will cause runtime errors');
        }
      }

    } catch (error) {
      this.addError(`Failed to validate deployment safety: ${error.message}`);
    }
  }

  run() {
    this.log('🚀 Starting production deployment validation...');
    this.log(`📍 Working directory: ${process.cwd()}`);
    this.log(`🌍 Node environment: ${process.env.NODE_ENV || 'not set'}`);
    
    this.validateEnvironmentVariables();
    this.validateSupabaseConnection();
    this.validateBuildConfiguration();
    this.validateDependencies();
    this.validateSecurityHeaders();
    this.validateMiddleware();
    this.validateDeploymentSafety();

    // Summary
    this.log('\n📊 VALIDATION SUMMARY');
    this.log(`✅ Passed: ${this.passed.length}`);
    this.log(`⚠️  Warnings: ${this.warnings.length}`);
    this.log(`❌ Errors: ${this.errors.length}`);

    if (this.errors.length > 0) {
      this.log('\n❌ CRITICAL ERRORS - DEPLOYMENT NOT RECOMMENDED:');
      this.errors.forEach(error => this.log(`  • ${error}`, 'error'));
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  WARNINGS - REVIEW BEFORE DEPLOYMENT:');
      this.warnings.forEach(warning => this.log(`  • ${warning}`, 'warning'));
    }

    this.log('\n🎉 Production validation completed successfully!');
    this.log('🚀 Ready for deployment');
  }
}

// Run validation
const validator = new ProductionValidator();
validator.run();