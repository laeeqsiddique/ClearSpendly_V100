/**
 * Jest Setup for Unit Tests
 * 
 * Global test configuration and utilities
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock fetch for tests
global.fetch = require('jest-fetch-mock');

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';

// Global test utilities
global.testUtils = {
  // Generate test IDs
  generateTestId: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock Supabase client
  mockSupabaseClient: () => ({
    auth: {
      user: jest.fn(),
      session: jest.fn(),
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
      updateUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn()
    })),
    rpc: jest.fn(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        list: jest.fn()
      }))
    }
  }),
  
  // Mock Next.js router
  mockRouter: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    }
  },
  
  // Test data factories
  createTestTenant: (overrides = {}) => ({
    id: global.testUtils.generateTestId('tenant'),
    name: 'Test Tenant',
    slug: 'test-tenant',
    subscription_status: 'active',
    subscription_plan: 'pro',
    settings: {},
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  createTestUser: (overrides = {}) => ({
    id: global.testUtils.generateTestId('user'),
    email: `test-${Date.now()}@example.com`,
    role: 'user',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  createTestReceipt: (overrides = {}) => ({
    id: global.testUtils.generateTestId('receipt'),
    tenant_id: global.testUtils.generateTestId('tenant'),
    vendor_name: 'Test Vendor',
    total_amount: 29.99,
    currency: 'USD',
    receipt_date: new Date().toISOString(),
    processed: true,
    ...overrides
  }),
  
  createTestSubscription: (overrides = {}) => ({
    id: global.testUtils.generateTestId('subscription'),
    tenant_id: global.testUtils.generateTestId('tenant'),
    provider: 'stripe',
    status: 'active',
    plan_name: 'Pro Plan',
    amount: 1999,
    currency: 'USD',
    billing_cycle: 'monthly',
    created_at: new Date().toISOString(),
    ...overrides
  })
};

// Mock Next.js modules
jest.mock('next/router', () => ({
  useRouter: () => global.testUtils.mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => global.testUtils.mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => global.testUtils.mockSupabaseClient()),
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
      retrieve: jest.fn(),
    },
    setupIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentMethods: {
      create: jest.fn(),
      attach: jest.fn(),
      list: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      list: jest.fn(),
    },
    prices: {
      list: jest.fn(),
      retrieve: jest.fn(),
    },
    products: {
      list: jest.fn(),
      retrieve: jest.fn(),
    }
  }));
});

// Mock console methods in tests to reduce noise
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || 
       args[0].includes('ReactDOM.render'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch && global.fetch.resetMocks) {
    global.fetch.resetMocks();
  }
  
  // Clear localStorage
  if (window.localStorage) {
    window.localStorage.clear();
  }
  
  // Clear sessionStorage
  if (window.sessionStorage) {
    window.sessionStorage.clear();
  }
});

afterEach(() => {
  // Clean up any timers
  jest.useRealTimers();
  
  // Clean up DOM
  if (document.body) {
    document.body.innerHTML = '';
  }
});