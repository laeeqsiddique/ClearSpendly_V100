/**
 * API Test Setup
 * 
 * Setup for API integration tests
 */

const { TestDataManager } = require('../../lib/testing/test-data-manager');
const { DatabaseTestUtils } = require('../../lib/testing/database-test-utils');
const { EnvironmentConfigManager } = require('../../lib/testing/environment-config');

// Global test configuration
const testConfig = EnvironmentConfigManager.getTestConfiguration();

// Global test managers
let testDataManager;
let databaseUtils;

// Mock environment variables for API tests
process.env.NODE_ENV = 'test';
process.env.TEST_ENVIRONMENT = 'test';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

// Ensure test-specific environment variables
if (!process.env.TEST_SUPABASE_URL) {
  process.env.TEST_SUPABASE_URL = testConfig.config.supabaseUrl;
}

if (!process.env.TEST_SUPABASE_KEY) {
  process.env.TEST_SUPABASE_KEY = testConfig.config.supabaseKey;
}

// Global setup before all tests
beforeAll(async () => {
  // Initialize test managers
  testDataManager = TestDataManager.create('test');
  databaseUtils = new DatabaseTestUtils(
    testConfig.config.supabaseUrl,
    testConfig.config.supabaseKey
  );

  // Verify database connection
  const connectionTest = await databaseUtils.testConnection();
  if (!connectionTest.connected) {
    throw new Error('Cannot connect to test database');
  }

  console.log(`Database connection established (${connectionTest.latency}ms)`);

  // Clear any existing test data
  await databaseUtils.clearTestData();
  console.log('Test database cleaned');

  // Create pre-test snapshot if supported
  if (testConfig.testParameters.shouldTakeSnapshots) {
    await databaseUtils.createSnapshot('api-tests-start');
    console.log('Pre-test snapshot created');
  }

  // Make test managers available globally
  global.testDataManager = testDataManager;
  global.databaseUtils = databaseUtils;
  global.testConfig = testConfig;
});

// Global cleanup after all tests
afterAll(async () => {
  if (testConfig.testParameters.shouldCleanupAfter) {
    console.log('Cleaning up API test data...');
    
    if (testDataManager) {
      await testDataManager.cleanup();
    }
    
    if (databaseUtils) {
      // Restore from snapshot or clear data
      if (testConfig.testParameters.shouldTakeSnapshots) {
        await databaseUtils.restoreFromSnapshot('api-tests-start');
        console.log('Restored from pre-test snapshot');
      } else {
        await databaseUtils.clearTestData();
        console.log('Test data cleared');
      }
    }
  }
});

// Setup before each test
beforeEach(async () => {
  // Clear any test data from previous tests
  if (testDataManager && process.env.JEST_WORKER_ID === '1') {
    // Only clear on the first worker to avoid conflicts
    await testDataManager.cleanup();
  }
});

// Cleanup after each test
afterEach(async () => {
  // Additional cleanup if needed
});

// Global test utilities for API tests
global.apiTestUtils = {
  /**
   * Create a test request context
   */
  createRequestContext: (overrides = {}) => ({
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-agent',
      ...overrides.headers
    },
    body: overrides.body ? JSON.stringify(overrides.body) : null,
    url: overrides.url || 'http://localhost:3000/api/test',
    nextUrl: {
      pathname: overrides.pathname || '/api/test',
      searchParams: new URLSearchParams(overrides.searchParams || {})
    },
    ...overrides
  }),

  /**
   * Create a mock Next.js response
   */
  createMockResponse: () => {
    const headers = new Map();
    const response = {
      status: 200,
      headers,
      body: null,
      json: jest.fn().mockImplementation((data) => {
        response.body = data;
        return response;
      }),
      text: jest.fn().mockImplementation((text) => {
        response.body = text;
        return response;
      }),
      redirect: jest.fn(),
      setHeader: jest.fn((key, value) => {
        headers.set(key.toLowerCase(), value);
      }),
      getHeader: jest.fn((key) => {
        return headers.get(key.toLowerCase());
      })
    };
    return response;
  },

  /**
   * Mock authentication context
   */
  createAuthContext: async (role = 'user') => {
    const tenant = await testDataManager.createTestTenant();
    const user = await testDataManager.createTestUser(tenant.id, { role });
    const { session } = await testDataManager.getTestUserWithSession(user.id);
    
    return {
      user,
      tenant,
      session,
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-tenant-id': tenant.id
      }
    };
  },

  /**
   * Wait for async operations with timeout
   */
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  /**
   * Simulate API request
   */
  simulateRequest: async (handler, request, context = {}) => {
    const mockRequest = {
      ...global.apiTestUtils.createRequestContext(),
      ...request
    };
    
    const mockResponse = global.apiTestUtils.createMockResponse();
    
    try {
      const result = await handler(mockRequest, context);
      return result || mockResponse;
    } catch (error) {
      return {
        status: 500,
        body: { error: error.message }
      };
    }
  }
};

// Mock Next.js API utilities
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options = {}) => ({
    url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {})),
    json: jest.fn().mockResolvedValue(options.body || {}),
    text: jest.fn().mockResolvedValue(JSON.stringify(options.body || {})),
    nextUrl: {
      pathname: new URL(url).pathname,
      searchParams: new URL(url).searchParams
    }
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options = {}) => ({
      status: options.status || 200,
      headers: options.headers || {},
      body: data
    })),
    redirect: jest.fn().mockImplementation((url, status = 302) => ({
      status,
      headers: { location: url },
      body: null
    })),
    next: jest.fn().mockImplementation((options = {}) => ({
      status: 200,
      headers: options.headers || {},
      body: null
    }))
  }
}));

// Mock Supabase for API tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        getUserById: jest.fn(),
        listUsers: jest.fn()
      },
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null })
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null })
      }))
    }
  }))
}));

// Console logging control
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress verbose logging in tests unless DEBUG is set
if (!process.env.DEBUG) {
  console.log = (...args) => {
    if (args[0] && args[0].includes && (
      args[0].includes('API Test:') ||
      args[0].includes('Database:') ||
      args[0].includes('Test setup:')
    )) {
      originalConsoleLog(...args);
    }
  };
  
  console.warn = (...args) => {
    if (args[0] && args[0].includes && args[0].includes('Warning:')) {
      originalConsoleWarn(...args);
    }
  };
}

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});