#!/usr/bin/env node

/**
 * Railway Deployment Script with Migration Automation
 * Handles safe deployment with database migrations and rollback
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class RailwayDeployment {
  constructor() {
    this.environment = process.env.NODE_ENV || 'production';
    this.logFile = path.join(process.cwd(), 'deployment.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async checkPrerequisites() {
    this.log('🔍 Checking deployment prerequisites...');
    
    try {
      // Check Railway CLI
      execSync('railway --version', { stdio: 'pipe' });
      this.log('✅ Railway CLI found');
      
      // Check if logged in
      execSync('railway status', { stdio: 'pipe' });
      this.log('✅ Railway authenticated');
      
      // Check environment variables
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_PROJECT_REF'
      ];
      
      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          throw new Error(`Missing required environment variable: ${varName}`);
        }
      }
      
      this.log('✅ Environment variables validated');
      return true;
    } catch (error) {
      this.log(`❌ Prerequisites check failed: ${error.message}`);
      return false;
    }
  }

  async runMigrations() {
    this.log('🗄️ Running database migrations...');
    
    try {
      // Run migration safety check first
      execSync('npm run deploy:check-migrations', { stdio: 'inherit' });
      
      // Run automated migration
      const migrationCommand = this.environment === 'staging' 
        ? 'npm run deploy:staging'
        : 'npm run deploy:production';
        
      execSync(migrationCommand, { stdio: 'inherit' });
      
      this.log('✅ Database migrations completed successfully');
      return true;
    } catch (error) {
      this.log(`❌ Migration failed: ${error.message}`);
      
      // Attempt rollback
      this.log('🔄 Attempting automatic rollback...');
      try {
        execSync('npm run deploy:rollback', { stdio: 'inherit' });
        this.log('✅ Rollback completed');
      } catch (rollbackError) {
        this.log(`❌ Rollback failed: ${rollbackError.message}`);
      }
      
      return false;
    }
  }

  async buildApplication() {
    this.log('🏗️ Building Next.js application...');
    
    try {
      // Use Railway-specific build command with memory optimization
      execSync('npm run railway:build', { 
        stdio: 'inherit',
        env: { 
          ...process.env, 
          NODE_OPTIONS: '--max-old-space-size=4096',
          NODE_ENV: 'production',
          CI: 'true'
        }
      });
      this.log('✅ Build completed successfully');
      return true;
    } catch (error) {
      this.log(`❌ Build failed: ${error.message}`);
      
      // Fallback to standard build
      this.log('🔄 Attempting fallback build...');
      try {
        execSync('npm run build', { 
          stdio: 'inherit',
          env: { 
            ...process.env, 
            NODE_OPTIONS: '--max-old-space-size=4096',
            NODE_ENV: 'production'
          }
        });
        this.log('✅ Fallback build completed successfully');
        return true;
      } catch (fallbackError) {
        this.log(`❌ Fallback build also failed: ${fallbackError.message}`);
        return false;
      }
    }
  }

  async deployToRailway() {
    this.log('🚀 Deploying to Railway...');
    
    try {
      // First, check if we're using Docker
      const hasDockerfile = require('fs').existsSync('Dockerfile');
      if (hasDockerfile) {
        this.log('📦 Docker configuration detected, using Railway Docker deployment');
      }
      
      // Deploy to Railway with optimized settings
      const deployCommand = this.environment === 'staging'
        ? 'railway up --service staging --detach'
        : 'railway up --detach';
        
      this.log(`Executing: ${deployCommand}`);
      execSync(deployCommand, { 
        stdio: 'inherit',
        env: { 
          ...process.env,
          RAILWAY_DOCKERFILE_PATH: 'Dockerfile'
        }
      });
      
      this.log('✅ Deployment to Railway initiated');
      
      // Wait for deployment to complete
      this.log('⏳ Waiting for deployment to complete...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check deployment status
      try {
        const status = execSync('railway status --json', { encoding: 'utf8' });
        const statusData = JSON.parse(status);
        
        if (statusData.deployments && statusData.deployments.length > 0) {
          const latestDeployment = statusData.deployments[0];
          this.log(`📊 Latest deployment status: ${latestDeployment.status}`);
          
          if (latestDeployment.status === 'SUCCESS') {
            this.log('✅ Deployment completed successfully');
            return true;
          } else if (latestDeployment.status === 'FAILED') {
            this.log('❌ Deployment failed on Railway');
            return false;
          } else {
            this.log('⏳ Deployment still in progress...');
            return true; // Continue to health checks
          }
        }
      } catch (statusError) {
        this.log(`⚠️ Could not get deployment status: ${statusError.message}`);
        // Continue anyway, health checks will verify
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Railway deployment failed: ${error.message}`);
      
      // Additional debugging information
      this.log('🔍 Debug information:');
      try {
        execSync('railway whoami', { stdio: 'inherit' });
        execSync('railway status', { stdio: 'inherit' });
      } catch (debugError) {
        this.log(`Could not get debug info: ${debugError.message}`);
      }
      
      return false;
    }
  }

  async healthCheck() {
    this.log('🏥 Running post-deployment health checks...');
    
    try {
      // Wait for deployment to be ready
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Get Railway service URL
      const urlOutput = execSync('railway status --json', { encoding: 'utf8' });
      const status = JSON.parse(urlOutput);
      const serviceUrl = status.deployments?.[0]?.url;
      
      if (!serviceUrl) {
        throw new Error('Could not determine service URL');
      }
      
      // Run health checks
      const healthChecks = [
        `${serviceUrl}/api/health`,
        `${serviceUrl}/api/health/db`,
        `${serviceUrl}/api/health/tenant`
      ];
      
      for (const endpoint of healthChecks) {
        const response = await fetch(endpoint, { 
          signal: AbortSignal.timeout(10000) 
        });
        
        if (!response.ok) {
          throw new Error(`Health check failed for ${endpoint}: ${response.status}`);
        }
      }
      
      this.log('✅ All health checks passed');
      this.log(`🌐 Application deployed at: ${serviceUrl}`);
      return true;
    } catch (error) {
      this.log(`❌ Health check failed: ${error.message}`);
      return false;
    }
  }

  async run() {
    this.log(`🚀 Starting ${this.environment} deployment process...`);
    
    try {
      // Step 1: Prerequisites
      if (!(await this.checkPrerequisites())) {
        process.exit(1);
      }
      
      // Step 2: Run migrations (only for production)
      if (this.environment === 'production') {
        if (!(await this.runMigrations())) {
          process.exit(1);
        }
      }
      
      // Step 3: Build application
      if (!(await this.buildApplication())) {
        process.exit(1);
      }
      
      // Step 4: Deploy to Railway
      if (!(await this.deployToRailway())) {
        process.exit(1);
      }
      
      // Step 5: Health checks
      if (!(await this.healthCheck())) {
        process.exit(1);
      }
      
      this.log('🎉 Deployment completed successfully!');
      
    } catch (error) {
      this.log(`💥 Deployment failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run deployment
const deployment = new RailwayDeployment();
deployment.run().catch(console.error);