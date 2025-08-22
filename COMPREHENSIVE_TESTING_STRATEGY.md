# Comprehensive Testing Strategy for ClearSpendly Multi-Tenant SaaS

## Overview

This document outlines the complete testing strategy for ClearSpendly, designed specifically for a multi-tenant SaaS application with complex billing, subscription management, and payment processing requirements.

## Table of Contents

1. [Test Data Management Strategy](#test-data-management-strategy)
2. [Environment-Specific Testing](#environment-specific-testing)
3. [Automated Testing Framework](#automated-testing-framework)
4. [Continuous Testing Pipeline](#continuous-testing-pipeline)
5. [Test User Management](#test-user-management)
6. [Implementation Guide](#implementation-guide)
7. [Best Practices](#best-practices)

## Test Data Management Strategy

### Multi-Tenant Data Isolation

Our testing framework ensures complete isolation between tenant data using several key mechanisms:

**Test Tenant Creation**
```typescript
// Create isolated test tenant
const testDataManager = TestDataManager.create('staging');
const tenant = await testDataManager.createTestTenant({
  name: 'Test Tenant for Billing',
  subscription_plan: 'pro',
  subscription_status: 'active'
});
```

**Tenant-Specific Test Users**
```typescript
// Create users within tenant context
const adminUser = await testDataManager.createTestUser(tenant.id, {
  role: 'admin',
  email: 'admin-test@example.com'
});
```

### Test Data Cleanup and Reset

**Automated Cleanup**
- Runs after each test suite
- Removes all test data with `test_` prefix
- Respects foreign key constraints
- Logs cleanup operations

**Snapshot/Rollback Strategy**
```typescript
// Create snapshot before tests
await databaseUtils.createSnapshot('pre-billing-tests');

// Run tests...

// Restore to clean state
await databaseUtils.restoreFromSnapshot('pre-billing-tests');
```

**Usage Examples**

```bash
# Clean up test data manually
npm run test:cleanup

# Run tests with automatic cleanup
npm run test:api -- --cleanup

# Generate test report
npm run test:report
```

### Database Transaction Management

**Isolation Patterns**
- Each test gets a fresh tenant
- User sessions are scoped to tenant
- Database queries filtered by tenant_id
- RLS policies enforce data boundaries

## Environment-Specific Testing

### Local Development Testing

**Configuration**
```javascript
// Local test environment
const localConfig = {
  baseUrl: 'http://localhost:3000',
  maxTestUsers: 50,
  enableMockPayments: true,
  enableDebugLogging: true,
  testTimeout: 30000
};
```

**Usage**
```bash
# Run all tests locally
npm run test:local

# Run specific test suite
npm run test:unit
npm run test:api
npm run test:e2e
```

### Staging Environment Testing

**Configuration**
```javascript
// Staging test environment  
const stagingConfig = {
  baseUrl: 'https://staging.clearspendly.com',
  maxTestUsers: 20,
  enableMockPayments: false, // Use Stripe test mode
  enableDebugLogging: true,
  testTimeout: 45000
};
```

**Usage**
```bash
# Run staging tests
npm run test:staging

# Run load tests (staging only)
npm run test:load
```

### Production Environment Testing

**Smoke Tests Only**
```bash
# Run production smoke tests
npm run test:production

# Health checks
npm run health:all
```

## Automated Testing Framework

### Unit Testing with Jest

**Configuration**
- Separate configs for unit and API tests
- Coverage thresholds: 70% global, 80% for critical modules
- Isolated test environment with mocks
- Fast execution with parallel workers

**Example Unit Test**
```typescript
describe('SubscriptionService', () => {
  it('should calculate prorated amount correctly', async () => {
    const service = new SubscriptionService();
    const prorated = await service.calculateProration({
      currentPlan: 'pro',
      newPlan: 'business',
      daysRemaining: 15
    });
    
    expect(prorated).toBeCloseTo(15.00, 2);
  });
});
```

### API Testing

**Multi-tenant API Tests**
```typescript
describe('Subscriptions API', () => {
  let apiClient: ApiTestClient;
  
  beforeAll(async () => {
    apiClient = new ApiTestClient();
    await apiClient.authenticateAs('admin');
  });
  
  it('should enforce tenant isolation', async () => {
    const response = await apiClient.get('/api/subscriptions/current');
    
    // Should only see own tenant data
    expect(response.data.tenant_id).toBe(apiClient.getContext().tenantId);
  });
});
```

### E2E Testing with Playwright

**Browser Testing**
- Cross-browser support (Chrome, Firefox, Safari)
- Mobile device testing
- Visual regression testing
- Parallel execution

**Example E2E Test**
```typescript
test('billing upgrade flow', async ({ authenticatedPage, tenantData }) => {
  // Navigate to billing
  await authenticatedPage.goto('/dashboard/billing');
  
  // Select Pro plan
  await authenticatedPage.click('[data-testid="upgrade-to-pro"]');
  
  // Complete with test card
  await fillStripeForm(authenticatedPage, '4242424242424242');
  
  // Verify success
  await expect(authenticatedPage.locator('[data-testid="current-plan"]'))
    .toContainText('Pro');
});
```

## Continuous Testing Pipeline

### GitHub Actions Workflow

**Test Matrix**
- Unit tests: Always run
- API tests: Run on push/PR
- E2E tests: Staging and local only
- Smoke tests: Production only
- Load tests: Staging only

**Environment Detection**
```yaml
strategy:
  matrix:
    environment: [local, staging]
    browser: [chromium, firefox, webkit]
    exclude:
      - environment: staging
        browser: webkit  # Skip Safari on staging
```

### Pre-deployment Gates

**Required Checks**
- All unit tests pass
- API tests pass with > 95% success rate
- E2E tests pass on staging
- Security scans complete
- Performance benchmarks met

### Post-deployment Verification

**Health Checks**
```bash
# API health check
curl https://api.clearspendly.com/health

# Database connectivity
npm run health:check -- --db

# Critical user flows
npm run test:smoke -- --critical-only
```

## Test User Management

### Test User Factory

**User Creation**
```typescript
const factory = new TestUserFactory(supabaseUrl, supabaseKey);

// Create user with specific subscription
const paidUser = await factory.createTestUser({
  subscription: { plan: 'business', status: 'active' },
  role: 'admin'
});

// Create user cohort
const cohort = await factory.createUserCohort({
  admin: 1,
  users: 5,
  viewers: 2,
  subscriptionPlan: 'pro'
});
```

### Session Management

**Authenticated Sessions**
```typescript
// Create authenticated session
const session = await factory.createUserSession(user.email);

// Use in API tests
const apiClient = new ApiTestClient();
apiClient.setSession(session);

// Use in E2E tests
await page.addInitScript((sessionData) => {
  localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
}, session);
```

### User Lifecycle Management

**Automatic Cleanup**
- Users expire after configurable time
- Cleanup job runs every hour
- Failed tests trigger immediate cleanup
- Manual cleanup commands available

## Implementation Guide

### Getting Started

1. **Install Dependencies**
```bash
npm install --save-dev @playwright/test jest @testing-library/react
npm install --save-dev @testing-library/jest-dom jest-environment-jsdom
```

2. **Set Up Environment Variables**
```bash
# Copy example env file
cp .env.example .env.test

# Configure test database
TEST_SUPABASE_URL=your-test-supabase-url
TEST_SUPABASE_KEY=your-test-service-key
TEST_STRIPE_SECRET_KEY=sk_test_your-stripe-test-key
```

3. **Run Initial Tests**
```bash
# Verify setup
npm run test:unit -- --verbose

# Run specific test file
npm run test:unit lib/testing/test-data-manager.test.ts
```

### Adding New Tests

**Unit Test Template**
```typescript
// lib/services/my-service.test.ts
import { MyService } from './my-service';

describe('MyService', () => {
  let service: MyService;
  
  beforeEach(() => {
    service = new MyService();
  });
  
  it('should handle tenant context correctly', async () => {
    const result = await service.processForTenant('tenant-123');
    expect(result.tenantId).toBe('tenant-123');
  });
});
```

**API Test Template**
```typescript
// tests/api/my-endpoint.test.ts  
import { ApiTestClient } from '../api/api-test-client';

describe('My API Endpoint', () => {
  let apiClient: ApiTestClient;
  
  beforeAll(async () => {
    apiClient = new ApiTestClient();
    await apiClient.authenticateAs('admin');
  });
  
  afterAll(async () => {
    await apiClient.cleanup();
  });
  
  it('should return tenant-specific data', async () => {
    const response = await apiClient.get('/api/my-endpoint');
    expect(response.status).toBe(200);
  });
});
```

**E2E Test Template**
```typescript
// tests/e2e/my-flow.spec.ts
import { test, expect } from '../fixtures/tenant-fixture';

test('my user flow', async ({ authenticatedPage, tenantData }) => {
  await authenticatedPage.goto('/my-page');
  await expect(authenticatedPage.locator('h1')).toBeVisible();
});
```

### Custom Test Utilities

**Test Data Helpers**
```typescript
// tests/helpers/test-helpers.ts
export const createTestReceipt = (overrides = {}) => ({
  vendor_name: 'Test Vendor',
  total_amount: 29.99,
  currency: 'USD',
  receipt_date: new Date().toISOString(),
  ...overrides
});

export const waitForElement = async (page, selector, timeout = 5000) => {
  await page.waitForSelector(selector, { timeout });
};
```

## Best Practices

### Multi-Tenant Testing

1. **Always Test Tenant Isolation**
   - Create multiple tenants in tests
   - Verify data doesn't leak between tenants
   - Test RLS policies thoroughly

2. **Use Realistic Test Data**
   - Generate data that matches production patterns
   - Test edge cases and boundary conditions
   - Include invalid data scenarios

3. **Test Subscription States**
   - Free users with limits
   - Trial users approaching expiration
   - Paid users with full access
   - Past-due users with restricted access

### Performance Testing

1. **Load Testing Scenarios**
   - Concurrent user registration
   - Bulk receipt processing
   - High-volume API requests
   - Database connection limits

2. **Performance Benchmarks**
   - API responses < 2 seconds
   - Page loads < 3 seconds
   - Database queries < 500ms
   - File uploads < 10 seconds

### Security Testing

1. **Authentication & Authorization**
   - Test without authentication
   - Test with wrong tenant context
   - Test role-based permissions
   - Test session expiration

2. **Data Protection**
   - SQL injection attempts
   - XSS payload testing
   - CSRF token validation
   - Input sanitization

### Maintenance

1. **Regular Cleanup**
   - Schedule automated cleanup jobs
   - Monitor test database size
   - Archive old test results
   - Update test dependencies

2. **Test Health Monitoring**
   - Track test execution times
   - Monitor flaky tests
   - Review test coverage trends
   - Update test documentation

## Available Commands

### Test Execution
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only  
npm run test:api           # API tests only
npm run test:e2e           # E2E tests only
npm run test:smoke         # Smoke tests only
npm run test:load          # Load tests only
npm run test:billing       # Billing flow tests
```

### Environment-Specific
```bash
npm run test:local         # Local environment
npm run test:staging       # Staging environment  
npm run test:production    # Production smoke tests
```

### Utilities
```bash
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
npm run test:cleanup       # Clean test data
npm run test:report        # Generate report
```

### Database Management
```bash
npm run db:setup-test      # Setup test database
npm run test:cleanup       # Clear test data
```

## Monitoring and Reporting

### Test Metrics

**Coverage Requirements**
- Unit tests: 70% minimum, 80% for critical modules
- API tests: 65% minimum, 75% for billing/subscriptions
- E2E tests: Cover all critical user flows

**Performance Benchmarks**
- Unit tests: < 100ms per test
- API tests: < 2 seconds per test
- E2E tests: < 30 seconds per test

### Continuous Monitoring

**Daily Reports**
- Test success rates
- Performance trends
- Coverage changes
- Failed test analysis

**Alerts**
- Test failure rate > 5%
- Performance degradation > 20%
- Coverage drops below threshold
- Production smoke test failures

This comprehensive testing strategy ensures that ClearSpendly maintains high quality and reliability as it scales, with robust multi-tenant isolation, thorough automation, and efficient CI/CD integration.