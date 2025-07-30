#!/usr/bin/env node

/**
 * CI/CD Database Rollback Script
 * Automated rollback system for CI/CD environments with safety checks and monitoring
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class CIDatabaseRollback {
  constructor(environment = 'staging') {
    this.environment = environment;
    this.projectId = this.getProjectId(environment);
    this.dbPassword = this.getDbPassword(environment);
    this.backupPrefix = `${environment}_backup`;
    
    // Validate environment configuration
    this.validateEnvironment();
  }

  getProjectId(env) {
    const envVar = `SUPABASE_${env.toUpperCase()}_PROJECT_ID`;
    const projectId = process.env[envVar];
    
    if (!projectId) {
      throw new Error(`Missing environment variable: ${envVar}`);
    }
    
    return projectId;
  }

  getDbPassword(env) {
    const envVar = `SUPABASE_${env.toUpperCase()}_DB_PASSWORD`;
    const password = process.env[envVar];
    
    if (!password) {
      throw new Error(`Missing environment variable: ${envVar}`);
    }
    
    return password;
  }

  validateEnvironment() {
    console.log(`🔍 Validating ${this.environment} environment configuration...`);
    
    // Check required environment variables
    const requiredVars = [
      'SUPABASE_ACCESS_TOKEN',
      `SUPABASE_${this.environment.toUpperCase()}_PROJECT_ID`,
      `SUPABASE_${this.environment.toUpperCase()}_DB_PASSWORD`
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate Supabase CLI installation
    try {
      execSync('supabase --version', { stdio: 'pipe' });
      console.log('✅ Supabase CLI validated');
    } catch (error) {
      throw new Error('Supabase CLI not found. Please install it first.');
    }

    console.log(`✅ Environment configuration validated for ${this.environment}`);
  }

  async createEmergencyBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `emergency_backup_${this.environment}_${timestamp}.sql`;
    
    console.log(`📦 Creating emergency backup: ${backupFile}`);
    
    try {
      const command = `supabase db dump --project-id ${this.projectId} --password "${this.dbPassword}"`;
      const backupContent = execSync(command, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }); // 100MB buffer
      
      fs.writeFileSync(backupFile, backupContent);
      
      const stats = fs.statSync(backupFile);
      console.log(`✅ Emergency backup created: ${backupFile} (${this.formatBytes(stats.size)})`);
      
      return {
        filename: backupFile,
        size: stats.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Emergency backup failed:', error.message);
      throw error;
    }
  }

  async findBackupArtifact(runId) {
    console.log(`🔍 Looking for backup artifact from run ID: ${runId}`);
    
    // In GitHub Actions, artifacts would be downloaded to the runner
    // This function assumes the backup was downloaded as part of the workflow
    const possiblePaths = [
      `./${this.backupPrefix}_${runId}.sql`,
      `./backups/${this.backupPrefix}_${runId}.sql`,
      `./${this.environment}_backup_*.sql`
    ];

    for (const pathPattern of possiblePaths) {
      if (pathPattern.includes('*')) {
        try {
          const files = execSync(`ls ${pathPattern} | head -1`, { encoding: 'utf8' }).trim();
          if (files) {
            console.log(`✅ Found backup file: ${files}`);
            return files;
          }
        } catch (error) {
          // Pattern didn't match any files
        }
      } else if (fs.existsSync(pathPattern)) {
        console.log(`✅ Found backup file: ${pathPattern}`);
        return pathPattern;
      }
    }

    throw new Error(`No backup artifact found for run ID: ${runId}`);
  }

  async validateBackupIntegrity(backupFile) {
    console.log(`🔍 Validating backup integrity: ${backupFile}`);
    
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const stats = fs.statSync(backupFile);
    
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    // Basic SQL syntax validation
    const content = fs.readFileSync(backupFile, 'utf8');
    
    // Check for essential SQL backup markers
    const requiredMarkers = [
      /-- PostgreSQL database dump/i,
      /CREATE\s+TABLE/i,
    ];

    const foundMarkers = requiredMarkers.filter(marker => marker.test(content));
    
    if (foundMarkers.length === 0) {
      throw new Error('Backup file does not appear to be a valid PostgreSQL dump');
    }

    console.log(`✅ Backup validation passed: ${this.formatBytes(stats.size)}`);
    return true;
  }

  async executeRollback(backupFile) {
    console.log(`🔄 Starting rollback procedure for ${this.environment}...`);
    
    try {
      // Step 1: Create emergency backup before rollback
      console.log('1️⃣ Creating emergency backup before rollback...');
      const emergencyBackup = await this.createEmergencyBackup();
      
      // Step 2: Validate backup file
      console.log('2️⃣ Validating backup file...');
      await this.validateBackupIntegrity(backupFile);
      
      // Step 3: Link to Supabase project
      console.log('3️⃣ Connecting to Supabase project...');
      execSync(`supabase link --project-ref ${this.projectId} --password "${this.dbPassword}"`, {
        stdio: 'inherit'
      });
      
      // Step 4: Check current database state
      console.log('4️⃣ Checking current database state...');
      await this.checkDatabaseHealth('pre-rollback');
      
      // Step 5: Execute rollback
      console.log('5️⃣ Executing database rollback...');
      
      // For Supabase, we need to apply the backup as a migration reset
      // This is a simplified approach - in production you might want more sophisticated rollback
      const rollbackCommand = `psql "${this.getDatabaseUrl()}" < "${backupFile}"`;
      
      execSync(rollbackCommand, {
        stdio: 'inherit',
        timeout: 300000 // 5 minute timeout
      });
      
      // Step 6: Verify rollback
      console.log('6️⃣ Verifying rollback completion...');
      await this.checkDatabaseHealth('post-rollback');
      
      // Step 7: Run basic functionality tests
      console.log('7️⃣ Running post-rollback tests...');
      await this.runPostRollbackTests();
      
      console.log('✅ Rollback completed successfully!');
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        backupFile,
        emergencyBackup: emergencyBackup.filename,
        environment: this.environment
      };
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      
      // Log the failure for debugging
      const errorLog = {
        timestamp: new Date().toISOString(),
        environment: this.environment,
        backupFile,
        error: error.message,
        stack: error.stack
      };
      
      fs.writeFileSync(`rollback_error_${Date.now()}.json`, JSON.stringify(errorLog, null, 2));
      
      throw error;
    }
  }

  getDatabaseUrl() {
    // This would construct the appropriate database URL for your Supabase project
    // You might need to adjust this based on your specific setup
    return `postgresql://postgres:${this.dbPassword}@db.${this.projectId}.supabase.co:5432/postgres`;
  }

  async checkDatabaseHealth(stage) {
    console.log(`   🏥 Running database health check (${stage})...`);
    
    try {
      // Basic connectivity test
      const testQuery = 'SELECT version(), current_database(), current_user;';
      const result = execSync(
        `psql "${this.getDatabaseUrl()}" -c "${testQuery}"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      console.log(`   ✅ Database connectivity verified (${stage})`);
      
      // Check table count
      const tableCountQuery = `SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';`;
      const tableResult = execSync(
        `psql "${this.getDatabaseUrl()}" -c "${tableCountQuery}" -t`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      const tableCount = parseInt(tableResult.trim());
      console.log(`   📊 Public tables: ${tableCount}`);
      
      if (tableCount === 0) {
        console.warn(`   ⚠️  Warning: No public tables found (${stage})`);
      }
      
      return { connectivity: true, tableCount };
      
    } catch (error) {
      console.error(`   ❌ Database health check failed (${stage}):`, error.message);
      throw error;
    }
  }

  async runPostRollbackTests() {
    console.log('   🧪 Running post-rollback functionality tests...');
    
    try {
      // Test 1: Basic table queries
      const basicTestQuery = `
        SELECT 
          schemaname,
          tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        LIMIT 5;
      `;
      
      execSync(
        `psql "${this.getDatabaseUrl()}" -c "${basicTestQuery}"`,
        { stdio: 'pipe' }
      );
      
      console.log('   ✅ Basic table queries working');
      
      // Test 2: RLS policies (if applicable)
      const rlsTestQuery = `
        SELECT COUNT(*) as policy_count 
        FROM pg_policies 
        WHERE schemaname = 'public';
      `;
      
      const rlsResult = execSync(
        `psql "${this.getDatabaseUrl()}" -c "${rlsTestQuery}" -t`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      const policyCount = parseInt(rlsResult.trim());
      console.log(`   🔐 RLS policies active: ${policyCount}`);
      
      // Test 3: Functions and triggers
      const functionTestQuery = `
        SELECT COUNT(*) as function_count 
        FROM information_schema.routines 
        WHERE routine_schema = 'public';
      `;
      
      const functionResult = execSync(
        `psql "${this.getDatabaseUrl()}" -c "${functionTestQuery}" -t`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      const functionCount = parseInt(functionResult.trim());
      console.log(`   ⚙️  Functions available: ${functionCount}`);
      
      console.log('   ✅ Post-rollback tests passed');
      
    } catch (error) {
      console.error('   ❌ Post-rollback tests failed:', error.message);
      throw error;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateRollbackReport(result) {
    const report = {
      rollback: result,
      environment: this.environment,
      ciContext: {
        runId: process.env.GITHUB_RUN_ID,
        runNumber: process.env.GITHUB_RUN_NUMBER,
        actor: process.env.GITHUB_ACTOR,
        workflow: process.env.GITHUB_WORKFLOW,
        repository: process.env.GITHUB_REPOSITORY,
        ref: process.env.GITHUB_REF,
        sha: process.env.GITHUB_SHA
      },
      timestamp: new Date().toISOString()
    };

    const reportFile = `rollback_report_${this.environment}_${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📊 Rollback report generated: ${reportFile}`);
    
    // GitHub Actions output
    if (process.env.GITHUB_ACTIONS) {
      console.log('::set-output name=rollback_success::true');
      console.log(`::set-output name=rollback_timestamp::${result.timestamp}`);
      console.log(`::set-output name=backup_file::${result.backupFile}`);
      console.log(`::set-output name=emergency_backup::${result.emergencyBackup}`);
    }

    return reportFile;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  const environment = process.argv[3] || process.env.DEPLOYMENT_ENVIRONMENT || 'staging';
  const runId = process.argv[4] || process.env.GITHUB_RUN_ID;

  try {
    const rollbackManager = new CIDatabaseRollback(environment);

    switch (command) {
      case 'execute':
        if (!runId) {
          throw new Error('Run ID required for rollback execution');
        }
        
        console.log(`🚨 EXECUTING EMERGENCY ROLLBACK FOR ${environment.toUpperCase()}`);
        console.log(`Run ID: ${runId}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        
        // Find the backup artifact
        const backupFile = await rollbackManager.findBackupArtifact(runId);
        
        // Execute the rollback
        const result = await rollbackManager.executeRollback(backupFile);
        
        // Generate report
        rollbackManager.generateRollbackReport(result);
        
        console.log('🎉 Emergency rollback completed successfully!');
        break;

      case 'validate':
        const backupToValidate = process.argv[4];
        if (!backupToValidate) {
          throw new Error('Backup file path required for validation');
        }
        
        await rollbackManager.validateBackupIntegrity(backupToValidate);
        console.log('✅ Backup validation completed');
        break;

      case 'health-check':
        await rollbackManager.checkDatabaseHealth('manual');
        console.log('✅ Database health check completed');
        break;

      default:
        console.log('\n🔧 CI Database Rollback Manager');
        console.log('Usage:');
        console.log('  node ci-database-rollback.js execute <environment> [run_id]  - Execute rollback');
        console.log('  node ci-database-rollback.js validate <environment> <backup_file> - Validate backup');
        console.log('  node ci-database-rollback.js health-check <environment>     - Check database health');
        console.log('\nEnvironments: staging, production');
        console.log('\nEnvironment variables required:');
        console.log('  SUPABASE_ACCESS_TOKEN');
        console.log('  SUPABASE_<ENV>_PROJECT_ID');
        console.log('  SUPABASE_<ENV>_DB_PASSWORD');
        break;
    }

  } catch (error) {
    console.error('❌ CI Rollback Error:', error.message);
    
    // Create error report for debugging
    const errorReport = {
      error: error.message,
      stack: error.stack,
      environment,
      command,
      timestamp: new Date().toISOString(),
      ciContext: {
        runId: process.env.GITHUB_RUN_ID,
        runNumber: process.env.GITHUB_RUN_NUMBER,
        actor: process.env.GITHUB_ACTOR
      }
    };
    
    fs.writeFileSync(`rollback_error_${Date.now()}.json`, JSON.stringify(errorReport, null, 2));
    
    if (process.env.GITHUB_ACTIONS) {
      console.log('::set-output name=rollback_success::false');
      console.log(`::set-output name=error_message::${error.message}`);
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CIDatabaseRollback;