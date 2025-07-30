#!/usr/bin/env node

/**
 * Environment Variable Management for Cost-Effective Deployment
 * Manages environment variables across different platforms securely
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnvironmentManager {
  constructor() {
    this.environments = ['development', 'staging', 'production'];
    this.platforms = ['railway', 'vercel', 'digitalocean'];
  }

  // Load environment variables from file
  loadEnvFile(environment) {
    const envFile = path.join(process.cwd(), `.env.${environment}`);
    if (!fs.existsSync(envFile)) {
      console.warn(`Environment file not found: ${envFile}`);
      return {};
    }

    const envContent = fs.readFileSync(envFile, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });

    return envVars;
  }

  // Cost optimization: Identify unnecessary variables per environment
  optimizeEnvironmentVariables(environment) {
    const envVars = this.loadEnvFile(environment);
    const optimizations = [];

    // Development-only variables that shouldn't be in production
    const devOnlyVars = [
      'NEXT_PUBLIC_DEBUG',
      'OLLAMA_API_URL', // Local AI for development
      'NEXT_PUBLIC_POSTHOG_DEBUG'
    ];

    // Production optimizations
    if (environment === 'production') {
      devOnlyVars.forEach(varName => {
        if (envVars[varName]) {
          optimizations.push({
            type: 'remove',
            variable: varName,
            reason: 'Development-only variable in production',
            savings: 'Reduces bundle size'
          });
        }
      });

      // Check for cost-effective AI configuration
      if (envVars.OPENAI_API_KEY && !envVars.OLLAMA_API_URL) {
        optimizations.push({
          type: 'suggestion',
          variable: 'AI Configuration',
          reason: 'Consider Ollama for development to reduce OpenAI costs',
          savings: 'Up to $20/month in development'
        });
      }
    }

    return { envVars, optimizations };
  }

  // Deploy environment variables to Railway
  async deployToRailway(environment) {
    console.log(`🚂 Deploying environment variables to Railway (${environment})...`);
    
    try {
      const { envVars, optimizations } = this.optimizeEnvironmentVariables(environment);
      
      // Display optimizations
      if (optimizations.length > 0) {
        console.log('\n💡 Environment Optimizations:');
        optimizations.forEach(opt => {
          console.log(`   ${opt.type}: ${opt.variable} - ${opt.reason}`);
        });
      }

      // Set variables in Railway
      const railwayEnv = environment === 'production' ? 'production' : 'staging';
      
      for (const [key, value] of Object.entries(envVars)) {
        // Skip dev-only variables in production
        if (environment === 'production' && 
            ['NEXT_PUBLIC_DEBUG', 'OLLAMA_API_URL'].includes(key)) {
          continue;
        }

        try {
          execSync(`railway variables set ${key}="${value}" --environment ${railwayEnv}`, 
            { stdio: 'pipe' });
        } catch (error) {
          console.warn(`Warning: Could not set ${key}: ${error.message}`);
        }
      }

      console.log(`✅ Environment variables deployed to Railway ${railwayEnv}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to deploy environment variables: ${error.message}`);
      return false;
    }
  }

  // Generate cost-optimized environment templates
  generateCostOptimizedTemplates() {
    console.log('📝 Generating cost-optimized environment templates...');

    const templates = {
      production: {
        // Core application
        NEXT_PUBLIC_APP_URL: 'https://your-domain.com',
        NODE_ENV: 'production',
        
        // Database (Supabase Pro: $25/month)
        NEXT_PUBLIC_SUPABASE_URL: 'your-supabase-url',
        SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key',
        
        // AI (Cost-optimized)
        OPENAI_API_KEY: 'your-openai-key', // GPT-4o-mini for cost savings
        
        // Email (Resend: $0-0.30/1000 emails)
        RESEND_API_KEY: 'your-resend-key',
        
        // Analytics (PostHog: Free tier up to 1M events)
        NEXT_PUBLIC_POSTHOG_KEY: 'your-posthog-key',
        
        // Remove development variables
        // NEXT_PUBLIC_DEBUG: removed for production
        // OLLAMA_API_URL: removed for production
      },

      staging: {
        // Similar to production but with staging URLs
        NEXT_PUBLIC_APP_URL: 'https://staging-your-domain.com',
        NODE_ENV: 'staging',
        
        // Can use same database with different schema
        NEXT_PUBLIC_SUPABASE_URL: 'your-supabase-url',
        SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key',
        
        // Development AI for testing (cost savings)
        OLLAMA_API_URL: 'http://localhost:11434', // Local AI
        OPENAI_API_KEY: 'backup-only', // Fallback only
        
        // Staging services
        RESEND_API_KEY: 'your-resend-key',
        NEXT_PUBLIC_POSTHOG_KEY: 'your-staging-posthog-key',
        NEXT_PUBLIC_DEBUG: 'true',
      },

      development: {
        // Full development setup
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NODE_ENV: 'development',
        
        // Local Supabase for development
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'your-local-service-key',
        
        // Local AI (no cost)
        OLLAMA_API_URL: 'http://localhost:11434',
        OLLAMA_MODEL: 'mistral:latest',
        
        // Development flags
        NEXT_PUBLIC_DEBUG: 'true',
        NEXT_PUBLIC_PRIVACY_MODE_ENABLED: 'false',
      }
    };

    // Write optimized templates
    Object.entries(templates).forEach(([env, vars]) => {
      const templatePath = path.join(process.cwd(), `.env.${env}.template`);
      const content = Object.entries(vars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
        
      fs.writeFileSync(templatePath, content);
      console.log(`✅ Created ${templatePath}`);
    });

    // Generate cost analysis
    this.generateCostAnalysis(templates);
  }

  generateCostAnalysis(templates) {
    console.log('\n💰 COST ANALYSIS BY ENVIRONMENT:');
    console.log('=====================================');
    
    const costBreakdown = {
      production: {
        railway: 15, // Estimated
        supabase: 25,
        openai: 5, // With GPT-4o-mini
        resend: 1,
        domain: 12, // Annual
        total: 58
      },
      staging: {
        railway: 8, // Auto-sleep enabled
        supabase: 0, // Shared with production
        openai: 1, // Minimal usage
        resend: 0, // Shared quota
        total: 9
      },
      development: {
        railway: 0, // Local development
        supabase: 0, // Local instance
        openai: 0, // Local Ollama
        resend: 0, // Local testing
        total: 0
      }
    };

    Object.entries(costBreakdown).forEach(([env, costs]) => {
      console.log(`\n${env.toUpperCase()}:`);
      Object.entries(costs).forEach(([service, cost]) => {
        if (service !== 'total') {
          console.log(`  ${service}: $${cost}/month`);
        }
      });
      console.log(`  TOTAL: $${costs.total}/month`);
    });

    console.log(`\n🎯 TOTAL MONTHLY COST: $${costBreakdown.production.total + costBreakdown.staging.total}/month`);
    console.log('💡 This is highly cost-effective for a professional SaaS deployment!');
  }

  async run() {
    const command = process.argv[2];
    const environment = process.argv[3] || 'production';

    switch (command) {
      case 'deploy':
        await this.deployToRailway(environment);
        break;
      
      case 'optimize':
        const result = this.optimizeEnvironmentVariables(environment);
        console.log(`Environment optimizations for ${environment}:`, result);
        break;
      
      case 'templates':
        this.generateCostOptimizedTemplates();
        break;
      
      default:
        console.log('Usage:');
        console.log('  node env-manager.js deploy [production|staging]');
        console.log('  node env-manager.js optimize [environment]');
        console.log('  node env-manager.js templates');
    }
  }
}

// Run environment manager
const manager = new EnvironmentManager();
manager.run().catch(console.error);