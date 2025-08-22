/**
 * Playwright Tenant Fixture for ClearSpendly
 * 
 * Provides isolated tenant environments for E2E testing
 */

import { test as base, Page } from '@playwright/test';
import { TestDataManager, TestDataSeed } from '../../lib/testing/test-data-manager';
import { EnvironmentConfigManager } from '../../lib/testing/environment-config';

export interface TenantTestFixture {
  tenantData: TestDataSeed;
  authenticatedPage: Page;
  adminPage: Page;
  userPage: Page;
  testDataManager: TestDataManager;
}

// Create the fixture
export const test = base.extend<TenantTestFixture>({
  // Test data manager fixture
  testDataManager: async ({}, use) => {
    const environment = EnvironmentConfigManager.detectEnvironment();
    const manager = TestDataManager.create(environment);
    
    await use(manager);
    
    // Cleanup after test
    await manager.cleanup();
  },

  // Tenant data fixture
  tenantData: async ({ testDataManager }, use) => {
    const tenantData = await testDataManager.createTestScenario('E2E Test');
    
    await use(tenantData);
    
    // Tenant cleanup handled by testDataManager fixture
  },

  // Authenticated page fixture (admin user)
  authenticatedPage: async ({ page, tenantData, testDataManager }, use) => {
    const adminUser = tenantData.users.find(u => u.role === 'admin')!;
    const { session } = await testDataManager.getTestUserWithSession(adminUser.id);
    
    // Set authentication state
    await page.addInitScript((sessionData) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
    }, session);
    
    await use(page);
  },

  // Admin-specific page fixture
  adminPage: async ({ browser, tenantData, testDataManager }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const adminUser = tenantData.users.find(u => u.role === 'admin')!;
    const { session } = await testDataManager.getTestUserWithSession(adminUser.id);
    
    // Set authentication state
    await page.addInitScript((sessionData) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
      window.localStorage.setItem('tenant_id', sessionData.user.user_metadata.tenant_id);
    }, session);
    
    await use(page);
    
    await context.close();
  },

  // Regular user page fixture
  userPage: async ({ browser, tenantData, testDataManager }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const regularUser = tenantData.users.find(u => u.role === 'user')!;
    const { session } = await testDataManager.getTestUserWithSession(regularUser.id);
    
    // Set authentication state
    await page.addInitScript((sessionData) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
      window.localStorage.setItem('tenant_id', sessionData.user.user_metadata.tenant_id);
    }, session);
    
    await use(page);
    
    await context.close();
  }
});

export { expect } from '@playwright/test';