/**
 * Playwright Configuration for ClearSpendly E2E Testing
 */

import { defineConfig, devices } from '@playwright/test';
import { EnvironmentConfigManager } from '../lib/testing/environment-config';

const testConfig = EnvironmentConfigManager.getTestConfiguration();

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: testConfig.environment === 'production',
  retries: testConfig.config.retryAttempts,
  workers: testConfig.testParameters.maxConcurrentTests,
  timeout: testConfig.config.testTimeout,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    // Add custom reporter for Slack/Teams notifications
    ['./reporters/custom-reporter.ts']
  ],

  // Global test setup
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),

  use: {
    // Base URL for all tests
    baseURL: testConfig.config.baseUrl,
    
    // Global test settings
    trace: testConfig.environment === 'local' ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: testConfig.environment === 'staging' ? 'retain-on-failure' : 'off',
    
    // Browser settings
    ignoreHTTPSErrors: testConfig.environment !== 'production',
    
    // Authentication storage
    storageState: {
      cookies: [],
      origins: []
    }
  },

  projects: [
    // Setup project - runs first to prepare test data
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },
    
    // Cleanup project - runs last to clean up test data
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup']
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup']
    },

    // Mobile testing (staging and local only)
    ...(testConfig.testParameters.shouldRunE2E ? [
      {
        name: 'mobile-chrome',
        use: { ...devices['Pixel 5'] },
        dependencies: ['setup']
      },
      {
        name: 'mobile-safari',
        use: { ...devices['iPhone 12'] },
        dependencies: ['setup']
      }
    ] : []),

    // Load testing project (staging only)
    ...(testConfig.testParameters.shouldRunLoadTests ? [
      {
        name: 'load-tests',
        testMatch: /.*\.load\.ts/,
        use: { ...devices['Desktop Chrome'] },
        dependencies: ['setup']
      }
    ] : []),

    // Smoke tests (production only)
    ...(testConfig.testParameters.shouldRunSmokeTests ? [
      {
        name: 'smoke-tests',
        testMatch: /.*\.smoke\.ts/,
        use: { ...devices['Desktop Chrome'] },
        dependencies: ['setup']
      }
    ] : [])
  ],

  // Development server for local testing
  webServer: testConfig.environment === 'local' ? {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000'
    }
  } : undefined,
});