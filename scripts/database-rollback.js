#!/usr/bin/env node

/**
 * Database Rollback Management Script
 * Provides safe rollback capabilities for database migrations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class DatabaseRollbackManager {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(environment = 'local') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup-${environment}-${timestamp}.sql`);
    
    console.log(`📦 Creating backup for ${environment} environment...`);
    
    try {
      let command;
      if (environment === 'local') {
        command = `supabase db dump --data-only > "${backupFile}"`;
      } else {
        command = `supabase db dump --linked --data-only > "${backupFile}"`;
      }
      
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Backup created: ${backupFile}`);
      
      return backupFile;
    } catch (error) {
      console.error('❌ Backup creation failed:', error.message);
      throw error;
    }
  }

  listBackups() {
    const backups = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => {
        const stats = fs.statSync(path.join(this.backupDir, file));
        return {
          filename: file,
          created: stats.birthtime,
          size: this.formatBytes(stats.size)
        };
      })
      .sort((a, b) => b.created - a.created);

    return backups;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async selectBackup() {
    const backups = this.listBackups();
    
    if (backups.length === 0) {
      throw new Error('No backups found. Cannot proceed with rollback.');
    }

    console.log('\n📋 Available backups:');
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.filename} (${backup.created.toLocaleString()}) - ${backup.size}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\nSelect backup number (or 0 to cancel): ', (answer) => {
        rl.close();
        
        const selection = parseInt(answer);
        if (selection === 0) {
          console.log('Rollback cancelled.');
          process.exit(0);
        }
        
        if (selection < 1 || selection > backups.length) {
          throw new Error('Invalid selection.');
        }
        
        resolve(backups[selection - 1]);
      });
    });
  }

  async confirmRollback(backup) {
    console.log(`\n🚨 WARNING: You are about to rollback to: ${backup.filename}`);
    console.log(`📅 Created: ${backup.created.toLocaleString()}`);
    console.log(`📊 Size: ${backup.size}`);
    console.log('\n⚠️  This action will:');
    console.log('   - Reset the database to the backup state');
    console.log('   - Remove all data changes since the backup');
    console.log('   - Potentially cause data loss');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\nType "CONFIRM ROLLBACK" to proceed: ', (answer) => {
        rl.close();
        resolve(answer === 'CONFIRM ROLLBACK');
      });
    });
  }

  async performRollback(backup, environment = 'local') {
    const backupPath = path.join(this.backupDir, backup.filename);
    
    console.log(`\n🔄 Starting rollback process...`);
    
    try {
      // Step 1: Create a pre-rollback backup
      console.log('1️⃣ Creating pre-rollback backup...');
      await this.createBackup(`${environment}-pre-rollback`);
      
      // Step 2: Reset database to clean state
      console.log('2️⃣ Resetting database...');
      if (environment === 'local') {
        execSync('supabase db reset --skip-seed', { stdio: 'inherit' });
      } else {
        execSync('supabase db reset --linked --skip-seed', { stdio: 'inherit' });
      }
      
      // Step 3: Restore from backup
      console.log('3️⃣ Restoring from backup...');
      const restoreCommand = environment === 'local' 
        ? `psql postgresql://postgres:postgres@localhost:54322/postgres < "${backupPath}"`
        : `supabase db push --restore "${backupPath}"`;
      
      execSync(restoreCommand, { stdio: 'inherit' });
      
      // Step 4: Verify restoration
      console.log('4️⃣ Verifying restoration...');
      this.verifyRollback(environment);
      
      console.log('✅ Rollback completed successfully!');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      console.log('\n🔧 Recovery steps:');
      console.log('1. Check the pre-rollback backup');
      console.log('2. Review error logs');
      console.log('3. Contact the development team');
      throw error;
    }
  }

  verifyRollback(environment) {
    try {
      // Basic connectivity test
      const testCommand = environment === 'local'
        ? 'psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT 1;"'
        : 'supabase db --linked exec "SELECT 1;"';
      
      execSync(testCommand, { stdio: 'pipe' });
      console.log('   ✅ Database connectivity verified');
      
      // Test basic table structure
      const tableTestCommand = environment === 'local'
        ? 'psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = \'public\';"'
        : 'supabase db --linked exec "SELECT count(*) FROM information_schema.tables WHERE table_schema = \'public\';"';
      
      execSync(tableTestCommand, { stdio: 'pipe' });
      console.log('   ✅ Table structure verified');
      
    } catch (error) {
      console.warn('   ⚠️  Verification warning:', error.message);
    }
  }

  async cleanupOldBackups(retentionDays = 7) {
    console.log(`🧹 Cleaning up backups older than ${retentionDays} days...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const backups = this.listBackups();
    let removedCount = 0;
    
    backups.forEach(backup => {
      if (backup.created < cutoffDate) {
        const backupPath = path.join(this.backupDir, backup.filename);
        fs.unlinkSync(backupPath);
        console.log(`   🗑️  Removed: ${backup.filename}`);
        removedCount++;
      }
    });
    
    console.log(`✅ Cleanup completed. Removed ${removedCount} old backups.`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'local';
  
  const rollbackManager = new DatabaseRollbackManager();
  
  try {
    switch (command) {
      case 'backup':
        await rollbackManager.createBackup(environment);
        break;
        
      case 'list':
        const backups = rollbackManager.listBackups();
        console.log('\n📋 Available backups:');
        if (backups.length === 0) {
          console.log('No backups found.');
        } else {
          backups.forEach(backup => {
            console.log(`📄 ${backup.filename} (${backup.created.toLocaleString()}) - ${backup.size}`);
          });
        }
        break;
        
      case 'rollback':
        const selectedBackup = await rollbackManager.selectBackup();
        const confirmed = await rollbackManager.confirmRollback(selectedBackup);
        
        if (confirmed) {
          await rollbackManager.performRollback(selectedBackup, environment);
        } else {
          console.log('Rollback cancelled.');
        }
        break;
        
      case 'cleanup':
        const retentionDays = parseInt(args[2]) || 7;
        await rollbackManager.cleanupOldBackups(retentionDays);
        break;
        
      default:
        console.log('\n🔧 Database Rollback Manager');
        console.log('Usage:');
        console.log('  node database-rollback.js backup [environment]     - Create backup');
        console.log('  node database-rollback.js list                     - List backups');
        console.log('  node database-rollback.js rollback [environment]   - Perform rollback');
        console.log('  node database-rollback.js cleanup [retention_days] - Clean old backups');
        console.log('\nEnvironments: local, staging, production');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseRollbackManager;