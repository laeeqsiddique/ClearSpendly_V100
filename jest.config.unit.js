/**
 * Jest Configuration for Unit Tests
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Unit Tests',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  testMatch: [
    '<rootDir>/lib/**/*.test.{js,ts}',
    '<rootDir>/components/**/*.test.{js,ts,tsx}',
    '<rootDir>/app/**/*.test.{js,ts,tsx}',
    '<rootDir>/tests/unit/**/*.test.{js,ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/api/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/'
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,ts}',
    'components/**/*.{js,ts,tsx}',
    'app/**/*.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/*.config.{js,ts}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/test*/**'
  ],
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Specific thresholds for critical modules
    'lib/supabase/**/*.{js,ts}': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'lib/testing/**/*.{js,ts}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    }
  },
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  moduleNameMapping: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@supabase|@stripe)/)',
  ],
  // Global test timeout
  testTimeout: 15000,
  // Setup files
  setupFiles: ['<rootDir>/tests/setup/env.setup.js'],
  // Custom environment variables for unit tests
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
      TEST_ENVIRONMENT: 'test',
    },
  },
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  // Verbose output for debugging
  verbose: process.env.JEST_VERBOSE === 'true',
  // Fail fast on first test failure in CI
  bail: process.env.CI ? 1 : 0,
  // Max workers for parallel execution
  maxWorkers: process.env.CI ? 2 : '50%',
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache/unit',
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);