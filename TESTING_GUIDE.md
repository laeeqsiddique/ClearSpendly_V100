It I# ClearSpendly Billing & Subscription Testing Guide

This guide provides comprehensive instructions for testing the complete billing and subscription system of ClearSpendly, including test credit cards, PayPal sandbox integration, and automated testing scenarios.

## 🚀 Quick Start

### Prerequisites
1. Environment variables configured (see `.env.example`)
2. Supabase project setup with proper RLS policies
3. Stripe test keys configured
4. PayPal sandbox credentials configured
5. Local development server running (`npm run dev`)

### Run Automated Tests
```bash
# Install dependencies if not already done
npm install

# Run comprehensive billing flow tests
node scripts/test-billing-flow.js

# Run with verbose logging
NODE_ENV=development node scripts/test-billing-flow.js --verbose

# Display test credit card information
node scripts/test-billing-flow.js --cards
```

## 💳 Test Credit Cards

### Stripe Test Cards

#### ✅ Successful Payment Cards
| Card Brand | Number | Expiry | CVC | Description |
|------------|--------|--------|-----|-------------|
| Visa | `4242424242424242` | 12/30 | 123 | Standard successful payment |
| Visa Debit | `4000056655665556` | 12/30 | 123 | Debit card successful payment |
| Mastercard | `5555555555554444` | 12/30 | 123 | Mastercard successful payment |
| American Express | `378282246310005` | 12/30 | 1234 | Amex successful payment (4-digit CVC) |
| Discover | `6011111111111117` | 12/30 | 123 | Discover successful payment |

#### ❌ Failure Scenario Cards
| Card Number | Error Type | Description |
|-------------|------------|-------------|
| `4000000000000002` | Card Declined | Generic decline |
| `4000000000009995` | Insufficient Funds | Not enough money |
| `4000000000009987` | Lost Card | Card reported lost |
| `4000000000009979` | Stolen Card | Card reported stolen |
| `4000000000000069` | Expired Card | Card has expired |
| `4000000000000127` | Invalid CVC | CVC check fails |
| `4000000000000101` | Processing Error | Generic processing error |

#### 🔄 Special Scenario Cards
| Card Number | Scenario | Description |
|-------------|----------|-------------|
| `4000002500003155` | Requires Authentication | 3D Secure authentication |
| `4000002760003184` | Always Authenticate | Always requires 3D Secure |
| `4000003800000446` | Radar Block | Blocked by Radar rules |
| `4000000000000341` | Attach to Account | Requires account attachment |

### PayPal Sandbox Accounts

For PayPal testing, use the sandbox environment with these test accounts:

#### Test Business Account
- **Email**: `business@example.com`
- **Password**: `testpassword123`
- **Account Type**: Business
- **Balance**: $5,000 USD

#### Test Personal Account  
- **Email**: `personal@example.com`
- **Password**: `testpassword123`
- **Account Type**: Personal
- **Balance**: $1,000 USD

## 🧪 Manual Testing Scenarios

### 1. User Registration & Onboarding

#### Test Case 1.1: Standard Email Registration
1. Navigate to `/sign-up`
2. Enter test email: `test-{timestamp}@example.com`
3. Enter password: `TestPassword123!`
4. Enter organization name: `Test Company {timestamp}`
5. Submit form and verify email confirmation
6. Complete onboarding flow
7. Verify tenant creation and default subscription

#### Test Case 1.2: Google OAuth Registration
1. Navigate to `/sign-up`
2. Click "Sign up with Google"
3. Use Google test account
4. Complete onboarding flow
5. Verify account linking and tenant setup

#### Test Case 1.3: Team Invitation Flow
1. Create primary account (Test Case 1.1)
2. Navigate to `/dashboard/team`
3. Invite team member with email
4. Accept invitation in new browser/incognito
5. Verify role assignment and permissions

### 2. Subscription Management

#### Test Case 2.1: Free Plan Trial
1. Complete user registration
2. Verify free plan limits (10 receipts/month)
3. Upload test receipts to verify counting
4. Check usage dashboard
5. Approach limits and verify upgrade prompts

#### Test Case 2.2: Stripe Subscription Creation
1. Navigate to `/dashboard/billing`
2. Select Pro plan ($19.99/month)
3. Choose Stripe payment
4. Use test card: `4242424242424242`
5. Complete payment flow
6. Verify subscription activation
7. Check updated feature access

#### Test Case 2.3: PayPal Subscription Creation
1. Navigate to `/dashboard/billing`
2. Select Business plan ($49.99/month)  
3. Choose PayPal payment
4. Login with sandbox account
5. Approve subscription
6. Return to app and verify activation

#### Test Case 2.4: Failed Payment Handling
1. Create subscription with card: `4000000000000002`
2. Verify payment failure notification
3. Check dunning email sequence
4. Update payment method
5. Verify successful retry

#### Test Case 2.5: Subscription Upgrade
1. Start with Pro plan
2. Navigate to billing dashboard
3. Select upgrade to Business plan
4. Verify proration calculation
5. Complete upgrade
6. Verify immediate feature access

#### Test Case 2.6: Subscription Cancellation
1. Navigate to subscription management
2. Click cancel subscription
3. Choose cancellation reason
4. Verify cancellation at period end
5. Check win-back email sequence

### 3. Feature Gating & Usage Limits

#### Test Case 3.1: Receipt Processing Limits
1. Start with Free plan (10 receipts/month)
2. Upload 10 test receipts
3. Attempt 11th receipt upload
4. Verify upgrade prompt
5. Upgrade plan and retry

#### Test Case 3.2: Multi-User Limits  
1. Start with Pro plan (1 user limit)
2. Attempt to invite team member
3. Verify upgrade prompt to Business plan
4. Upgrade and retry invitation

#### Test Case 3.3: Storage Limits
1. Upload large files to approach storage limit
2. Verify storage usage tracking
3. Check warnings at 80%, 90% usage
4. Hit limit and verify upgrade prompts

### 4. Payment Method Management

#### Test Case 4.1: Add Payment Method
1. Navigate to payment methods
2. Click "Add Payment Method"
3. Enter test card details
4. Verify card saved and set as default

#### Test Case 4.2: Update Payment Method
1. Add multiple payment methods
2. Set different default method
3. Verify subscription uses new default
4. Update billing address

#### Test Case 4.3: Remove Payment Method
1. Add multiple payment methods
2. Remove non-default method (should succeed)
3. Attempt to remove default method (should warn)
4. Replace default method first, then remove

### 5. Admin Panel Testing

#### Test Case 5.1: Subscription Overview
1. Login as admin user
2. Navigate to `/dashboard/admin/subscriptions`
3. Review tenant subscription health
4. Check usage analytics
5. Verify churn and revenue metrics

#### Test Case 5.2: Manual Adjustments
1. Select tenant for adjustment
2. Apply credit to account
3. Extend trial period
4. Change subscription plan manually
5. Verify audit trail

#### Test Case 5.3: Coupon Management
1. Create discount coupon (20% off)
2. Set usage limits and expiration
3. Apply coupon to test subscription
4. Verify discount application
5. Track coupon usage analytics

## 🤖 Automated Testing

### Test Suite Structure
The automated test suite (`scripts/test-billing-flow.js`) covers:

1. **User Registration & Authentication**
   - Email/password signup
   - Session management
   - Onboarding completion

2. **Subscription Management**
   - Plan fetching and validation
   - Subscription creation flow
   - Current subscription retrieval
   - Usage tracking verification

3. **Payment Integration**
   - Setup intent creation
   - Payment method management
   - Billing predictions API

4. **Feature Gating**
   - Usage limit enforcement
   - Feature availability checks
   - Upgrade prompt triggers

### Running Specific Test Categories
```bash
# Test only authentication flow
node scripts/test-billing-flow.js --category=auth

# Test only payment methods
node scripts/test-billing-flow.js --category=payments

# Test only subscription creation
node scripts/test-billing-flow.js --category=subscriptions
```

### Test Data Cleanup
The test suite automatically cleans up:
- Test user sessions
- Created subscriptions
- Test payment methods
- Generated test data

For manual cleanup:
```bash
# Reset test database (development only)
npm run db:reset

# Clear test Stripe data
npm run stripe:cleanup-test-data
```

## 🔍 Debugging & Troubleshooting

### Common Issues

#### 1. Stripe Webhooks Not Received
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test webhook endpoint
stripe trigger payment_intent.succeeded
```

#### 2. PayPal Sandbox Issues
- Verify sandbox account credentials
- Check PayPal Developer Dashboard for test accounts
- Ensure webhook URLs are configured correctly
- Test in PayPal sandbox environment

#### 3. Database Connection Issues
```bash
# Check Supabase connection
npx supabase status

# Reset local database
npx supabase db reset

# Run migrations
npx supabase migration up
```

#### 4. Environment Variables
Create `.env.local` with required variables:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal Configuration
PAYPAL_CLIENT_ID=your-sandbox-client-id
PAYPAL_CLIENT_SECRET=your-sandbox-client-secret
PAYPAL_WEBHOOK_ID=your-webhook-id

# Application URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Logging & Monitoring

#### Enable Debug Logging
```bash
# Enable verbose logging
DEBUG=billing,payments,subscriptions npm run dev

# Enable Stripe debug logging
STRIPE_DEBUG=true npm run dev

# Enable PayPal debug logging  
PAYPAL_DEBUG=true npm run dev
```

#### Check Application Logs
```bash
# Tail application logs
tail -f logs/application.log

# Tail payment logs
tail -f logs/payments.log

# Tail webhook logs
tail -f logs/webhooks.log
```

## 📊 Test Reporting

### Automated Test Reports
The test suite generates detailed reports:
- `test-results/billing-flow-report.json` - Machine-readable results
- `test-results/billing-flow-report.html` - Human-readable report
- `test-results/coverage-report.html` - Code coverage report

### Performance Benchmarks
Key performance metrics to monitor:
- **Subscription Creation**: < 3 seconds
- **Payment Processing**: < 5 seconds  
- **Usage Calculation**: < 1 second
- **Feature Gate Checks**: < 100ms

### Success Criteria
- ✅ All core flows complete successfully
- ✅ Payment methods work with test cards
- ✅ Usage limits are enforced correctly
- ✅ Feature gating works as expected
- ✅ Admin panel functions properly
- ✅ Email notifications are sent
- ✅ Webhooks are processed correctly

## 🎯 Production Readiness Checklist

### Before Going Live
- [ ] Replace test API keys with production keys
- [ ] Update webhook endpoints to production URLs
- [ ] Configure production email templates
- [ ] Set up monitoring and alerting
- [ ] Test with real bank accounts (small amounts)
- [ ] Verify PCI compliance requirements
- [ ] Configure proper error handling
- [ ] Set up customer support integration
- [ ] Test subscription cancellation flows
- [ ] Verify dunning management works correctly

### Post-Launch Monitoring
- [ ] Monitor payment success rates
- [ ] Track subscription churn metrics
- [ ] Monitor webhook delivery rates
- [ ] Watch for failed payment patterns  
- [ ] Track feature usage analytics
- [ ] Monitor customer support tickets
- [ ] Analyze conversion funnel performance

## 📞 Support & Resources

### Documentation
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [PayPal Sandbox Guide](https://developer.paypal.com/developer/applications/sandbox)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

### Internal Resources  
- Slack: `#clearspendly-billing`
- Wiki: [Billing System Documentation](internal-wiki-link)
- Runbooks: [Payment Incident Response](runbook-link)

### Emergency Contacts
- **Payment Issues**: payment-support@clearspendly.com
- **Technical Issues**: tech-support@clearspendly.com  
- **Security Issues**: security@clearspendly.com

---

*This testing guide is maintained by the ClearSpendly engineering team. Last updated: 2025-01-19*