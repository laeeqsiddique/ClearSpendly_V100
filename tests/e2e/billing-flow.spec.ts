/**
 * E2E Tests for ClearSpendly Billing Flow
 */

import { test, expect } from '../fixtures/tenant-fixture';
import { EnvironmentFeatureFlags } from '../../lib/testing/environment-config';

test.describe('Billing and Subscription Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to billing page
    await authenticatedPage.goto('/dashboard/billing');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should display current subscription status', async ({ authenticatedPage, tenantData }) => {
    // Check that subscription information is visible
    await expect(authenticatedPage.locator('[data-testid="subscription-status"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="current-plan"]')).toContainText(/Free|Pro|Business/);
    
    // Verify tenant-specific branding
    await expect(authenticatedPage.locator('[data-testid="tenant-name"]')).toContainText(tenantData.tenant.name);
  });

  test('should show available subscription plans', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/billing');
    
    // Wait for plans to load
    await expect(authenticatedPage.locator('[data-testid="pricing-plans"]')).toBeVisible();
    
    // Verify all plans are shown
    await expect(authenticatedPage.locator('[data-testid="plan-free"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="plan-pro"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="plan-business"]')).toBeVisible();
    
    // Check pricing display
    await expect(authenticatedPage.locator('[data-testid="plan-pro-price"]')).toContainText('$19.99');
    await expect(authenticatedPage.locator('[data-testid="plan-business-price"]')).toContainText('$49.99');
  });

  test('should display usage metrics and limits', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/billing');
    
    // Check usage cards are visible
    await expect(authenticatedPage.locator('[data-testid="usage-receipts"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="usage-storage"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="usage-users"]')).toBeVisible();
    
    // Verify usage numbers are displayed
    const receiptsUsage = authenticatedPage.locator('[data-testid="receipts-count"]');
    await expect(receiptsUsage).toBeVisible();
    await expect(receiptsUsage).toContainText(/\d+/);
  });

  test.describe('Subscription Upgrade Flow', () => {
    test.skip(() => !EnvironmentFeatureFlags.isEnabled('enableMockPayments'), 'Mock payments not enabled');

    test('should initiate Pro plan upgrade', async ({ authenticatedPage }) => {
      // Click upgrade on Pro plan
      await authenticatedPage.click('[data-testid="upgrade-to-pro"]');
      
      // Should show checkout modal/page
      await expect(authenticatedPage.locator('[data-testid="checkout-modal"]')).toBeVisible();
      
      // Verify plan selection
      await expect(authenticatedPage.locator('[data-testid="selected-plan"]')).toContainText('Pro');
      await expect(authenticatedPage.locator('[data-testid="plan-price"]')).toContainText('$19.99');
    });

    test('should handle payment method selection', async ({ authenticatedPage }) => {
      await authenticatedPage.click('[data-testid="upgrade-to-pro"]');
      await expect(authenticatedPage.locator('[data-testid="checkout-modal"]')).toBeVisible();
      
      // Test Stripe payment option
      await authenticatedPage.click('[data-testid="payment-stripe"]');
      await expect(authenticatedPage.locator('[data-testid="stripe-elements"]')).toBeVisible();
      
      // Test PayPal payment option
      await authenticatedPage.click('[data-testid="payment-paypal"]');
      await expect(authenticatedPage.locator('[data-testid="paypal-button"]')).toBeVisible();
    });

    test('should complete subscription with test card', async ({ authenticatedPage }) => {
      if (!EnvironmentFeatureFlags.isEnabled('enableMockPayments')) {
        test.skip();
      }

      await authenticatedPage.click('[data-testid="upgrade-to-pro"]');
      await authenticatedPage.click('[data-testid="payment-stripe"]');
      
      // Fill in test credit card
      const cardNumber = authenticatedPage.frameLocator('[data-testid="card-number-frame"]').locator('[name="cardnumber"]');
      await cardNumber.fill('4242424242424242');
      
      const expiry = authenticatedPage.frameLocator('[data-testid="card-expiry-frame"]').locator('[name="exp-date"]');
      await expiry.fill('12/30');
      
      const cvc = authenticatedPage.frameLocator('[data-testid="card-cvc-frame"]').locator('[name="cvc"]');
      await cvc.fill('123');
      
      // Complete purchase
      await authenticatedPage.click('[data-testid="complete-purchase"]');
      
      // Verify success
      await expect(authenticatedPage.locator('[data-testid="subscription-success"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="current-plan"]')).toContainText('Pro');
    });
  });

  test.describe('Payment Method Management', () => {
    test('should display payment methods section', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/billing');
      
      await expect(authenticatedPage.locator('[data-testid="payment-methods"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="add-payment-method"]')).toBeVisible();
    });

    test('should open add payment method dialog', async ({ authenticatedPage }) => {
      await authenticatedPage.click('[data-testid="add-payment-method"]');
      
      await expect(authenticatedPage.locator('[data-testid="payment-method-modal"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="card-form"]')).toBeVisible();
    });
  });

  test.describe('Billing History', () => {
    test('should show billing history section', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/billing');
      
      // Scroll to billing history if needed
      await authenticatedPage.locator('[data-testid="billing-history"]').scrollIntoViewIfNeeded();
      await expect(authenticatedPage.locator('[data-testid="billing-history"]')).toBeVisible();
    });

    test('should display invoices when available', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/billing');
      
      const invoicesSection = authenticatedPage.locator('[data-testid="billing-history"]');
      await invoicesSection.scrollIntoViewIfNeeded();
      
      // Check if there are invoices or a no-invoices message
      const hasInvoices = await authenticatedPage.locator('[data-testid="invoice-item"]').count();
      const noInvoicesMessage = authenticatedPage.locator('[data-testid="no-invoices"]');
      
      if (hasInvoices > 0) {
        await expect(authenticatedPage.locator('[data-testid="invoice-item"]').first()).toBeVisible();
      } else {
        await expect(noInvoicesMessage).toBeVisible();
      }
    });
  });

  test.describe('Usage-based Feature Gating', () => {
    test('should enforce receipt upload limits', async ({ authenticatedPage, tenantData }) => {
      // Navigate to upload page
      await authenticatedPage.goto('/dashboard/upload');
      
      // If on free plan, should see usage warnings when approaching limits
      if (tenantData.tenant.subscription_plan === 'free') {
        const usageWarning = authenticatedPage.locator('[data-testid="usage-warning"]');
        
        // Check if warning exists (depends on current usage)
        if (await usageWarning.count() > 0) {
          await expect(usageWarning).toContainText(/limit|upgrade/i);
        }
      }
    });

    test('should show upgrade prompts for premium features', async ({ authenticatedPage, tenantData }) => {
      if (tenantData.tenant.subscription_plan === 'free') {
        // Navigate to analytics (premium feature)
        await authenticatedPage.goto('/dashboard/analytics');
        
        // Should show upgrade prompt or limited view
        const upgradePrompt = authenticatedPage.locator('[data-testid="upgrade-prompt"]');
        const limitedView = authenticatedPage.locator('[data-testid="limited-analytics"]');
        
        const hasUpgradePrompt = await upgradePrompt.count() > 0;
        const hasLimitedView = await limitedView.count() > 0;
        
        expect(hasUpgradePrompt || hasLimitedView).toBe(true);
      }
    });
  });

  test.describe('Multi-tenant Isolation', () => {
    test('should only show tenant-specific billing data', async ({ authenticatedPage, tenantData, testDataManager }) => {
      // Create another tenant for comparison
      const otherTenant = await testDataManager.createTestTenant({
        name: 'Other Test Tenant'
      });
      
      // Verify current page shows only our tenant data
      await authenticatedPage.goto('/dashboard/billing');
      
      await expect(authenticatedPage.locator('[data-testid="tenant-name"]')).toContainText(tenantData.tenant.name);
      await expect(authenticatedPage.locator('[data-testid="tenant-name"]')).not.toContainText(otherTenant.name);
      
      // Cleanup other tenant
      await testDataManager.resetTenantData(otherTenant.id);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle payment failures gracefully', async ({ authenticatedPage }) => {
      if (!EnvironmentFeatureFlags.isEnabled('enableMockPayments')) {
        test.skip();
      }

      await authenticatedPage.click('[data-testid="upgrade-to-pro"]');
      await authenticatedPage.click('[data-testid="payment-stripe"]');
      
      // Use declined test card
      const cardNumber = authenticatedPage.frameLocator('[data-testid="card-number-frame"]').locator('[name="cardnumber"]');
      await cardNumber.fill('4000000000000002'); // Declined card
      
      const expiry = authenticatedPage.frameLocator('[data-testid="card-expiry-frame"]').locator('[name="exp-date"]');
      await expiry.fill('12/30');
      
      const cvc = authenticatedPage.frameLocator('[data-testid="card-cvc-frame"]').locator('[name="cvc"]');
      await cvc.fill('123');
      
      await authenticatedPage.click('[data-testid="complete-purchase"]');
      
      // Should show error message
      await expect(authenticatedPage.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="payment-error"]')).toContainText(/declined|failed/i);
    });

    test('should handle network errors', async ({ authenticatedPage }) => {
      // Simulate offline condition
      await authenticatedPage.context().setOffline(true);
      
      await authenticatedPage.goto('/dashboard/billing');
      
      // Should show appropriate error state
      const errorState = authenticatedPage.locator('[data-testid="network-error"], [data-testid="loading-error"]');
      await expect(errorState).toBeVisible({ timeout: 10000 });
      
      // Restore connection
      await authenticatedPage.context().setOffline(false);
    });
  });
});