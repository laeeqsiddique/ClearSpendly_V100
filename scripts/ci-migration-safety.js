#!/usr/bin/env node

/**
 * CI/CD Migration Safety Script
 * Enhanced migration safety checker specifically designed for CI/CD workflows
 * Provides automated safety validation, risk assessment, and deployment gates
 */

const fs = require('fs');
const path = require('path');
const MigrationSafetyChecker = require('./migration-safety-check');

class CIMigrationSafetyChecker extends MigrationSafetyChecker {
  constructor() {
    super();
    
    // Enhanced patterns for CI/CD environments
    this.criticalPatterns = [
      /DROP\s+DATABASE/i,
      /DROP\s+SCHEMA/i,
      /TRUNCATE\s+TABLE/i,
      /DELETE\s+FROM\s+\w+\s*;/i, // DELETE without WHERE clause
      /UPDATE\s+\w+\s+SET.*WHERE.*1\s*=\s*1/i // Dangerous UPDATE
    ];

    this.productionBlockers = [
      /DISABLE\s+TRIGGER\s+ALL/i,
      /SET\s+session_replication_role\s*=\s*replica/i,  
      /ALTER\s+TABLE.*DISABLE\s+TRIGGER/i,
      /DISABLE\s+ROW\s+LEVEL\s+SECURITY/i
    ];

    this.performanceRisks = [
      /CREATE\s+INDEX(?!\s+CONCURRENTLY)/i, // Index without CONCURRENTLY
      /ALTER\s+TABLE.*ADD\s+COLUMN.*NOT\s+NULL/i, // Blocking column addition
      /ALTER\s+TABLE.*ALTER\s+COLUMN.*TYPE/i, // Type changes
      /CREATE\s+UNIQUE\s+INDEX(?!\s+CONCURRENTLY)/i
    ];
  }

  assessMigrationRisk(content, filename) {
    const riskFactors = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      score: 0
    };

    // Critical risk patterns (Score: 100 each)
    this.criticalPatterns.forEach(pattern => {
      const matches = content.match(new RegExp(pattern, 'gi'));
      if (matches) {
        riskFactors.critical.push({
          pattern: pattern.source,
          matches: matches,
          file: filename
        });
        riskFactors.score += 100;
      }
    });

    // Production blocker patterns (Score: 50 each)
    this.productionBlockers.forEach(pattern => {
      const matches = content.match(new RegExp(pattern, 'gi'));
      if (matches) {
        riskFactors.high.push({
          pattern: pattern.source,
          matches: matches,
          file: filename,
          reason: 'Production safety blocker'
        });
        riskFactors.score += 50;
      }
    });

    // Performance risk patterns (Score: 25 each)
    this.performanceRisks.forEach(pattern => {
      const matches = content.match(new RegExp(pattern, 'gi'));
      if (matches) {
        riskFactors.medium.push({
          pattern: pattern.source,
          matches: matches,
          file: filename,
          reason: 'Performance impact risk'
        });
        riskFactors.score += 25;
      }
    });

    // Check for large batch operations
    const batchOperations = content.match(/INSERT\s+INTO.*VALUES.*,.*,/gi);
    if (batchOperations && batchOperations.length > 100) {
      riskFactors.medium.push({
        pattern: 'Large batch INSERT operations',
        matches: [`${batchOperations.length} batch operations`],
        file: filename,
        reason: 'Large data operations may cause locks'
      });
      riskFactors.score += 15;
    }

    return riskFactors;
  }

  analyzeEnvironmentReadiness(environment = 'production') {
    const requirements = {
      staging: {
        backupRequired: true,
        approvalRequired: false,
        downtimeWindow: false,
        rollbackPlan: true
      },
      production: {
        backupRequired: true,
        approvalRequired: true,
        downtimeWindow: true,
        rollbackPlan: true,
        loadTestRequired: true
      }
    };

    return requirements[environment] || requirements.production;
  }

  generateCIReport(results, environment = 'production') {
    const report = {
      timestamp: new Date().toISOString(),
      environment,
      summary: {
        totalMigrations: results.totalFiles,
        riskScore: 0,
        riskLevel: 'LOW',
        deploymentAllowed: true,
        requiresApproval: false,
        estimatedDowntime: '< 1 minute'
      },
      risksDetected: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      recommendations: [],
      requirements: this.analyzeEnvironmentReadiness(environment)
    };

    // Analyze each migration file
    results.analyses.forEach(analysis => {
      const filePath = path.join('supabase/migrations', analysis.filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const riskAssessment = this.assessMigrationRisk(content, analysis.filename);
        
        report.summary.riskScore += riskAssessment.score;
        
        // Aggregate risks
        report.risksDetected.critical.push(...riskAssessment.critical);
        report.risksDetected.high.push(...riskAssessment.high);
        report.risksDetected.medium.push(...riskAssessment.medium);
        report.risksDetected.low.push(...riskAssessment.low);
      }
    });

    // Determine overall risk level and deployment decision
    if (report.risksDetected.critical.length > 0) {
      report.summary.riskLevel = 'CRITICAL';
      report.summary.deploymentAllowed = false;
      report.summary.requiresApproval = true;
      report.summary.estimatedDowntime = '5-30 minutes';
      report.recommendations.push('CRITICAL: Manual review required before deployment');
      report.recommendations.push('Consider breaking migration into smaller, safer chunks');
      report.recommendations.push('Schedule maintenance window for deployment');
    } else if (report.risksDetected.high.length > 0 || report.summary.riskScore > 100) {
      report.summary.riskLevel = 'HIGH';
      report.summary.requiresApproval = true;
      report.summary.estimatedDowntime = '2-10 minutes';
      report.recommendations.push('HIGH RISK: Senior engineer approval required');
      report.recommendations.push('Ensure database backup is current');
      report.recommendations.push('Monitor deployment closely');
    } else if (report.risksDetected.medium.length > 0 || report.summary.riskScore > 25) {
      report.summary.riskLevel = 'MEDIUM';
      report.summary.estimatedDowntime = '1-5 minutes';
      report.recommendations.push('MEDIUM RISK: Review recommended');
      report.recommendations.push('Consider off-peak deployment');
    }

    // Environment-specific requirements
    if (environment === 'production') {
      if (report.summary.riskLevel === 'HIGH' || report.summary.riskLevel === 'CRITICAL') {
        report.summary.deploymentAllowed = false;
      }
      
      if (report.summary.riskScore > 50) {
        report.recommendations.push('Schedule deployment during maintenance window');
        report.recommendations.push('Notify stakeholders of potential downtime');
      }
    }

    return report;
  }

  outputCIResults(report) {
    console.log('\n🤖 CI/CD Migration Safety Report');
    console.log('================================');
    console.log(`Environment: ${report.environment.toUpperCase()}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Risk Level: ${report.summary.riskLevel}`);
    console.log(`Risk Score: ${report.summary.riskScore}`);
    console.log(`Deployment Allowed: ${report.summary.deploymentAllowed ? '✅ YES' : '❌ NO'}`);
    console.log(`Approval Required: ${report.summary.requiresApproval ? '🔐 YES' : '🚀 NO'}`);
    console.log(`Estimated Downtime: ${report.summary.estimatedDowntime}`);

    // Critical issues
    if (report.risksDetected.critical.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      report.risksDetected.critical.forEach(risk => {
        console.log(`  ❌ ${risk.file}: ${risk.pattern}`);
        console.log(`     ${risk.matches.join(', ')}`);
      });
    }

    // High-risk issues
    if (report.risksDetected.high.length > 0) {
      console.log('\n⚠️  HIGH RISK ISSUES:');
      report.risksDetected.high.forEach(risk => {
        console.log(`  🔥 ${risk.file}: ${risk.reason}`);
        console.log(`     ${risk.matches.join(', ')}`);
      });
    }

    // Medium-risk issues
    if (report.risksDetected.medium.length > 0) {
      console.log('\n⚡ MEDIUM RISK ISSUES:');
      report.risksDetected.medium.forEach(risk => {
        console.log(`  ⚠️  ${risk.file}: ${risk.reason}`);
        console.log(`     ${risk.matches.join(', ')}`);
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    // Requirements checklist
    console.log('\n📋 DEPLOYMENT REQUIREMENTS:');
    Object.entries(report.requirements).forEach(([req, required]) => {
      const status = required ? '🔲 Required' : '✅ Optional';
      console.log(`  ${status} ${req.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    });

    // GitHub Actions outputs
    if (process.env.GITHUB_ACTIONS) {
      console.log('\n🔧 Setting GitHub Actions outputs...');
      console.log(`::set-output name=deployment_allowed::${report.summary.deploymentAllowed}`);
      console.log(`::set-output name=requires_approval::${report.summary.requiresApproval}`);
      console.log(`::set-output name=risk_level::${report.summary.riskLevel}`);
      console.log(`::set-output name=risk_score::${report.summary.riskScore}`);
      console.log(`::set-output name=estimated_downtime::${report.summary.estimatedDowntime}`);
    }

    return report;
  }

  generateArtifacts(report, outputDir = './migration-reports') {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save detailed JSON report
    const reportFile = path.join(outputDir, `migration-safety-${timestamp}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Generate markdown summary
    const markdownFile = path.join(outputDir, `migration-summary-${timestamp}.md`);
    const markdown = this.generateMarkdownSummary(report);
    fs.writeFileSync(markdownFile, markdown);

    console.log(`\n📄 Reports generated:`);
    console.log(`  JSON: ${reportFile}`);
    console.log(`  Markdown: ${markdownFile}`);

    return { reportFile, markdownFile };
  }

  generateMarkdownSummary(report) {
    const riskEmoji = {
      'LOW': '🟢',
      'MEDIUM': '🟡', 
      'HIGH': '🟠',
      'CRITICAL': '🔴'
    };

    return `# Migration Safety Report

## Summary
- **Environment**: ${report.environment.toUpperCase()}
- **Risk Level**: ${riskEmoji[report.summary.riskLevel]} ${report.summary.riskLevel}
- **Risk Score**: ${report.summary.riskScore}
- **Deployment Allowed**: ${report.summary.deploymentAllowed ? '✅' : '❌'}
- **Approval Required**: ${report.summary.requiresApproval ? '🔐' : '🚀'}
- **Estimated Downtime**: ${report.summary.estimatedDowntime}

## Risk Analysis

${report.risksDetected.critical.length > 0 ? `### 🚨 Critical Issues
${report.risksDetected.critical.map(r => `- **${r.file}**: ${r.pattern}`).join('\n')}
` : ''}

${report.risksDetected.high.length > 0 ? `### ⚠️ High Risk Issues  
${report.risksDetected.high.map(r => `- **${r.file}**: ${r.reason}`).join('\n')}
` : ''}

${report.risksDetected.medium.length > 0 ? `### ⚡ Medium Risk Issues
${report.risksDetected.medium.map(r => `- **${r.file}**: ${r.reason}`).join('\n')}
` : ''}

## Recommendations
${report.recommendations.map(r => `- ${r}`).join('\n')}

## Deployment Requirements
${Object.entries(report.requirements).map(([req, required]) => 
  `- ${required ? '🔲' : '✅'} ${req.replace(/([A-Z])/g, ' $1').toLowerCase()}`
).join('\n')}

---
*Generated at: ${report.timestamp}*
`;
  }
}

// Main execution for CI/CD
async function main() {
  const environment = process.env.DEPLOYMENT_ENVIRONMENT || process.argv[2] || 'production';
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const checker = new CIMigrationSafetyChecker();
  
  // Run basic migration analysis
  const results = checker.checkAllMigrations(migrationsDir);
  
  // Generate CI-specific report
  const report = checker.generateCIReport(results, environment);
  
  // Output results
  checker.outputCIResults(report);
  
  // Generate artifacts for CI/CD
  if (process.env.CI || process.argv.includes('--generate-artifacts')) {
    checker.generateArtifacts(report);
  }

  // Exit with appropriate code for CI/CD
  if (!report.summary.deploymentAllowed) {
    console.log('\n❌ Deployment blocked due to critical safety concerns.');
    process.exit(1);
  } else if (report.summary.requiresApproval && !process.env.MANUAL_APPROVAL_OVERRIDE) {
    console.log('\n🔐 Manual approval required before deployment can proceed.');
    process.exit(2); // Special exit code for approval gate
  } else {
    console.log('\n✅ Migration safety validation passed. Deployment approved.');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ CI Migration Safety Check failed:', error.message);
    process.exit(1);
  });
}

module.exports = CIMigrationSafetyChecker;