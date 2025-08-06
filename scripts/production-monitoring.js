#!/usr/bin/env node

/**
 * Production Monitoring & Health Check System
 * Comprehensive monitoring for Railway deployment of Flowvya SaaS application
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_STATIC_URL || 'http://localhost:3000',
  CHECK_INTERVAL: 60000, // 1 minute
  HEALTH_TIMEOUT: 15000, // 15 seconds
  ALERT_THRESHOLD: 3, // Number of consecutive failures before alert
  LOG_RETENTION_DAYS: 7,
  METRICS_RETENTION_HOURS: 24,
  CRITICAL_ENDPOINTS: [
    '/api/health',
    '/api/health/db',
    '/api/health/tenant',
    '/api/health/ai'
  ]
};

class ProductionMonitor {
  constructor() {
    this.failureCount = new Map();
    this.metrics = [];
    this.alerts = [];
    this.logDir = path.join(__dirname, '..', 'logs', 'monitoring');
    this.metricsDir = path.join(__dirname, '..', 'logs', 'metrics');
    
    this.ensureDirectories();
    this.startMonitoring();
  }

  ensureDirectories() {
    const dirs = [this.logDir, this.metricsDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async startMonitoring() {
    console.log(`🔍 Starting Production Monitoring for ${CONFIG.APP_URL}`);
    console.log(`⏱️  Check interval: ${CONFIG.CHECK_INTERVAL / 1000}s`);
    console.log(`📊 Monitoring ${CONFIG.CRITICAL_ENDPOINTS.length} critical endpoints\n`);

    // Initial health check
    await this.performHealthCheck();

    // Schedule regular checks
    setInterval(() => {
      this.performHealthCheck();
    }, CONFIG.CHECK_INTERVAL);

    // Schedule cleanup tasks
    setInterval(() => {
      this.cleanupLogs();
      this.cleanupMetrics();
    }, 24 * 60 * 60 * 1000); // Daily cleanup

    // Graceful shutdown handling
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  async performHealthCheck() {
    const timestamp = new Date().toISOString();
    const results = {
      timestamp,
      overall: 'healthy',
      endpoints: {},
      metrics: {
        totalResponseTime: 0,
        averageResponseTime: 0,
        failedChecks: 0,
        totalChecks: CONFIG.CRITICAL_ENDPOINTS.length
      }
    };

    console.log(`\n🔍 Health Check - ${timestamp}`);

    try {
      // Check all critical endpoints
      for (const endpoint of CONFIG.CRITICAL_ENDPOINTS) {
        const result = await this.checkEndpoint(endpoint);
        results.endpoints[endpoint] = result;
        results.metrics.totalResponseTime += result.responseTime || 0;
        
        if (!result.healthy) {
          results.metrics.failedChecks++;
          results.overall = 'degraded';
        }

        // Log individual results
        const status = result.healthy ? '✅' : '❌';
        const time = result.responseTime ? `${result.responseTime}ms` : 'timeout';
        console.log(`  ${status} ${endpoint} (${time})`);
      }

      // Calculate averages
      results.metrics.averageResponseTime = Math.round(
        results.metrics.totalResponseTime / CONFIG.CRITICAL_ENDPOINTS.length
      );

      // Determine overall health
      if (results.metrics.failedChecks >= CONFIG.CRITICAL_ENDPOINTS.length) {
        results.overall = 'unhealthy';
      } else if (results.metrics.failedChecks > 0) {
        results.overall = 'degraded';
      }

      // Handle failures and alerts
      await this.handleHealthResults(results);

      // Store metrics
      this.storeMetrics(results);

      // Log summary
      const statusIcon = results.overall === 'healthy' ? '💚' : 
                        results.overall === 'degraded' ? '🟡' : '🔴';
      console.log(`\n${statusIcon} Overall Status: ${results.overall.toUpperCase()}`);
      console.log(`📊 Average Response: ${results.metrics.averageResponseTime}ms`);
      console.log(`⚠️  Failed Checks: ${results.metrics.failedChecks}/${results.metrics.totalChecks}`);

    } catch (error) {
      console.error('❌ Health check failed:', error);
      results.overall = 'unhealthy';
      results.error = error.message;
      await this.handleCriticalError(error);
    }
  }

  async checkEndpoint(endpoint) {
    const startTime = Date.now();
    const url = `${CONFIG.APP_URL}${endpoint}`;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          healthy: false,
          error: 'Request timeout',
          responseTime: null,
          url
        });
      }, CONFIG.HEALTH_TIMEOUT);

      const request = https.get(url, (response) => {
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;
        
        let data = '';
        response.on('data', chunk => data += chunk);
        
        response.on('end', () => {
          const healthy = response.statusCode >= 200 && response.statusCode < 400;
          
          let parsedData = null;
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            // Not JSON, that's ok for some endpoints
          }

          resolve({
            healthy,
            statusCode: response.statusCode,
            responseTime,
            url,
            data: parsedData,
            error: healthy ? null : `HTTP ${response.statusCode}`
          });
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          healthy: false,
          error: error.message,
          responseTime: Date.now() - startTime,
          url
        });
      });
    });
  }

  async handleHealthResults(results) {
    const failureKey = 'overall';
    
    if (results.overall !== 'healthy') {
      const currentFailures = this.failureCount.get(failureKey) || 0;
      this.failureCount.set(failureKey, currentFailures + 1);

      // Trigger alert if threshold reached
      if (currentFailures + 1 >= CONFIG.ALERT_THRESHOLD) {
        await this.triggerAlert('HEALTH_CHECK_FAILURE', {
          consecutiveFailures: currentFailures + 1,
          status: results.overall,
          failedEndpoints: Object.entries(results.endpoints)
            .filter(([_, result]) => !result.healthy)
            .map(([endpoint, result]) => ({ endpoint, error: result.error }))
        });
      }
    } else {
      // Reset failure count on success
      this.failureCount.set(failureKey, 0);
    }

    // Log to file
    this.logHealthCheck(results);
  }

  async triggerAlert(type, data) {
    const alert = {
      timestamp: new Date().toISOString(),
      type,
      severity: this.getAlertSeverity(type),
      data,
      environment: process.env.RAILWAY_ENVIRONMENT || 'production'
    };

    this.alerts.push(alert);
    
    console.log(`\n🚨 ALERT: ${type}`);
    console.log(`🔴 Severity: ${alert.severity}`);
    console.log(`📊 Details:`, JSON.stringify(data, null, 2));

    // Log alert to file
    const alertLog = path.join(this.logDir, `alerts-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(alertLog, JSON.stringify(alert) + '\n');

    // In a real production environment, you would send this to:
    // - Slack webhook
    // - Discord webhook
    // - Email notification service
    // - PagerDuty
    // - Datadog/New Relic
    
    // Example webhook notification (commented out):
    // await this.sendWebhookNotification(alert);
  }

  getAlertSeverity(type) {
    const severityMap = {
      'HEALTH_CHECK_FAILURE': 'HIGH',
      'DATABASE_CONNECTION_FAILED': 'CRITICAL',
      'HIGH_RESPONSE_TIME': 'MEDIUM',
      'STORAGE_FAILURE': 'HIGH',
      'AUTHENTICATION_FAILURE': 'HIGH'
    };
    return severityMap[type] || 'LOW';
  }

  async handleCriticalError(error) {
    await this.triggerAlert('CRITICAL_ERROR', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  logHealthCheck(results) {
    const logFile = path.join(
      this.logDir, 
      `health-${new Date().toISOString().split('T')[0]}.log`
    );
    
    const logEntry = {
      timestamp: results.timestamp,
      overall: results.overall,
      metrics: results.metrics,
      endpoints: Object.entries(results.endpoints).reduce((acc, [endpoint, result]) => {
        acc[endpoint] = {
          healthy: result.healthy,
          responseTime: result.responseTime,
          error: result.error
        };
        return acc;
      }, {})
    };

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  storeMetrics(results) {
    const metricsFile = path.join(
      this.metricsDir,
      `metrics-${new Date().toISOString().split('T')[0]}.json`
    );

    const metric = {
      timestamp: results.timestamp,
      overall: results.overall,
      averageResponseTime: results.metrics.averageResponseTime,
      failedChecks: results.metrics.failedChecks,
      totalChecks: results.metrics.totalChecks,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    let existingMetrics = [];
    if (fs.existsSync(metricsFile)) {
      try {
        existingMetrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
      } catch (e) {
        existingMetrics = [];
      }
    }

    existingMetrics.push(metric);
    
    // Keep only last 24 hours of metrics
    const cutoff = Date.now() - (CONFIG.METRICS_RETENTION_HOURS * 60 * 60 * 1000);
    existingMetrics = existingMetrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );

    fs.writeFileSync(metricsFile, JSON.stringify(existingMetrics, null, 2));
  }

  cleanupLogs() {
    console.log('🧹 Cleaning up old log files...');
    
    const cutoff = Date.now() - (CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    [this.logDir, this.metricsDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < cutoff) {
            fs.unlinkSync(filePath);
            console.log(`  🗑️  Removed old file: ${file}`);
          }
        });
      }
    });
  }

  cleanupMetrics() {
    console.log('🧹 Cleaning up old metrics...');
    // Metrics are cleaned during storage, but we could add more cleanup here
  }

  shutdown(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down monitoring gracefully...`);
    
    // Log shutdown
    const shutdownLog = {
      timestamp: new Date().toISOString(),
      event: 'MONITOR_SHUTDOWN',
      signal,
      uptime: process.uptime(),
      totalAlerts: this.alerts.length
    };

    const logFile = path.join(this.logDir, 'system.log');
    fs.appendFileSync(logFile, JSON.stringify(shutdownLog) + '\n');
    
    console.log('✅ Monitoring shutdown complete');
    process.exit(0);
  }

  // Utility method to generate a health report
  generateReport() {
    const metricsFile = path.join(
      this.metricsDir,
      `metrics-${new Date().toISOString().split('T')[0]}.json`
    );

    let metrics = [];
    if (fs.existsSync(metricsFile)) {
      try {
        metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
      } catch (e) {
        metrics = [];
      }
    }

    if (metrics.length === 0) {
      console.log('📊 No metrics available for report');
      return;
    }

    const uptime = metrics.filter(m => m.overall === 'healthy').length / metrics.length * 100;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length;
    const totalFailures = metrics.reduce((sum, m) => sum + m.failedChecks, 0);

    console.log('\n📊 Health Report (24h):');
    console.log(`⏳ Uptime: ${uptime.toFixed(2)}%`);
    console.log(`⚡ Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`❌ Total Failures: ${totalFailures}`);
    console.log(`📈 Total Checks: ${metrics.length * CONFIG.CRITICAL_ENDPOINTS.length}`);
    console.log(`🚨 Alerts Generated: ${this.alerts.length}`);
  }
}

// Start monitoring if run directly
if (require.main === module) {
  const monitor = new ProductionMonitor();
  
  // Generate report on startup
  setTimeout(() => {
    monitor.generateReport();
  }, 5000);
}

module.exports = ProductionMonitor;