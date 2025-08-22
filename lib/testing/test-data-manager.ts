/**
 * ClearSpendly Test Data Management
 * 
 * Provides isolated, repeatable test data management for multi-tenant testing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import type { Database } from '../supabase/types';

export interface TestTenant {
  id: string;
  name: string;
  slug: string;
  subscription_status: 'active' | 'canceled' | 'trial' | 'past_due';
  subscription_plan: 'free' | 'pro' | 'business';
}

export interface TestUser {
  id: string;
  email: string;
  tenant_id: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface TestDataSeed {
  tenant: TestTenant;
  users: TestUser[];
  receipts: any[];
  subscriptions: any[];
}

/**
 * Test Data Manager for multi-tenant testing
 */
export class TestDataManager {
  private supabase: SupabaseClient<Database>;
  private testPrefix: string;
  private activeTenants: Set<string> = new Set();
  private activeUsers: Set<string> = new Set();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    testPrefix: string = 'test'
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.testPrefix = testPrefix;
  }

  /**
   * Create isolated test tenant with predictable data
   */
  async createTestTenant(overrides: Partial<TestTenant> = {}): Promise<TestTenant> {
    const timestamp = Date.now();
    const uniqueId = nanoid(8);
    
    const tenant: TestTenant = {
      id: `${this.testPrefix}_tenant_${uniqueId}`,
      name: `Test Tenant ${timestamp}`,
      slug: `test-tenant-${uniqueId}`,
      subscription_status: 'trial',
      subscription_plan: 'pro',
      ...overrides
    };

    const { data, error } = await this.supabase
      .from('tenant')
      .insert({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subscription_status: tenant.subscription_status,
        subscription_plan: tenant.subscription_plan,
        settings: {},
        privacy_mode: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test tenant: ${error.message}`);
    }

    this.activeTenants.add(tenant.id);
    return { ...tenant, ...data };
  }

  /**
   * Create test user for specific tenant
   */
  async createTestUser(
    tenantId: string,
    overrides: Partial<TestUser> = {}
  ): Promise<TestUser> {
    const uniqueId = nanoid(8);
    const timestamp = Date.now();

    const user: TestUser = {
      id: `${this.testPrefix}_user_${uniqueId}`,
      email: `test-${uniqueId}-${timestamp}@example.com`,
      tenant_id: tenantId,
      role: 'user',
      ...overrides
    };

    // Create auth user first
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email: user.email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        tenant_id: tenantId,
        role: user.role,
        test_user: true
      }
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    // Create tenant membership
    const { error: membershipError } = await this.supabase
      .from('tenant_membership')
      .insert({
        user_id: authData.user.id,
        tenant_id: tenantId,
        role: user.role,
        status: 'active',
        invited_email: user.email
      });

    if (membershipError) {
      throw new Error(`Failed to create membership: ${membershipError.message}`);
    }

    this.activeUsers.add(authData.user.id);
    return { ...user, id: authData.user.id };
  }

  /**
   * Seed test data for comprehensive testing
   */
  async seedTestData(tenantId: string): Promise<void> {
    // Create sample categories
    const categories = [
      { name: 'Office Supplies', tenant_id: tenantId, is_system: false },
      { name: 'Travel', tenant_id: tenantId, is_system: false },
      { name: 'Marketing', tenant_id: tenantId, is_system: false }
    ];

    const { error: categoriesError } = await this.supabase
      .from('categories')
      .insert(categories);

    if (categoriesError) {
      throw new Error(`Failed to seed categories: ${categoriesError.message}`);
    }

    // Create sample receipts
    const receipts = [
      {
        tenant_id: tenantId,
        vendor_name: 'Test Office Store',
        total_amount: 45.99,
        receipt_date: new Date('2024-01-15').toISOString(),
        currency: 'USD',
        raw_text: 'Test receipt for office supplies',
        processed: true
      },
      {
        tenant_id: tenantId,
        vendor_name: 'Test Travel Agency',
        total_amount: 350.00,
        receipt_date: new Date('2024-01-20').toISOString(),
        currency: 'USD',
        raw_text: 'Test receipt for business travel',
        processed: true
      }
    ];

    const { error: receiptsError } = await this.supabase
      .from('receipts')
      .insert(receipts);

    if (receiptsError) {
      throw new Error(`Failed to seed receipts: ${receiptsError.message}`);
    }

    // Create sample subscriptions if tenant is on paid plan
    if (tenantId.includes('paid')) {
      const subscription = {
        tenant_id: tenantId,
        provider: 'stripe',
        external_id: `test_sub_${nanoid(8)}`,
        status: 'active',
        plan_name: 'Pro Plan',
        billing_cycle: 'monthly',
        amount: 1999,
        currency: 'USD',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { error: subError } = await this.supabase
        .from('subscriptions')
        .insert(subscription);

      if (subError) {
        throw new Error(`Failed to seed subscription: ${subError.message}`);
      }
    }
  }

  /**
   * Create complete test scenario with tenant, users, and data
   */
  async createTestScenario(scenarioName: string): Promise<TestDataSeed> {
    const tenant = await this.createTestTenant({
      name: `${scenarioName} Test Tenant`,
      slug: `test-${scenarioName.toLowerCase().replace(/\s+/g, '-')}-${nanoid(4)}`
    });

    // Create admin user
    const adminUser = await this.createTestUser(tenant.id, {
      role: 'admin',
      email: `admin-${nanoid(6)}@example.com`
    });

    // Create regular user
    const regularUser = await this.createTestUser(tenant.id, {
      role: 'user',
      email: `user-${nanoid(6)}@example.com`
    });

    // Seed with test data
    await this.seedTestData(tenant.id);

    return {
      tenant,
      users: [adminUser, regularUser],
      receipts: [], // Would fetch created receipts
      subscriptions: [] // Would fetch created subscriptions
    };
  }

  /**
   * Get test user with active session
   */
  async getTestUserWithSession(userId: string): Promise<{ user: any; session: any }> {
    // Get user details
    const { data: user, error: userError } = await this.supabase.auth.admin.getUserById(userId);
    
    if (userError || !user.user) {
      throw new Error(`Failed to get user: ${userError?.message}`);
    }

    // Create session for testing
    const { data: sessionData, error: sessionError } = await this.supabase.auth.signInWithPassword({
      email: user.user.email!,
      password: 'TestPassword123!'
    });

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    return {
      user: user.user,
      session: sessionData.session
    };
  }

  /**
   * Reset tenant data while preserving structure
   */
  async resetTenantData(tenantId: string): Promise<void> {
    // Delete in order to respect foreign key constraints
    const tables = [
      'receipt_line_items',
      'receipt_tags', 
      'receipts',
      'invoices',
      'expense_subscriptions',
      'subscriptions',
      'tenant_membership'
    ];

    for (const table of tables) {
      const { error } = await this.supabase
        .from(table as any)
        .delete()
        .eq('tenant_id', tenantId);

      if (error && !error.message.includes('does not exist')) {
        console.warn(`Warning: Could not clean ${table}: ${error.message}`);
      }
    }
  }

  /**
   * Database transaction rollback for test isolation
   */
  async withTransaction<T>(
    testFn: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    // Note: Supabase doesn't support transactions in the same way
    // This is a pattern for test isolation
    const rollbackPoints: Array<{ table: string; ids: string[] }> = [];

    try {
      const result = await testFn(this.supabase);
      return result;
    } catch (error) {
      // Cleanup would go here if we tracked changes
      throw error;
    }
  }

  /**
   * Complete cleanup of all test data
   */
  async cleanup(): Promise<void> {
    // Delete all test users
    for (const userId of this.activeUsers) {
      try {
        await this.supabase.auth.admin.deleteUser(userId);
      } catch (error) {
        console.warn(`Failed to delete user ${userId}:`, error);
      }
    }

    // Delete all test tenants and related data
    for (const tenantId of this.activeTenants) {
      try {
        await this.resetTenantData(tenantId);
        await this.supabase.from('tenant').delete().eq('id', tenantId);
      } catch (error) {
        console.warn(`Failed to delete tenant ${tenantId}:`, error);
      }
    }

    this.activeUsers.clear();
    this.activeTenants.clear();
  }

  /**
   * Generate test data fixtures for consistent testing
   */
  generateTestFixtures() {
    return {
      validReceipt: {
        vendor_name: 'Test Vendor',
        total_amount: 29.99,
        receipt_date: new Date().toISOString(),
        currency: 'USD',
        raw_text: 'Test receipt content'
      },
      validInvoice: {
        client_name: 'Test Client',
        invoice_number: `INV-${nanoid(6)}`,
        amount: 500.00,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft'
      },
      validSubscription: {
        name: 'Test Subscription',
        amount: 99.99,
        frequency: 'monthly',
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  }
}

/**
 * Factory for creating test data managers for different environments
 */
export class TestDataManagerFactory {
  static create(environment: 'local' | 'staging' | 'test'): TestDataManager {
    const config = {
      local: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        prefix: 'local_test'
      },
      staging: {
        supabaseUrl: process.env.STAGING_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        supabaseKey: process.env.STAGING_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        prefix: 'staging_test'
      },
      test: {
        supabaseUrl: process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        supabaseKey: process.env.TEST_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        prefix: 'automated_test'
      }
    };

    const envConfig = config[environment];
    return new TestDataManager(
      envConfig.supabaseUrl,
      envConfig.supabaseKey,
      envConfig.prefix
    );
  }
}