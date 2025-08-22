/**
 * Jest Configuration for API Integration Tests
 */

const customJestConfig = {
  displayName: 'API Tests',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/api.setup.js'],
  testMatch: [
    '<rootDir>/tests/api/**/*.test.{js,ts}',
    '<rootDir>/app/api/**/*.test.{js,ts}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/unit/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/'
  ],
  collectCoverageFrom: [
    'app/api/**/*.{js,ts}',
    'lib/services/**/*.{js,ts}',
    'lib/api-middleware.ts',
    'lib/auth.ts',
    '!**/*.d.ts',
    '!**/*.config.{js,ts}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage/api',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Higher thresholds for critical API routes
    'app/api/subscriptions/**/*.{js,ts}': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'app/api/billing/**/*.{js,ts}': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    }
  },
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@supabase|stripe|@stripe)/)',
  ],
  // Longer timeout for API tests
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/setup/env.setup.js'],
  // Environment variables for API tests
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      TEST_ENVIRONMENT: 'test',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    },
  },
  // Sequential execution for API tests to avoid conflicts
  maxWorkers: 1,
  // Disable cache for API tests to ensure fresh state
  cache: false,
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  // Verbose output for API debugging
  verbose: true,
  // Fail fast in CI
  bail: process.env.CI ? 1 : 0,
  // Custom test runner for API tests
  runner: 'jest-serial-runner',
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache/api',
  // Global setup and teardown for API tests
  globalSetup: '<rootDir>/tests/setup/api.global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/api.global-teardown.js',
  // Force exit after tests complete
  forceExit: true,
  // Detect open handles
  detectOpenHandles: true,
};

module.exports = customJestConfig;