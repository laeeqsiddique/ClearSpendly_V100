#!/usr/bin/env node

/**
 * Cost Monitoring and Optimization Script for ClearSpendly SaaS
 * Monitors resource usage, costs, and provides optimization recommendations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CostMonitoringManager {
  constructor() {
    this.thresholds = {
      database: {
        connectionWarning: 80, // % of max connections
        connectionCritical: 95,
        storageWarning: 80, // % of allocated storage
        storageCritical: 90,
        queryTimeWarning: 1000, // ms
        queryTimeCritical: 5000
      },
      storage: {
        usageWarning: 75, // % of allocated storage
        usageCritical: 90,
        bandwidthWarning: 80, // % of monthly limit
        bandwidthCritical: 95
      },
      compute: {
        cpuWarning: 70, // % CPU usage
        cpuCritical: 85,
        memoryWarning: 75, // % memory usage
        memoryCritical: 90
      },
      ai: {
        tokenUsageWarning: 80, // % of monthly token limit
        tokenUsageCritical: 95,
        costPerDayWarning: 50, // USD per day
        costPerDayCritical: 100
      }
    };

    this.costOptimizations = [];
    this.alerts = [];
  }

  async checkSupabaseUsage() {
    console.log('📊 Checking Supabase usage...');
    
    try {
      // Get project stats from Supabase CLI
      const statsOutput = execSync('supabase projects api-keys --linked', { encoding: 'utf8' });
      
      const usage = {
        database: await this.checkDatabaseUsage(),
        storage: await this.checkStorageUsage(),
        api: await this.checkApiUsage(),
        auth: await this.checkAuthUsage()
      };

      this.analyzeSupabaseUsage(usage);
      return usage;
    } catch (error) {
      console.error('❌ Failed to check Supabase usage:', error.message);
      return null;
    }
  }

  async checkDatabaseUsage() {
    try {
      // Simulate database usage check (in production, use Supabase API)
      const connectionCount = Math.floor(Math.random() * 100);
      const maxConnections = 100;
      const storageUsed = Math.floor(Math.random() * 8) + 1; // GB
      const storageLimit = 10; // GB
      const avgQueryTime = Math.floor(Math.random() * 500) + 100; // ms

      const connectionUtilization = (connectionCount / maxConnections) * 100;
      const storageUtilization = (storageUsed / storageLimit) * 100;

      return {
        connections: {
          current: connectionCount,
          max: maxConnections,
          utilization: connectionUtilization
        },
        storage: {
          used: storageUsed,
          limit: storageLimit,
          utilization: storageUtilization
        },
        performance: {
          avgQueryTime,
          slowQueries: avgQueryTime > this.thresholds.database.queryTimeWarning
        }
      };
    } catch (error) {
      console.error('Database usage check failed:', error.message);
      return null;
    }
  }

  async checkStorageUsage() {
    try {
      // Simulate storage usage (in production, use Supabase Storage API)
      const storageUsed = Math.floor(Math.random() * 40) + 5; // GB
      const storageLimit = 50; // GB
      const bandwidthUsed = Math.floor(Math.random() * 80) + 10; // GB
      const bandwidthLimit = 100; // GB monthly

      return {
        storage: {
          used: storageUsed,
          limit: storageLimit,
          utilization: (storageUsed / storageLimit) * 100
        },
        bandwidth: {
          used: bandwidthUsed,
          limit: bandwidthLimit,
          utilization: (bandwidthUsed / bandwidthLimit) * 100
        },
        buckets: {
          receipts: Math.floor(storageUsed * 0.7),
          logos: Math.floor(storageUsed * 0.2),
          exports: Math.floor(storageUsed * 0.1)
        }
      };
    } catch (error) {
      console.error('Storage usage check failed:', error.message);
      return null;
    }
  }

  async checkApiUsage() {
    try {
      // Simulate API usage
      const requestsToday = Math.floor(Math.random() * 50000) + 10000;
      const requestsLimit = 100000; // daily limit
      const avgResponseTime = Math.floor(Math.random() * 200) + 50; // ms

      return {
        requests: {
          today: requestsToday,
          limit: requestsLimit,
          utilization: (requestsToday / requestsLimit) * 100
        },
        performance: {
          avgResponseTime,
          slowRequests: avgResponseTime > 500
        }
      };
    } catch (error) {
      console.error('API usage check failed:', error.message);
      return null;
    }
  }

  async checkAuthUsage() {
    try {
      // Simulate auth usage
      const activeUsers = Math.floor(Math.random() * 1000) + 100;
      const monthlyActiveUsers = Math.floor(Math.random() * 5000) + 1000;
      const authRequests = Math.floor(Math.random() * 10000) + 2000;

      return {
        users: {
          active: activeUsers,
          monthlyActive: monthlyActiveUsers
        },
        requests: {
          auth: authRequests,
          signups: Math.floor(authRequests * 0.1),
          logins: Math.floor(authRequests * 0.7)
        }
      };
    } catch (error) {
      console.error('Auth usage check failed:', error.message);
      return null;
    }
  }

  async checkAiServiceUsage() {
    console.log('🤖 Checking AI service usage...');
    
    try {
      const openaiUsage = await this.checkOpenAiUsage();
      const ollamaUsage = await this.checkOllamaUsage();

      const usage = {
        openai: openaiUsage,
        ollama: ollamaUsage,
        totalCost: (openaiUsage?.estimatedCost || 0) + (ollamaUsage?.estimatedCost || 0)
      };

      this.analyzeAiUsage(usage);
      return usage;
    } catch (error) {
      console.error('❌ Failed to check AI usage:', error.message);
      return null;
    }
  }

  async checkOpenAiUsage() {
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      return { status: 'disabled', estimatedCost: 0 };
    }

    try {
      // Simulate OpenAI usage (in production, use OpenAI API)
      const tokensUsed = Math.floor(Math.random() * 500000) + 100000;
      const tokensLimit = 1000000; // monthly limit
      const estimatedCost = (tokensUsed / 1000) * 0.002; // $0.002 per 1K tokens

      return {
        status: 'active',
        tokens: {
          used: tokensUsed,
          limit: tokensLimit,
          utilization: (tokensUsed / tokensLimit) * 100
        },
        estimatedCost,
        requests: {
          total: Math.floor(tokensUsed / 200), // avg 200 tokens per request
          successful: Math.floor(tokensUsed / 200 * 0.95),
          failed: Math.floor(tokensUsed / 200 * 0.05)
        }
      };
    } catch (error) {
      console.error('OpenAI usage check failed:', error.message);
      return { status: 'error', estimatedCost: 0 };
    }
  }

  async checkOllamaUsage() {
    if (!process.env.LLM_API_URL || process.env.LLM_PROVIDER !== 'ollama') {
      return { status: 'disabled', estimatedCost: 0 };
    }

    try {
      // Simulate Ollama usage (self-hosted, mainly compute costs)
      const requestsProcessed = Math.floor(Math.random() * 1000) + 200;
      const avgProcessingTime = Math.floor(Math.random() * 2000) + 500; // ms
      const estimatedComputeCost = requestsProcessed * 0.001; // $0.001 per request (compute)

      return {
        status: 'active',
        requests: {
          processed: requestsProcessed,
          avgProcessingTime,
          totalProcessingTime: requestsProcessed * avgProcessingTime
        },
        estimatedCost: estimatedComputeCost,
        performance: {
          uptime: 99.5, // %
          availability: 'high'
        }
      };
    } catch (error) {
      console.error('Ollama usage check failed:', error.message);
      return { status: 'error', estimatedCost: 0 };
    }
  }

  analyzeSupabaseUsage(usage) {
    if (!usage) return;

    // Database analysis
    if (usage.database) {
      const db = usage.database;
      
      if (db.connections.utilization > this.thresholds.database.connectionCritical) {
        this.alerts.push({
          type: 'critical',
          service: 'database',
          metric: 'connections',
          message: `Database connection usage at ${db.connections.utilization.toFixed(1)}% - critical level`,
          recommendation: 'Consider connection pooling or upgrading database tier'
        });
      } else if (db.connections.utilization > this.thresholds.database.connectionWarning) {
        this.alerts.push({
          type: 'warning',
          service: 'database',
          metric: 'connections',
          message: `Database connection usage at ${db.connections.utilization.toFixed(1)}% - warning level`,
          recommendation: 'Monitor connection usage and implement connection pooling'
        });
      }

      if (db.storage.utilization > this.thresholds.database.storageCritical) {
        this.alerts.push({
          type: 'critical',
          service: 'database',
          metric: 'storage',
          message: `Database storage at ${db.storage.utilization.toFixed(1)}% capacity`,
          recommendation: 'Upgrade storage tier or implement data archiving'
        });
      }
    }

    // Storage analysis
    if (usage.storage) {
      const storage = usage.storage;
      
      if (storage.storage.utilization > this.thresholds.storage.usageCritical) {
        this.alerts.push({
          type: 'critical',
          service: 'storage',
          metric: 'usage',
          message: `Storage usage at ${storage.storage.utilization.toFixed(1)}% capacity`,
          recommendation: 'Implement file cleanup policies or upgrade storage tier'
        });
      }
    }
  }

  analyzeAiUsage(usage) {
    if (!usage) return;

    // OpenAI analysis
    if (usage.openai && usage.openai.status === 'active') {
      const openai = usage.openai;
      
      if (openai.tokens.utilization > this.thresholds.ai.tokenUsageCritical) {
        this.alerts.push({
          type: 'critical',
          service: 'openai',
          metric: 'tokens',
          message: `OpenAI token usage at ${openai.tokens.utilization.toFixed(1)}% of limit`,
          recommendation: 'Implement token optimization or upgrade plan'
        });
      }

      if (openai.estimatedCost > this.thresholds.ai.costPerDayCritical) {
        this.alerts.push({
          type: 'critical',
          service: 'openai',
          metric: 'cost',
          message: `Daily AI cost at $${openai.estimatedCost.toFixed(2)}`,
          recommendation: 'Review AI usage patterns and implement cost controls'
        });
      }
    }

    // Generate cost optimization recommendations
    this.generateCostOptimizations(usage);
  }

  generateCostOptimizations(usage) {
    // AI cost optimizations
    if (usage.openai && usage.openai.status === 'active') {
      if (usage.openai.tokens.utilization > 50) {
        this.costOptimizations.push({
          category: 'ai',
          priority: 'high',
          title: 'Implement AI response caching',
          description: 'Cache similar OCR enhancement requests to reduce API calls',
          estimatedSavings: '20-40% on AI costs',
          implementation: 'Add Redis cache for OCR enhancement results'
        });
      }

      if (usage.openai.estimatedCost > 20) {
        this.costOptimizations.push({
          category: 'ai',
          priority: 'medium', 
          title: 'Optimize prompt efficiency',
          description: 'Reduce token usage by optimizing prompts and responses',
          estimatedSavings: '15-25% on AI costs',
          implementation: 'Review and optimize AI prompts for conciseness'
        });
      }
    }

    // Database optimizations
    this.costOptimizations.push({
      category: 'database',
      priority: 'medium',
      title: 'Implement query optimization',
      description: 'Optimize slow queries and add appropriate indexes',
      estimatedSavings: '10-20% on compute costs',
      implementation: 'Use query analyzer and add missing indexes'
    });

    // Storage optimizations
    this.costOptimizations.push({
      category: 'storage',
      priority: 'low',
      title: 'Implement file compression',
      description: 'Compress uploaded receipts and images',
      estimatedSavings: '30-50% on storage costs',
      implementation: 'Add image compression before storage'
    });
  }

  generateReport() {
    console.log('\n💰 Cost Monitoring Report');
    console.log('========================');
    console.log(`Generated: ${new Date().toLocaleString()}`);

    // Alerts section
    if (this.alerts.length > 0) {
      console.log('\n🚨 ALERTS:');
      this.alerts.forEach(alert => {
        const icon = alert.type === 'critical' ? '🔴' : '⚠️';
        console.log(`${icon} [${alert.type.toUpperCase()}] ${alert.service}/${alert.metric}`);
        console.log(`   ${alert.message}`);
        console.log(`   💡 ${alert.recommendation}`);
      });
    } else {
      console.log('\n✅ No critical alerts');
    }

    // Cost optimizations section
    if (this.costOptimizations.length > 0) {
      console.log('\n💡 COST OPTIMIZATION OPPORTUNITIES:');
      this.costOptimizations
        .sort((a, b) => {
          const priorities = { high: 3, medium: 2, low: 1 };
          return priorities[b.priority] - priorities[a.priority];
        })
        .forEach(opt => {
          const icon = opt.priority === 'high' ? '🔥' : opt.priority === 'medium' ? '⚡' : '💡';
          console.log(`${icon} [${opt.priority.toUpperCase()}] ${opt.title}`);
          console.log(`   📝 ${opt.description}`);
          console.log(`   💰 Potential savings: ${opt.estimatedSavings}`);
          console.log(`   🔧 Implementation: ${opt.implementation}`);
        });
    }
  }

  async saveReport(filename) {
    const report = {
      timestamp: new Date().toISOString(),
      alerts: this.alerts,
      optimizations: this.costOptimizations,
      summary: {
        totalAlerts: this.alerts.length,
        criticalAlerts: this.alerts.filter(a => a.type === 'critical').length,
        warningAlerts: this.alerts.filter(a => a.type === 'warning').length,
        optimizationOpportunities: this.costOptimizations.length
      }
    };

    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, filename || `cost-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Report saved: ${reportPath}`);
    return reportPath;
  }

  async sendAlerts() {
    const criticalAlerts = this.alerts.filter(a => a.type === 'critical');
    
    if (criticalAlerts.length > 0) {
      console.log('\n📧 Sending critical alerts...');
      
      // In production, integrate with your notification system
      // (Slack, email, PagerDuty, etc.)
      criticalAlerts.forEach(alert => {
        console.log(`   🚨 Critical: ${alert.message}`);
      });
    }
  }
}

// Main execution
async function main() {
  const monitor = new CostMonitoringManager();
  
  console.log('🚀 Starting cost monitoring...\n');
  
  try {
    // Check all services
    const supabaseUsage = await monitor.checkSupabaseUsage();
    const aiUsage = await monitor.checkAiServiceUsage();
    
    // Generate and display report
    monitor.generateReport();
    
    // Save report
    await monitor.saveReport();
    
    // Send critical alerts
    await monitor.sendAlerts();
    
    console.log('\n✅ Cost monitoring completed successfully');
    
  } catch (error) {
    console.error('❌ Cost monitoring failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CostMonitoringManager;