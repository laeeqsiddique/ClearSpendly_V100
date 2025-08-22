/**
 * Test User Factory for ClearSpendly
 * 
 * Manages test user creation, lifecycle, and cleanup with multi-tenant support
 */

import { createClient, SupabaseClient, AuthSession } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import type { Database } from '../supabase/types';

export interface TestUserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  tenantId: string;
  subscription: {
    plan: 'free' | 'pro' | 'business';
    status: 'active' | 'trialing' | 'canceled' | 'past_due';
    limits: {
      receipts: number;
      users: number;
      storage: number;
    };
  };
  metadata: {
    createdAt: string;
    lastLogin?: string;
    testScenario: string;
    expiresAt?: string;
  };
}

export interface TestPaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  brand?: string;
  last4?: string;
  isDefault: boolean;
  metadata: {
    testCard?: boolean;
    scenario?: 'success' | 'decline' | 'insufficient_funds';
  };
}

export interface TestUserSession {
  user: TestUserProfile;
  session: AuthSession;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Factory for creating and managing test users
 */
export class TestUserFactory {
  private supabase: SupabaseClient<Database>;
  private activeUsers: Map<string, TestUserProfile> = new Map();
  private userSessions: Map<string, TestUserSession> = new Map();
  private testPrefix: string;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    testPrefix: string = 'test_factory'
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.testPrefix = testPrefix;
  }

  /**
   * Create a test user with specific characteristics
   */
  async createTestUser(options: {
    role?: 'admin' | 'user' | 'viewer';
    subscription?: {
      plan?: 'free' | 'pro' | 'business';
      status?: 'active' | 'trialing' | 'canceled';
    };
    tenant?: {
      id?: string;
      name?: string;
      create?: boolean;
    };
    scenario?: string;
    expiresInMinutes?: number;
  } = {}): Promise<TestUserProfile> {
    
    const uniqueId = nanoid(8);
    const timestamp = Date.now();
    
    const profile: TestUserProfile = {
      id: '',
      email: `${this.testPrefix}_user_${uniqueId}_${timestamp}@example.com`,
      role: options.role || 'user',
      tenantId: options.tenant?.id || '',
      subscription: {
        plan: options.subscription?.plan || 'free',
        status: options.subscription?.status || 'active',
        limits: this.getSubscriptionLimits(options.subscription?.plan || 'free')
      },
      metadata: {
        createdAt: new Date().toISOString(),
        testScenario: options.scenario || 'default',
        expiresAt: options.expiresInMinutes ? 
          new Date(Date.now() + options.expiresInMinutes * 60 * 1000).toISOString() : 
          undefined
      }
    };

    // Create tenant if needed
    if (!profile.tenantId) {
      if (options.tenant?.create !== false) {
        const tenant = await this.createTestTenant({
          name: options.tenant?.name || `Test Tenant for ${profile.email}`,
          subscription: profile.subscription
        });
        profile.tenantId = tenant.id;
      } else {
        throw new Error('Tenant ID required or tenant creation must be enabled');
      }
    }

    // Create auth user
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email: profile.email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        tenant_id: profile.tenantId,
        role: profile.role,
        test_user: true,
        test_scenario: profile.metadata.testScenario,
        created_by: 'test_factory',
        expires_at: profile.metadata.expiresAt
      }
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    profile.id = authData.user.id;

    // Create tenant membership
    const { error: membershipError } = await this.supabase
      .from('tenant_membership')
      .insert({
        user_id: profile.id,
        tenant_id: profile.tenantId,
        role: profile.role,
        status: 'active',
        invited_email: profile.email
      });

    if (membershipError) {
      // Clean up auth user if membership creation fails
      await this.supabase.auth.admin.deleteUser(profile.id);
      throw new Error(`Failed to create tenant membership: ${membershipError.message}`);
    }

    // Create subscription if not free
    if (profile.subscription.plan !== 'free') {
      await this.createTestSubscription(profile);
    }

    this.activeUsers.set(profile.id, profile);
    return profile;
  }

  /**
   * Create an authenticated session for a test user
   */
  async createUserSession(userIdOrEmail: string): Promise<TestUserSession> {
    let user: TestUserProfile | undefined;
    
    // Find user by ID or email
    if (userIdOrEmail.includes('@')) {
      user = Array.from(this.activeUsers.values()).find(u => u.email === userIdOrEmail);
    } else {
      user = this.activeUsers.get(userIdOrEmail);
    }

    if (!user) {
      throw new Error(`Test user not found: ${userIdOrEmail}`);
    }

    // Sign in the user
    const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
      email: user.email,
      password: 'TestPassword123!'
    });

    if (signInError || !signInData.session) {
      throw new Error(`Failed to create session: ${signInError?.message}`);
    }

    const session: TestUserSession = {
      user,
      session: signInData.session,
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      expiresAt: new Date(signInData.session.expires_at! * 1000).getTime()
    };

    // Update last login
    user.metadata.lastLogin = new Date().toISOString();
    this.userSessions.set(user.id, session);

    return session;
  }

  /**
   * Create test users in bulk for scenario testing
   */
  async createUserCohort(scenarios: {
    admin: number;
    users: number;
    viewers: number;
    tenantId?: string;
    subscriptionPlan?: 'free' | 'pro' | 'business';
  }): Promise<{
    admins: TestUserProfile[];
    users: TestUserProfile[];
    viewers: TestUserProfile[];
    tenant: { id: string; name: string };
  }> {
    
    // Create tenant if not provided
    let tenantId = scenarios.tenantId;
    let tenantName = 'Existing Tenant';
    
    if (!tenantId) {
      const tenant = await this.createTestTenant({
        name: `Cohort Test Tenant ${nanoid(6)}`,
        subscription: {
          plan: scenarios.subscriptionPlan || 'pro',
          status: 'active'
        }
      });
      tenantId = tenant.id;
      tenantName = tenant.name;
    }

    // Create users in parallel
    const userPromises = [];
    
    // Create admins
    for (let i = 0; i < scenarios.admin; i++) {
      userPromises.push(
        this.createTestUser({
          role: 'admin',
          tenant: { id: tenantId, create: false },
          subscription: { 
            plan: scenarios.subscriptionPlan || 'pro',
            status: 'active'
          },
          scenario: 'cohort_admin'
        })
      );
    }

    // Create regular users
    for (let i = 0; i < scenarios.users; i++) {
      userPromises.push(
        this.createTestUser({
          role: 'user',
          tenant: { id: tenantId, create: false },
          subscription: {
            plan: scenarios.subscriptionPlan || 'pro',
            status: 'active'
          },
          scenario: 'cohort_user'
        })
      );
    }

    // Create viewers
    for (let i = 0; i < scenarios.viewers; i++) {
      userPromises.push(
        this.createTestUser({
          role: 'viewer',
          tenant: { id: tenantId, create: false },
          subscription: {
            plan: scenarios.subscriptionPlan || 'pro',
            status: 'active'
          },
          scenario: 'cohort_viewer'
        })
      );
    }

    const allUsers = await Promise.all(userPromises);
    
    return {
      admins: allUsers.slice(0, scenarios.admin),
      users: allUsers.slice(scenarios.admin, scenarios.admin + scenarios.users),
      viewers: allUsers.slice(scenarios.admin + scenarios.users),
      tenant: { id: tenantId, name: tenantName }
    };
  }

  /**
   * Create users with specific billing scenarios
   */
  async createBillingTestUsers(): Promise<{
    freeUser: TestUserProfile;
    trialUser: TestUserProfile;
    paidUser: TestUserProfile;
    pastDueUser: TestUserProfile;
    canceledUser: TestUserProfile;
  }> {
    const [freeUser, trialUser, paidUser, pastDueUser, canceledUser] = await Promise.all([
      this.createTestUser({
        subscription: { plan: 'free', status: 'active' },
        scenario: 'billing_free_user'
      }),
      this.createTestUser({
        subscription: { plan: 'pro', status: 'trialing' },
        scenario: 'billing_trial_user'
      }),
      this.createTestUser({
        subscription: { plan: 'business', status: 'active' },
        scenario: 'billing_paid_user'
      }),
      this.createTestUser({
        subscription: { plan: 'pro', status: 'past_due' },
        scenario: 'billing_past_due_user'
      }),
      this.createTestUser({
        subscription: { plan: 'pro', status: 'canceled' },
        scenario: 'billing_canceled_user'
      })
    ]);

    return {
      freeUser,
      trialUser,
      paidUser,
      pastDueUser,
      canceledUser
    };
  }

  /**
   * Add test payment method to user
   */
  async addTestPaymentMethod(
    userId: string, 
    type: 'success_card' | 'decline_card' | 'paypal'
  ): Promise<TestPaymentMethod> {
    
    const user = this.activeUsers.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const testCards = {
      success_card: {
        number: '4242424242424242',
        brand: 'visa',
        last4: '4242',
        scenario: 'success' as const
      },
      decline_card: {
        number: '4000000000000002',
        brand: 'visa',
        last4: '0002',
        scenario: 'decline' as const
      },
      paypal: {
        scenario: 'success' as const
      }
    };

    const cardData = testCards[type];
    const paymentMethod: TestPaymentMethod = {
      id: `pm_test_${nanoid(8)}`,
      type: type === 'paypal' ? 'paypal' : 'card',
      brand: cardData.brand,
      last4: cardData.last4,
      isDefault: true, // First payment method is default
      metadata: {
        testCard: true,
        scenario: cardData.scenario
      }
    };

    // In a real implementation, this would create the payment method via Stripe/PayPal
    // For testing, we just track it locally
    return paymentMethod;
  }

  /**
   * Simulate user activity to test usage-based features
   */
  async simulateUserActivity(userId: string, activities: {
    uploadReceipts?: number;
    createInvoices?: number;
    addTeamMembers?: number;
    storageUsageMB?: number;
  }): Promise<void> {
    
    const user = this.activeUsers.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Create sample receipts
    if (activities.uploadReceipts) {
      const receipts = [];
      for (let i = 0; i < activities.uploadReceipts; i++) {
        receipts.push({
          tenant_id: user.tenantId,
          vendor_name: `Test Vendor ${i + 1}`,
          total_amount: Math.random() * 100,
          receipt_date: new Date().toISOString(),
          currency: 'USD',
          raw_text: `Test receipt ${i + 1}`,
          processed: true
        });
      }

      const { error } = await this.supabase
        .from('receipts')
        .insert(receipts);

      if (error) {
        throw new Error(`Failed to create receipts: ${error.message}`);
      }
    }

    // Create sample invoices
    if (activities.createInvoices) {
      const invoices = [];
      for (let i = 0; i < activities.createInvoices; i++) {
        invoices.push({
          tenant_id: user.tenantId,
          client_name: `Test Client ${i + 1}`,
          invoice_number: `INV-${nanoid(6)}`,
          amount: Math.random() * 1000,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'draft'
        });
      }

      const { error } = await this.supabase
        .from('invoices')
        .insert(invoices);

      if (error) {
        throw new Error(`Failed to create invoices: ${error.message}`);
      }
    }

    // Add team members (simulate only)
    if (activities.addTeamMembers) {
      for (let i = 0; i < activities.addTeamMembers; i++) {
        await this.createTestUser({
          role: 'user',
          tenant: { id: user.tenantId, create: false },
          scenario: 'simulated_team_member'
        });
      }
    }
  }

  /**
   * Get user by various identifiers
   */
  getUser(identifier: string): TestUserProfile | undefined {
    // Try by ID first
    let user = this.activeUsers.get(identifier);
    
    // Try by email
    if (!user) {
      user = Array.from(this.activeUsers.values()).find(u => u.email === identifier);
    }

    return user;
  }

  /**
   * List all active test users
   */
  listUsers(filter?: {
    role?: 'admin' | 'user' | 'viewer';
    tenantId?: string;
    scenario?: string;
  }): TestUserProfile[] {
    
    let users = Array.from(this.activeUsers.values());

    if (filter) {
      if (filter.role) {
        users = users.filter(u => u.role === filter.role);
      }
      if (filter.tenantId) {
        users = users.filter(u => u.tenantId === filter.tenantId);
      }
      if (filter.scenario) {
        users = users.filter(u => u.metadata.testScenario === filter.scenario);
      }
    }

    return users;
  }

  /**
   * Clean up expired test users
   */
  async cleanupExpiredUsers(): Promise<number> {
    const now = new Date();
    let cleanedUp = 0;

    for (const [userId, user] of this.activeUsers.entries()) {
      if (user.metadata.expiresAt && new Date(user.metadata.expiresAt) < now) {
        await this.deleteUser(userId);
        cleanedUp++;
      }
    }

    return cleanedUp;
  }

  /**
   * Delete a test user and cleanup related data
   */
  async deleteUser(userId: string): Promise<void> {
    const user = this.activeUsers.get(userId);
    if (!user) {
      return; // Already deleted or doesn't exist
    }

    try {
      // Delete user data in proper order
      await this.supabase.from('tenant_membership').delete().eq('user_id', userId);
      
      // Delete auth user
      await this.supabase.auth.admin.deleteUser(userId);

      // Remove from tracking
      this.activeUsers.delete(userId);
      this.userSessions.delete(userId);

    } catch (error) {
      console.warn(`Failed to fully delete user ${userId}:`, error);
    }
  }

  /**
   * Clean up all test users
   */
  async cleanup(): Promise<void> {
    const userIds = Array.from(this.activeUsers.keys());
    
    for (const userId of userIds) {
      await this.deleteUser(userId);
    }

    this.activeUsers.clear();
    this.userSessions.clear();
  }

  /**
   * Helper: Get subscription limits based on plan
   */
  private getSubscriptionLimits(plan: 'free' | 'pro' | 'business') {
    const limits = {
      free: { receipts: 10, users: 1, storage: 100 },
      pro: { receipts: 500, users: 5, storage: 1000 },
      business: { receipts: 2000, users: 25, storage: 5000 }
    };

    return limits[plan];
  }

  /**
   * Helper: Create test tenant
   */
  private async createTestTenant(options: {
    name: string;
    subscription: {
      plan: 'free' | 'pro' | 'business';
      status: 'active' | 'trialing' | 'canceled' | 'past_due';
    };
  }) {
    const tenantId = `${this.testPrefix}_tenant_${nanoid(8)}`;
    
    const { data, error } = await this.supabase
      .from('tenant')
      .insert({
        id: tenantId,
        name: options.name,
        slug: options.name.toLowerCase().replace(/\s+/g, '-'),
        subscription_status: options.subscription.status,
        subscription_plan: options.subscription.plan,
        settings: {},
        privacy_mode: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create tenant: ${error.message}`);
    }

    return data;
  }

  /**
   * Helper: Create test subscription
   */
  private async createTestSubscription(user: TestUserProfile) {
    const subscription = {
      tenant_id: user.tenantId,
      provider: 'stripe',
      external_id: `sub_test_${nanoid(8)}`,
      status: user.subscription.status,
      plan_name: `${user.subscription.plan.charAt(0).toUpperCase()}${user.subscription.plan.slice(1)} Plan`,
      billing_cycle: 'monthly',
      amount: user.subscription.plan === 'pro' ? 1999 : 4999,
      currency: 'USD',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const { error } = await this.supabase
      .from('subscriptions')
      .insert(subscription);

    if (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }
}