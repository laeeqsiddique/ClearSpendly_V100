#!/usr/bin/env node

/**
 * Quick Test Script for ClearSpendly
 * 
 * This script performs basic checks to ensure the system is working correctly
 * after the complete implementation.
 */

const axios = require('axios');
const chalk = require('chalk');

const baseUrl = 'http://localhost:3003';

class QuickTester {
  constructor() {
    this.results = { passed: 0, failed: 0, errors: [] };
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
      case 'info':
        console.log(chalk.blue(`ℹ [${timestamp}] ${message}`));
        break;
    }
  }

  async test(description, testFn) {
    try {
      this.log(`Testing: ${description}`, 'info');
      await testFn();
      this.results.passed++;
      this.log(`Passed: ${description}`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: description, error: error.message });
      this.log(`Failed: ${description} - ${error.message}`, 'error');
    }
  }

  async makeRequest(path, options = {}) {
    try {
      const response = await axios({
        url: `${baseUrl}${path}`,
        method: options.method || 'GET',
        data: options.data,
        headers: options.headers || {},
        timeout: 5000,
        validateStatus: () => true // Don't throw on 4xx/5xx
      });
      return response;
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async testHealthEndpoints() {
    await this.test('Health Check API', async () => {
      const response = await this.makeRequest('/api/health');
      if (response.status !== 200) {
        throw new Error(`Health check failed with status ${response.status}`);
      }
    });
  }

  async testAuthPages() {
    await this.test('Sign Up Page', async () => {
      const response = await this.makeRequest('/sign-up');
      if (response.status !== 200) {
        throw new Error(`Sign up page failed with status ${response.status}`);
      }
    });

    await this.test('Sign In Page', async () => {
      const response = await this.makeRequest('/sign-in');
      if (response.status !== 200) {
        throw new Error(`Sign in page failed with status ${response.status}`);
      }
    });
  }

  async testOnboardingPages() {
    await this.test('Onboarding Page', async () => {
      const response = await this.makeRequest('/onboarding');
      if (response.status !== 200) {
        throw new Error(`Onboarding page failed with status ${response.status}`);
      }
    });
  }

  async testApiEndpoints() {
    await this.test('Subscription Plans API', async () => {
      const response = await this.makeRequest('/api/subscriptions/plans');
      if (response.status !== 200) {
        throw new Error(`Plans API failed with status ${response.status}`);
      }
    });

    await this.test('Setup Tenant API (POST)', async () => {
      const response = await this.makeRequest('/api/setup-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: {}
      });
      // Should return 401 without auth, which is expected
      if (![401, 400, 422].includes(response.status)) {
        throw new Error(`Setup tenant API unexpected status ${response.status}`);
      }
    });
  }

  async testStaticPages() {
    await this.test('Home Page', async () => {
      const response = await this.makeRequest('/');
      if (response.status !== 200) {
        throw new Error(`Home page failed with status ${response.status}`);
      }
    });

    await this.test('Pricing Page', async () => {
      const response = await this.makeRequest('/pricing');
      if (response.status !== 200) {
        throw new Error(`Pricing page failed with status ${response.status}`);
      }
    });
  }

  async runAllTests() {
    const startTime = Date.now();
    
    this.log('Starting ClearSpendly Quick Tests', 'info');
    this.log(`Testing against: ${baseUrl}`, 'info');

    try {
      await this.testHealthEndpoints();
      await this.testStaticPages();
      await this.testAuthPages();
      await this.testOnboardingPages();
      await this.testApiEndpoints();
    } catch (error) {
      this.log(`Unexpected error: ${error.message}`, 'error');
      this.results.failed++;
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print results
    console.log('\n' + '='.repeat(60));
    this.log('ClearSpendly Quick Test Results', 'info');
    console.log('='.repeat(60));
    
    this.log(`Tests Passed: ${chalk.green(this.results.passed)}`, 'info');
    this.log(`Tests Failed: ${chalk.red(this.results.failed)}`, 'info');
    this.log(`Duration: ${duration}s`, 'info');

    if (this.results.errors.length > 0) {
      console.log('\nErrors:');
      this.results.errors.forEach(error => {
        this.log(`${error.test}: ${error.error}`, 'error');
      });
    }

    const successRate = this.results.failed === 0 ? 100 : 
      (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    
    this.log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'success' : 'error');

    console.log('\n' + chalk.blue('💡 Next Steps:'));
    console.log('1. Visit http://localhost:3002/sign-up to test registration');
    console.log('2. Complete onboarding flow');
    console.log('3. Test billing dashboard at /dashboard/billing');
    console.log('4. Check admin panel at /dashboard/admin/subscriptions');
    
    console.log('='.repeat(60));
    
    return this.results.failed === 0 ? 0 : 1;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new QuickTester();
  
  tester.runAllTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error(chalk.red('Test runner crashed:'), error);
      process.exit(1);
    });
}

module.exports = { QuickTester };