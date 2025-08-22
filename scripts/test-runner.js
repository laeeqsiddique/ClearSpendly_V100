#!/usr/bin/env node

/**
 * ClearSpendly Test Runner
 * 
 * Orchestrates test execution across different environments and test types
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { EnvironmentConfigManager } = require('../lib/testing/environment-config');
const { DatabaseTestUtils } = require('../lib/testing/database-test-utils');

class TestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: {}
    };
    this.config = EnvironmentConfigManager.getTestConfiguration();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    switch (level) {
      case 'success':
        console.log(chalk.green(`✓ [${timestamp}] ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`✗ [${timestamp}] ${message}`));
        break;
      case 'warning':
        console.log(chalk.yellow(`⚠ [${timestamp}] ${message}`));
        break;
      case 'info':
        console.log(chalk.blue(`ℹ [${timestamp}] ${message}`));
        break;
      case 'debug':
        if (process.env.DEBUG) {
          console.log(chalk.gray(`  [${timestamp}] ${message}`));
        }
        break;
    }
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${command} ${args.join(' ')}`, 'debug');
      
      const child = spawn(command, args, {
        stdio: 'inherit',
        env: { ...process.env, ...options.env },
        cwd: options.cwd || process.cwd()
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async validateEnvironment() {
    this.log('Validating environment configuration...', 'info');
    
    const validation = EnvironmentConfigManager.validateConfig(this.config.environment);
    
    if (!validation.valid) {
      this.log('Environment configuration errors:', 'error');
      validation.errors.forEach(error => this.log(`  - ${error}`, 'error'));
      throw new Error('Environment configuration is invalid');
    }

    if (validation.warnings.length > 0) {
      this.log('Environment configuration warnings:', 'warning');
      validation.warnings.forEach(warning => this.log(`  - ${warning}`, 'warning'));
    }

    this.log(`Environment: ${this.config.environment}`, 'info');
    this.log(`Base URL: ${this.config.config.baseUrl}`, 'debug');
  }

  async setupTestDatabase() {
    if (!this.config.testParameters.shouldCleanupAfter) {
      this.log('Skipping database setup (cleanup disabled)', 'debug');
      return;
    }

    this.log('Setting up test database...', 'info');
    
    try {
      const dbUtils = new DatabaseTestUtils(
        this.config.config.supabaseUrl,
        this.config.config.supabaseKey
      );

      // Test database connection
      const connectionTest = await dbUtils.testConnection();
      
      if (!connectionTest.connected) {
        throw new Error('Cannot connect to test database');
      }

      this.log(`Database connection: ${connectionTest.latency}ms`, 'debug');
      
      if (!connectionTest.permissions.canWrite) {
        this.log('Warning: Limited database permissions', 'warning');
      }

      // Clean up any old test data
      if (this.config.environment !== 'production') {
        await dbUtils.clearTestData();
        this.log('Cleared old test data', 'debug');
      }

      // Create snapshot if enabled
      if (this.config.testParameters.shouldTakeSnapshots) {
        await dbUtils.createSnapshot('pre-test');
        this.log('Created pre-test database snapshot', 'debug');
      }

    } catch (error) {
      this.log(`Database setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runUnitTests() {
    if (!process.argv.includes('--unit') && !process.argv.includes('--all')) {
      this.results.suites.unit = { status: 'skipped' };
      return;
    }

    this.log('Running unit tests...', 'info');
    const startTime = Date.now();

    try {
      await this.runCommand('npm', ['run', 'test:unit'], {
        env: {
          NODE_ENV: 'test',
          TEST_ENVIRONMENT: this.config.environment
        }
      });

      const duration = Date.now() - startTime;
      this.results.suites.unit = { status: 'passed', duration };
      this.results.passed++;
      this.log(`Unit tests passed (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.suites.unit = { status: 'failed', duration, error: error.message };
      this.results.failed++;
      this.log(`Unit tests failed: ${error.message}`, 'error');
      
      if (!process.argv.includes('--continue-on-failure')) {
        throw error;
      }
    }
  }

  async runApiTests() {
    if (!process.argv.includes('--api') && !process.argv.includes('--all')) {
      this.results.suites.api = { status: 'skipped' };
      return;
    }

    this.log('Running API tests...', 'info');
    const startTime = Date.now();

    try {
      await this.runCommand('npm', ['run', 'test:api'], {
        env: {
          NODE_ENV: 'test',
          TEST_ENVIRONMENT: this.config.environment,
          TEST_SUPABASE_URL: this.config.config.supabaseUrl,
          TEST_SUPABASE_KEY: this.config.config.supabaseKey
        }
      });

      const duration = Date.now() - startTime;
      this.results.suites.api = { status: 'passed', duration };
      this.results.passed++;
      this.log(`API tests passed (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.suites.api = { status: 'failed', duration, error: error.message };
      this.results.failed++;
      this.log(`API tests failed: ${error.message}`, 'error');
      
      if (!process.argv.includes('--continue-on-failure')) {
        throw error;
      }
    }
  }

  async runE2ETests() {
    if (!this.config.testParameters.shouldRunE2E || 
        (!process.argv.includes('--e2e') && !process.argv.includes('--all'))) {
      this.results.suites.e2e = { status: 'skipped' };
      return;
    }

    this.log('Running E2E tests...', 'info');
    const startTime = Date.now();

    try {
      // Install Playwright browsers if not cached
      await this.runCommand('npx', ['playwright', 'install', '--with-deps']);
      
      const playwrightArgs = ['playwright', 'test'];
      
      // Add browser selection
      if (process.argv.includes('--browser')) {
        const browserIndex = process.argv.indexOf('--browser');
        const browser = process.argv[browserIndex + 1];
        playwrightArgs.push('--project', browser);
      }

      await this.runCommand('npx', playwrightArgs, {
        env: {
          NODE_ENV: 'test',
          TEST_ENVIRONMENT: this.config.environment,
          PLAYWRIGHT_BROWSERS_PATH: path.join(process.cwd(), 'pw-browsers')
        }
      });

      const duration = Date.now() - startTime;
      this.results.suites.e2e = { status: 'passed', duration };
      this.results.passed++;
      this.log(`E2E tests passed (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.suites.e2e = { status: 'failed', duration, error: error.message };
      this.results.failed++;
      this.log(`E2E tests failed: ${error.message}`, 'error');
      
      if (!process.argv.includes('--continue-on-failure')) {
        throw error;
      }
    }
  }

  async runSmokeTests() {
    if (!this.config.testParameters.shouldRunSmokeTests ||
        (!process.argv.includes('--smoke') && !process.argv.includes('--all'))) {
      this.results.suites.smoke = { status: 'skipped' };
      return;
    }

    this.log('Running smoke tests...', 'info');
    const startTime = Date.now();

    try {
      await this.runCommand('npx', ['playwright', 'test', '--grep', '@smoke'], {
        env: {
          NODE_ENV: 'production',
          TEST_ENVIRONMENT: 'production'
        }
      });

      const duration = Date.now() - startTime;
      this.results.suites.smoke = { status: 'passed', duration };
      this.results.passed++;
      this.log(`Smoke tests passed (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.suites.smoke = { status: 'failed', duration, error: error.message };
      this.results.failed++;
      this.log(`Smoke tests failed: ${error.message}`, 'error');
      
      if (!process.argv.includes('--continue-on-failure')) {
        throw error;
      }
    }
  }

  async runLoadTests() {
    if (!this.config.testParameters.shouldRunLoadTests ||
        (!process.argv.includes('--load') && !process.argv.includes('--all'))) {
      this.results.suites.load = { status: 'skipped' };
      return;
    }

    this.log('Running load tests...', 'info');
    const startTime = Date.now();

    try {
      await this.runCommand('npm', ['run', 'test:load'], {
        env: {
          NODE_ENV: 'test',
          TEST_ENVIRONMENT: this.config.environment
        }
      });

      const duration = Date.now() - startTime;
      this.results.suites.load = { status: 'passed', duration };
      this.results.passed++;
      this.log(`Load tests passed (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.suites.load = { status: 'failed', duration, error: error.message };
      this.results.failed++;
      this.log(`Load tests failed: ${error.message}`, 'error');
      
      if (!process.argv.includes('--continue-on-failure')) {
        throw error;
      }
    }
  }

  async runCustomScript() {
    const scriptIndex = process.argv.indexOf('--script');
    if (scriptIndex === -1) return;

    const scriptPath = process.argv[scriptIndex + 1];
    if (!scriptPath) {
      this.log('No script path provided', 'error');
      return;
    }

    this.log(`Running custom script: ${scriptPath}`, 'info');
    const startTime = Date.now();

    try {
      await this.runCommand('node', [scriptPath], {
        env: {
          TEST_ENVIRONMENT: this.config.environment
        }
      });

      const duration = Date.now() - startTime;
      this.results.suites.custom = { status: 'passed', duration };
      this.results.passed++;
      this.log(`Custom script passed (${duration}ms)`, 'success');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.suites.custom = { status: 'failed', duration, error: error.message };
      this.results.failed++;
      this.log(`Custom script failed: ${error.message}`, 'error');
    }
  }

  async cleanup() {
    if (!this.config.testParameters.shouldCleanupAfter) {
      this.log('Skipping cleanup (disabled)', 'debug');
      return;
    }

    this.log('Cleaning up test data...', 'info');

    try {
      const dbUtils = new DatabaseTestUtils(
        this.config.config.supabaseUrl,
        this.config.config.supabaseKey
      );

      // Restore from snapshot if available
      if (this.config.testParameters.shouldTakeSnapshots) {
        await dbUtils.restoreFromSnapshot('pre-test');
        this.log('Restored from pre-test snapshot', 'debug');
      } else {
        await dbUtils.clearTestData();
        this.log('Cleared test data', 'debug');
      }

      // Clean up test artifacts
      const testResultsDir = path.join(process.cwd(), 'test-results');
      try {
        await fs.rmdir(testResultsDir, { recursive: true });
      } catch (error) {
        // Directory may not exist
      }

    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'warning');
    }
  }

  async generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      duration: totalDuration,
      results: this.results,
      config: {
        baseUrl: this.config.config.baseUrl,
        testTimeout: this.config.config.testTimeout,
        retryAttempts: this.config.config.retryAttempts
      }
    };

    // Write report to file
    const reportPath = path.join(process.cwd(), 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    this.log('Test execution completed', 'info');
    console.log('\n' + '='.repeat(60));
    console.log('ClearSpendly Test Results');
    console.log('='.repeat(60));
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`Suites Passed: ${chalk.green(this.results.passed)}`);
    console.log(`Suites Failed: ${chalk.red(this.results.failed)}`);
    console.log(`Suites Skipped: ${chalk.yellow(this.results.skipped)}`);

    // Detailed results
    console.log('\nSuite Details:');
    Object.entries(this.results.suites).forEach(([suite, result]) => {
      const status = result.status;
      const color = status === 'passed' ? 'green' : status === 'failed' ? 'red' : 'yellow';
      const duration = result.duration ? `(${(result.duration / 1000).toFixed(2)}s)` : '';
      console.log(`  ${chalk[color](suite)}: ${status} ${duration}`);
    });

    console.log('='.repeat(60));
    console.log(`Report saved to: ${reportPath}`);

    return this.results.failed === 0;
  }

  async run() {
    try {
      await this.validateEnvironment();
      await this.setupTestDatabase();
      
      // Run test suites
      await this.runUnitTests();
      await this.runApiTests();
      await this.runE2ETests();
      await this.runSmokeTests();
      await this.runLoadTests();
      await this.runCustomScript();
      
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
    } finally {
      await this.cleanup();
      const success = await this.generateReport();
      process.exit(success ? 0 : 1);
    }
  }
}

// CLI interface
function displayHelp() {
  console.log(`
ClearSpendly Test Runner

Usage: node scripts/test-runner.js [options]

Test Suites:
  --unit                Run unit tests
  --api                 Run API integration tests
  --e2e                 Run end-to-end tests
  --smoke               Run smoke tests
  --load                Run load tests
  --all                 Run all applicable test suites

Options:
  --environment <env>   Set test environment (local, staging, production)
  --browser <browser>   Specify browser for E2E tests (chromium, firefox, webkit)
  --script <path>       Run custom test script
  --continue-on-failure Continue running tests even if one suite fails
  --help               Display this help message

Examples:
  node scripts/test-runner.js --all
  node scripts/test-runner.js --unit --api
  node scripts/test-runner.js --e2e --browser chromium
  node scripts/test-runner.js --environment staging --smoke
  `);
}

// Run if called directly
if (require.main === module) {
  if (process.argv.includes('--help')) {
    displayHelp();
    process.exit(0);
  }

  const testRunner = new TestRunner();
  testRunner.run().catch(error => {
    console.error('Test runner crashed:', error);
    process.exit(1);
  });
}