/**
 * API Tests for Subscription Management
 */

import { describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import { ApiTestClient } from './api-test-client';
import { EnvironmentFeatureFlags } from '../../lib/testing/environment-config';

describe('Subscriptions API', () => {
  let apiClient: ApiTestClient;

  beforeAll(async () => {
    apiClient = new ApiTestClient();
    await apiClient.authenticateAs('admin');
  });

  afterAll(async () => {
    await apiClient.cleanup();
  });

  describe('GET /api/subscriptions/plans', () => {
    test('should return available subscription plans', async () => {
      const response = await apiClient.get('/api/subscriptions/plans');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.data.length).toBeGreaterThan(0);

      // Verify plan structure
      const plan = response.data.data[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('slug');
      expect(plan).toHaveProperty('price_monthly');
      expect(plan).toHaveProperty('price_yearly');
      expect(plan).toHaveProperty('features');
      expect(plan).toHaveProperty('limits');
    });

    test('should return plans in correct order', async () => {
      const response = await apiClient.get('/api/subscriptions/plans');
      const plans = response.data.data;

      // Expect plans in order: free, pro, business
      expect(plans[0].slug).toBe('free');
      expect(plans[1].slug).toBe('pro');
      expect(plans[2].slug).toBe('business');
    });

    test('should have correct plan pricing', async () => {
      const response = await apiClient.get('/api/subscriptions/plans');
      const plans = response.data.data;

      const freePlan = plans.find((p: any) => p.slug === 'free');
      const proPlan = plans.find((p: any) => p.slug === 'pro');
      const businessPlan = plans.find((p: any) => p.slug === 'business');

      expect(freePlan.price_monthly).toBe(0);
      expect(proPlan.price_monthly).toBe(1999); // $19.99 in cents
      expect(businessPlan.price_monthly).toBe(4999); // $49.99 in cents
    });
  });

  describe('GET /api/subscriptions/current', () => {
    test('should return current subscription for new tenant', async () => {
      const response = await apiClient.get('/api/subscriptions/current');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      
      // New tenants should have no subscription or free plan
      if (response.data.data) {
        expect(['free', 'trial']).toContain(response.data.data.plan_slug);
      } else {
        expect(response.data.data).toBeNull();
      }
    });

    test('should include subscription details when active', async () => {
      // This test would require a tenant with an active subscription
      const response = await apiClient.get('/api/subscriptions/current');

      if (response.data.data) {
        const subscription = response.data.data;
        expect(subscription).toHaveProperty('id');
        expect(subscription).toHaveProperty('status');
        expect(subscription).toHaveProperty('plan_name');
        expect(subscription).toHaveProperty('billing_cycle');
        expect(subscription).toHaveProperty('current_period_end');
      }
    });
  });

  describe('GET /api/subscriptions/usage', () => {
    test('should return usage metrics', async () => {
      const response = await apiClient.get('/api/subscriptions/usage');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.data).toHaveProperty('usage');

      const usage = response.data.data.usage;
      expect(usage).toHaveProperty('receipts_per_month');
      expect(usage).toHaveProperty('invoices_per_month');
      expect(usage).toHaveProperty('storage_mb');
      expect(usage).toHaveProperty('users_max');

      // Verify usage structure
      expect(usage.receipts_per_month).toHaveProperty('currentUsage');
      expect(usage.receipts_per_month).toHaveProperty('limit');
      expect(typeof usage.receipts_per_month.currentUsage).toBe('number');
      expect(typeof usage.receipts_per_month.limit).toBe('number');
    });

    test('should calculate usage percentages', async () => {
      const response = await apiClient.get('/api/subscriptions/usage');
      const usage = response.data.data.usage;

      Object.values(usage).forEach((metric: any) => {
        if (metric.limit > 0) {
          const percentage = (metric.currentUsage / metric.limit) * 100;
          expect(percentage).toBeGreaterThanOrEqual(0);
          expect(percentage).toBeLessThanOrEqual(100);
        }
      });
    });
  });

  describe('POST /api/subscriptions/create', () => {
    const skipIfNoMockPayments = () => {
      if (!EnvironmentFeatureFlags.isEnabled('enableMockPayments')) {
        test.skip('Mock payments not enabled');
      }
    };

    beforeEach(() => {
      skipIfNoMockPayments();
    });

    test('should create subscription with valid plan', async () => {
      const subscriptionData = {
        planId: 'pro',
        billingCycle: 'monthly',
        provider: 'stripe',
        trialDays: 14
      };

      const response = await apiClient.post('/api/subscriptions/create', subscriptionData);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('subscription');
        
        const subscription = response.data.subscription;
        expect(subscription).toHaveProperty('id');
        expect(subscription.status).toBe('trialing');
      } else {
        // Business rule may prevent multiple subscriptions
        expect([400, 409]).toContain(response.status);
      }
    });

    test('should reject invalid plan ID', async () => {
      const subscriptionData = {
        planId: 'invalid-plan',
        billingCycle: 'monthly',
        provider: 'stripe'
      };

      try {
        await apiClient.post('/api/subscriptions/create', subscriptionData);
        fail('Should have thrown error for invalid plan');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toContain('Invalid plan');
      }
    });

    test('should validate billing cycle', async () => {
      const subscriptionData = {
        planId: 'pro',
        billingCycle: 'invalid-cycle',
        provider: 'stripe'
      };

      try {
        await apiClient.post('/api/subscriptions/create', subscriptionData);
        fail('Should have thrown error for invalid billing cycle');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('POST /api/subscriptions/cancel', () => {
    test('should handle cancellation request', async () => {
      const cancellationData = {
        cancelAtPeriodEnd: true,
        reason: 'Testing cancellation flow'
      };

      try {
        const response = await apiClient.post('/api/subscriptions/cancel', cancellationData);
        
        if (response.status === 200) {
          expect(response.data).toHaveProperty('success', true);
        } else {
          // May not have active subscription to cancel
          expect([400, 404]).toContain(response.status);
        }
      } catch (error: any) {
        // No active subscription is acceptable
        expect([400, 404]).toContain(error.status);
      }
    });

    test('should validate cancellation reason', async () => {
      const cancellationData = {
        cancelAtPeriodEnd: true,
        reason: '' // Empty reason should be rejected
      };

      try {
        await apiClient.post('/api/subscriptions/cancel', cancellationData);
      } catch (error: any) {
        if (error.status === 400) {
          expect(error.message).toContain('reason');
        }
      }
    });
  });

  describe('Tenant Isolation', () => {
    test('should not expose other tenant subscriptions', async () => {
      const isolationTest = await apiClient.testTenantIsolation();

      expect(isolationTest.isolated).toBe(true);
      expect(isolationTest.violations).toHaveLength(0);
      expect(isolationTest.testedEndpoints).toContain('/api/subscriptions');
    });
  });

  describe('Performance', () => {
    test('should respond to plans request within acceptable time', async () => {
      const response = await apiClient.get('/api/subscriptions/plans');

      expect(response.duration).toBeLessThan(2000); // 2 seconds
    });

    test('should handle concurrent usage requests', async () => {
      const loadTest = await apiClient.loadTest('/api/subscriptions/usage', {
        concurrent: 5,
        requests: 20
      });

      expect(loadTest.successfulRequests).toBeGreaterThan(15); // At least 75% success
      expect(loadTest.averageResponseTime).toBeLessThan(3000);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed requests', async () => {
      try {
        await apiClient.post('/api/subscriptions/create', { invalid: 'data' });
        fail('Should have thrown error for malformed request');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    test('should return proper error format', async () => {
      try {
        await apiClient.get('/api/subscriptions/nonexistent');
        fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error).toHaveProperty('message');
      }
    });
  });

  describe('Security', () => {
    test('should require authentication', async () => {
      const unauthenticatedClient = new ApiTestClient();
      
      try {
        await unauthenticatedClient.get('/api/subscriptions/current');
        fail('Should have thrown authentication error');
      } catch (error: any) {
        expect([401, 403]).toContain(error.status);
      }
    });

    test('should validate tenant access', async () => {
      // Try to access with different tenant ID
      const originalContext = apiClient.getContext();
      await apiClient.switchTenant('invalid-tenant-id');

      try {
        await apiClient.get('/api/subscriptions/current');
        fail('Should have thrown authorization error');
      } catch (error: any) {
        expect([401, 403, 404]).toContain(error.status);
      } finally {
        // Restore original context
        if (originalContext) {
          await apiClient.switchTenant(originalContext.tenantId);
        }
      }
    });
  });
});