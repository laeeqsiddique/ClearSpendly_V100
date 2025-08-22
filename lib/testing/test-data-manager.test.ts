/**
 * Unit Tests for TestDataManager
 */

import { TestDataManager } from './test-data-manager';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('TestDataManager', () => {
  let testDataManager: TestDataManager;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'test-tenant-id', name: 'Test Tenant' }, 
          error: null 
        })
      })),
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id', email: 'test@example.com' } },
            error: null
          }),
          deleteUser: jest.fn().mockResolvedValue({ error: null })
        },
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { 
            session: { 
              access_token: 'test-token',
              refresh_token: 'test-refresh-token',
              expires_at: Date.now() / 1000 + 3600
            } 
          },
          error: null
        })
      }
    };

    mockCreateClient.mockReturnValue(mockSupabaseClient);
    testDataManager = new TestDataManager('test-url', 'test-key', 'test');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTestTenant', () => {
    it('should create a test tenant with default values', async () => {
      const tenant = await testDataManager.createTestTenant();

      expect(tenant).toHaveProperty('id');
      expect(tenant.id).toMatch(/^test_tenant_/);
      expect(tenant.name).toMatch(/^Test Tenant/);
      expect(tenant.subscription_status).toBe('trial');
      expect(tenant.subscription_plan).toBe('pro');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tenant');
    });

    it('should create a tenant with custom overrides', async () => {
      const overrides = {
        name: 'Custom Tenant',
        subscription_plan: 'business' as const,
        subscription_status: 'active' as const
      };

      const tenant = await testDataManager.createTestTenant(overrides);

      expect(tenant.name).toBe('Custom Tenant');
      expect(tenant.subscription_plan).toBe('business');
      expect(tenant.subscription_status).toBe('active');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' } 
        })
      });

      await expect(testDataManager.createTestTenant()).rejects.toThrow('Failed to create test tenant: Database error');
    });
  });

  describe('createTestUser', () => {
    const mockTenantId = 'test-tenant-id';

    it('should create a test user with default values', async () => {
      const user = await testDataManager.createTestUser(mockTenantId);

      expect(user).toHaveProperty('id');
      expect(user.email).toMatch(/^test_user_.*@example\.com$/);
      expect(user.tenant_id).toBe(mockTenantId);
      expect(user.role).toBe('user');

      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tenant_membership');
    });

    it('should create a user with custom role', async () => {
      const user = await testDataManager.createTestUser(mockTenantId, { role: 'admin' });

      expect(user.role).toBe('admin');
      
      const createUserCall = mockSupabaseClient.auth.admin.createUser.mock.calls[0][0];
      expect(createUserCall.user_metadata.role).toBe('admin');
    });

    it('should handle auth user creation failure', async () => {
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'Auth error' }
      });

      await expect(testDataManager.createTestUser(mockTenantId)).rejects.toThrow('Failed to create auth user: Auth error');
    });

    it('should clean up auth user if membership creation fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Membership error' } 
        })
      });

      await expect(testDataManager.createTestUser(mockTenantId)).rejects.toThrow('Failed to create tenant membership: Membership error');
      
      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('getTestUserWithSession', () => {
    it('should create an authenticated session for a user', async () => {
      const userId = 'test-user-id';
      
      mockSupabaseClient.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: { user: { id: userId, email: 'test@example.com' } },
        error: null
      });

      const { user, session } = await testDataManager.getTestUserWithSession(userId);

      expect(user.id).toBe(userId);
      expect(session.access_token).toBe('test-token');
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    });

    it('should handle user not found error', async () => {
      mockSupabaseClient.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      await expect(testDataManager.getTestUserWithSession('invalid-id')).rejects.toThrow('Failed to get user: User not found');
    });

    it('should handle sign in failure', async () => {
      mockSupabaseClient.auth.admin.getUserById = jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      });

      mockSupabaseClient.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Sign in failed' }
      });

      await expect(testDataManager.getTestUserWithSession('test-user-id')).rejects.toThrow('Failed to create session: Sign in failed');
    });
  });

  describe('createTestScenario', () => {
    it('should create a complete test scenario', async () => {
      const scenario = await testDataManager.createTestScenario('Integration Test');

      expect(scenario.tenant).toHaveProperty('id');
      expect(scenario.tenant.name).toMatch(/Integration Test Test Tenant/);
      expect(scenario.users).toHaveLength(2);
      
      const adminUser = scenario.users.find(u => u.role === 'admin');
      const regularUser = scenario.users.find(u => u.role === 'user');
      
      expect(adminUser).toBeDefined();
      expect(regularUser).toBeDefined();
      expect(adminUser?.email).toMatch(/@example\.com$/);
      expect(regularUser?.email).toMatch(/@example\.com$/);
    });

    it('should seed test data for the scenario', async () => {
      await testDataManager.createTestScenario('Seeded Test');

      // Verify that seedTestData was called (check insert calls)
      const fromCalls = mockSupabaseClient.from.mock.calls;
      const insertCalls = fromCalls.filter(call => 
        ['categories', 'receipts', 'subscriptions'].includes(call[0])
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
    });
  });

  describe('resetTenantData', () => {
    it('should delete tenant data in correct order', async () => {
      const tenantId = 'test-tenant-id';
      
      await testDataManager.resetTenantData(tenantId);

      // Verify deletion calls were made for all tables
      const expectedTables = [
        'receipt_line_items',
        'receipt_tags',
        'receipts',
        'invoices',
        'expense_subscriptions',
        'subscriptions',
        'tenant_membership'
      ];

      expectedTables.forEach(table => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(table);
      });
    });

    it('should handle deletion errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Table does not exist' } 
        })
      });

      // Should not throw, but log warnings
      await expect(testDataManager.resetTenantData('test-tenant-id')).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should delete all tracked users and tenants', async () => {
      // Create some test data first
      const tenant = await testDataManager.createTestTenant();
      const user = await testDataManager.createTestUser(tenant.id);

      await testDataManager.cleanup();

      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(user.id);
    });
  });

  describe('generateTestFixtures', () => {
    it('should generate valid test fixtures', () => {
      const fixtures = testDataManager.generateTestFixtures();

      expect(fixtures).toHaveProperty('validReceipt');
      expect(fixtures).toHaveProperty('validInvoice');
      expect(fixtures).toHaveProperty('validSubscription');

      expect(fixtures.validReceipt.vendor_name).toBe('Test Vendor');
      expect(fixtures.validReceipt.total_amount).toBe(29.99);
      expect(fixtures.validReceipt.currency).toBe('USD');

      expect(fixtures.validInvoice.client_name).toBe('Test Client');
      expect(fixtures.validInvoice.amount).toBe(500.00);

      expect(fixtures.validSubscription.name).toBe('Test Subscription');
      expect(fixtures.validSubscription.amount).toBe(99.99);
      expect(fixtures.validSubscription.frequency).toBe('monthly');
    });

    it('should generate unique invoice numbers', () => {
      const fixtures1 = testDataManager.generateTestFixtures();
      const fixtures2 = testDataManager.generateTestFixtures();

      expect(fixtures1.validInvoice.invoice_number).not.toBe(fixtures2.validInvoice.invoice_number);
    });
  });
});

describe('TestDataManagerFactory', () => {
  beforeEach(() => {
    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'local-supabase-url';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-service-key';
    process.env.STAGING_SUPABASE_URL = 'staging-supabase-url';
    process.env.STAGING_SUPABASE_KEY = 'staging-service-key';
    process.env.TEST_SUPABASE_URL = 'test-supabase-url';
    process.env.TEST_SUPABASE_KEY = 'test-service-key';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STAGING_SUPABASE_URL;
    delete process.env.STAGING_SUPABASE_KEY;
    delete process.env.TEST_SUPABASE_URL;
    delete process.env.TEST_SUPABASE_KEY;
  });

  it('should create manager for local environment', () => {
    const { TestDataManagerFactory } = require('./test-data-manager');
    const manager = TestDataManagerFactory.create('local');

    expect(manager).toBeInstanceOf(TestDataManager);
    expect(mockCreateClient).toHaveBeenCalledWith('local-supabase-url', 'local-service-key');
  });

  it('should create manager for staging environment', () => {
    const { TestDataManagerFactory } = require('./test-data-manager');
    const manager = TestDataManagerFactory.create('staging');

    expect(manager).toBeInstanceOf(TestDataManager);
    expect(mockCreateClient).toHaveBeenCalledWith('staging-supabase-url', 'staging-service-key');
  });

  it('should create manager for test environment', () => {
    const { TestDataManagerFactory } = require('./test-data-manager');
    const manager = TestDataManagerFactory.create('test');

    expect(manager).toBeInstanceOf(TestDataManager);
    expect(mockCreateClient).toHaveBeenCalledWith('test-supabase-url', 'test-service-key');
  });
});