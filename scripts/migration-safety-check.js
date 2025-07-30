#!/usr/bin/env node

/**
 * Migration Safety Check Script
 * Analyzes migration files for potentially destructive operations
 * and validates schema changes before deployment
 */

const fs = require('fs');
const path = require('path');

class MigrationSafetyChecker {
  constructor() {
    this.destructivePatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+COLUMN/i,
      /DROP\s+INDEX/i,
      /DROP\s+CONSTRAINT/i,
      /TRUNCATE/i,
      /DELETE\s+FROM.*WHERE/i,
      /ALTER\s+TABLE.*DROP/i,
      /ALTER\s+COLUMN.*TYPE/i // Type changes can be destructive
    ];
    
    this.warningPatterns = [
      /ALTER\s+TABLE.*ADD\s+COLUMN.*NOT\s+NULL/i, // Adding NOT NULL without default
      /CREATE\s+INDEX.*CONCURRENTLY/i, // Should use CONCURRENTLY in production
      /DISABLE\s+TRIGGER/i,
      /DISABLE\s+ROW\s+LEVEL\s+SECURITY/i
    ];

    this.tenantIsolationPatterns = [
      /CREATE\s+POLICY/i,
      /ALTER\s+POLICY/i,
      /ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
      /tenant_id/i
    ];
  }

  analyzeMigrationFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);
    
    const analysis = {
      filename,
      destructive: [],
      warnings: [],
      tenantSafety: [],
      safe: true
    };

    // Check for destructive patterns
    this.destructivePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        analysis.destructive.push({
          pattern: pattern.source,
          matches: matches
        });
        analysis.safe = false;
      }
    });

    // Check for warning patterns
    this.warningPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        analysis.warnings.push({
          pattern: pattern.source,
          matches: matches
        });
      }
    });

    // Check tenant isolation
    this.tenantIsolationPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        analysis.tenantSafety.push({
          pattern: pattern.source,
          matches: matches
        });
      }
    });

    return analysis;
  }

  checkAllMigrations(migrationsDir) {
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const results = {
      totalFiles: migrationFiles.length,
      safeFiles: 0,
      destructiveFiles: 0,
      warningFiles: 0,
      analyses: []
    };

    migrationFiles.forEach(file => {
      const filePath = path.join(migrationsDir, file);
      const analysis = this.analyzeMigrationFile(filePath);
      
      results.analyses.push(analysis);
      
      if (analysis.safe) {
        results.safeFiles++;
      } else {
        results.destructiveFiles++;
      }
      
      if (analysis.warnings.length > 0) {
        results.warningFiles++;
      }
    });

    return results;
  }

  generateReport(results) {
    console.log('\n🔍 Migration Safety Analysis Report');
    console.log('=====================================');
    console.log(`Total migrations: ${results.totalFiles}`);
    console.log(`Safe migrations: ${results.safeFiles}`);
    console.log(`Destructive migrations: ${results.destructiveFiles}`);
    console.log(`Migrations with warnings: ${results.warningFiles}`);

    if (results.destructiveFiles > 0) {
      console.log('\n🚨 DESTRUCTIVE MIGRATIONS DETECTED:');
      results.analyses
        .filter(a => !a.safe)
        .forEach(analysis => {
          console.log(`\n📄 ${analysis.filename}`);
          analysis.destructive.forEach(d => {
            console.log(`  ❌ ${d.pattern}: ${d.matches.join(', ')}`);
          });
        });
    }

    if (results.warningFiles > 0) {
      console.log('\n⚠️  MIGRATIONS WITH WARNINGS:');
      results.analyses
        .filter(a => a.warnings.length > 0)
        .forEach(analysis => {
          console.log(`\n📄 ${analysis.filename}`);
          analysis.warnings.forEach(w => {
            console.log(`  ⚠️  ${w.pattern}: ${w.matches.join(', ')}`);
          });
        });
    }

    // Tenant safety report
    const tenantSafeFiles = results.analyses.filter(a => a.tenantSafety.length > 0);
    if (tenantSafeFiles.length > 0) {
      console.log('\n🏢 TENANT ISOLATION CHANGES:');
      tenantSafeFiles.forEach(analysis => {
        console.log(`\n📄 ${analysis.filename}`);
        analysis.tenantSafety.forEach(t => {
          console.log(`  🔐 ${t.pattern}: ${t.matches.join(', ')}`);
        });
      });
    }

    return results.destructiveFiles === 0;
  }

  generatePreDeploymentChecklist(results) {
    console.log('\n📋 Pre-Deployment Checklist');
    console.log('===========================');
    
    const checklist = [
      '✅ Database backup created',
      '✅ Migration rollback scripts prepared',
      '✅ Downtime window scheduled (if required)',
      '✅ Team notifications sent',
      '✅ Monitoring alerts configured'
    ];

    if (results.destructiveFiles > 0) {
      checklist.push(
        '🚨 Manual review completed for destructive changes',
        '🚨 Stakeholder approval obtained',
        '🚨 Data migration scripts tested'
      );
    }

    checklist.forEach(item => console.log(item));
  }
}

// Main execution
async function main() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const checker = new MigrationSafetyChecker();
  const results = checker.checkAllMigrations(migrationsDir);
  const isSafe = checker.generateReport(results);
  
  checker.generatePreDeploymentChecklist(results);

  // Exit with appropriate code
  if (!isSafe && process.env.CI) {
    console.log('\n❌ Destructive migrations detected. Manual review required.');
    process.exit(1);
  } else if (isSafe) {
    console.log('\n✅ All migrations appear safe for automated deployment.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Manual review recommended before deployment.');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MigrationSafetyChecker;