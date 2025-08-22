# Comprehensive Payment and Billing Architecture for ClearSpendly

## Overview

This document outlines the complete payment and billing architecture implemented for ClearSpendly, addressing all identified gaps in the user flow analysis. The architecture provides a robust, secure, and scalable solution for subscription management, payment processing, and billing operations.

## Architecture Components

### 1. Payment Integration Architecture

#### Stripe Integration (`lib/stripe-service.ts`)
- **Test Mode Implementation**: Full support for Stripe test mode with comprehensive test card scenarios
- **Customer Management**: Create, update, and manage Stripe customers with tenant isolation
- **Subscription Management**: Complete lifecycle management (create, update, pause, resume, cancel, reactivate)
- **Payment Method Management**: Add, remove, update, and set default payment methods
- **Setup Intents**: Secure payment method collection without immediate charges
- **Webhooks**: Comprehensive webhook handling for all subscription and payment events
- **Billing Portal**: Customer self-service portal integration
- **Coupons & Discounts**: Full coupon management and application system

#### PayPal Integration (`lib/paypal-service.ts`)
- **Sandbox Integration**: Complete PayPal sandbox support for development and testing
- **Subscription Management**: PayPal billing plans and subscription lifecycle management
- **Order Processing**: PayPal order creation and capture for one-time payments
- **Webhook Support**: PayPal webhook processing for subscription events
- **Multi-tenant Configuration**: Tenant-specific PayPal integration settings

#### Test Cards and Scenarios
```typescript
export const TEST_CARDS = {
  // Successful payments
  VISA: '4242424242424242',
  MASTERCARD: '5555555555554444',
  
  // Declined payments
  DECLINED_GENERIC: '4000000000000002',
  DECLINED_INSUFFICIENT_FUNDS: '4000000000009995',
  
  // Special cases
  REQUIRE_AUTHENTICATION: '4000002500003155',
  PROCESSING_ERROR: '4000000000000119'
};
```

### 2. Payment Failure Handling & Dunning Management

#### Dunning Management Service (`lib/services/dunning-management.ts`)
- **Automatic Retry Logic**: Configurable retry intervals (1, 3, 7 days by default)
- **Payment Failure Tracking**: Comprehensive failure recording with reason codes
- **Grace Period Management**: Configurable grace periods before service suspension
- **Escalating Notifications**: Progressive urgency in payment failure communications
- **Recovery Tracking**: Monitoring of payment recovery success rates

#### Key Features:
- **Smart Retry Scheduling**: Exponential backoff with tenant-configurable intervals
- **Multi-provider Support**: Works with both Stripe and PayPal payment failures
- **Dunning Configuration**: Tenant-specific dunning rules and preferences
- **Failure Analytics**: Comprehensive statistics on payment failure patterns

### 3. Subscription Lifecycle Management

#### Subscription Lifecycle Service (`lib/services/subscription-lifecycle.ts`)
- **Plan Management**: Flexible subscription plans with feature gating
- **Trial Management**: Trial creation, extensions, and conversion tracking
- **Upgrades & Downgrades**: Automatic proration and plan transitions
- **Pause & Resume**: Temporary subscription suspension with automatic reactivation
- **Cancellation & Reactivation**: Win-back flows and cancellation feedback collection
- **Event Logging**: Complete audit trail of subscription lifecycle events

#### Subscription Plans:
```typescript
const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['OCR processing', 'Basic reporting', 'Up to 50 receipts']
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    trialDays: 14,
    features: ['Advanced OCR', 'Up to 500 receipts', 'CSV export']
  },
  // ... additional plans
];
```

### 4. Billing Operations System

#### Billing Operations Service (`lib/services/billing-operations.ts`)
- **Invoice Generation**: Automated invoice creation with customizable templates
- **Receipt Management**: Comprehensive payment receipt tracking and storage
- **Email Notifications**: Template-based email system for all billing events
- **Billing Analytics**: Revenue tracking, payment method analysis, and trends
- **Multi-currency Support**: Full support for multiple currencies and tax calculation

#### Notification Templates:
- **Payment Succeeded**: Confirmation emails with receipt details
- **Payment Failed**: Actionable failure notifications with retry information
- **Final Notice**: Urgent notifications before service suspension
- **Trial Ending**: Proactive trial conversion communications

### 5. Testing Framework

#### Payment Testing Framework (`lib/services/payment-testing.ts`)
- **Automated Test Scenarios**: Comprehensive test cases for all payment flows
- **Multi-provider Testing**: Tests for both Stripe and PayPal integrations
- **Lifecycle Testing**: Subscription upgrade, downgrade, pause, and cancel scenarios
- **Failure Simulation**: Payment failure and dunning process testing
- **Performance Monitoring**: Test execution timing and success rate tracking

#### Test Scenarios:
- **Successful Subscription Creation**: End-to-end subscription flow with trial
- **Payment Failure Handling**: Dunning management and retry logic testing
- **Subscription Upgrades**: Proration calculation and plan transition testing
- **Trial Extensions**: Trial period management and notifications
- **Payment Method Management**: Add, remove, and update payment methods
- **Webhook Processing**: Event handling and database synchronization

### 6. Database Schema

#### Enhanced Tables:
```sql
-- Payment failure tracking
CREATE TABLE payment_failures (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenant(id),
  subscription_id UUID,
  provider TEXT CHECK (provider IN ('stripe', 'paypal')),
  failure_reason TEXT,
  attempt_count INTEGER,
  next_retry_date TIMESTAMP,
  status TEXT CHECK (status IN ('pending', 'retrying', 'resolved', 'abandoned'))
);

-- Billing invoices
CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenant(id),
  subscription_id UUID,
  invoice_number TEXT,
  amount DECIMAL(10,2),
  status TEXT CHECK (status IN ('draft', 'open', 'paid', 'void')),
  due_date TIMESTAMP,
  line_items JSONB
);

-- Payment receipts
CREATE TABLE payment_receipts (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenant(id),
  receipt_number TEXT,
  amount DECIMAL(10,2),
  payment_method TEXT,
  payment_date TIMESTAMP
);
```

### 7. API Routes

#### Billing Management
- **GET/POST /api/billing/payment-methods**: Payment method management
- **POST /api/billing/setup-intent**: Secure payment method collection
- **POST /api/billing/subscription-lifecycle**: Subscription operations
- **GET/POST /api/billing/testing**: Payment testing framework access

#### Webhook Endpoints
- **POST /api/webhooks/stripe/subscriptions**: Stripe subscription events
- **POST /api/webhooks/paypal/subscriptions**: PayPal subscription events

#### Cron Jobs
- **POST /api/cron/payment-processing**: Automated payment and dunning tasks

### 8. Multi-Tenant Security

#### Data Isolation:
- **Row Level Security (RLS)**: All payment data isolated by tenant
- **API Middleware**: Tenant verification on all payment endpoints
- **Webhook Security**: Provider signature verification and tenant matching
- **Test Environment Isolation**: Separate test data per tenant

#### Security Features:
- **Payment Tokenization**: No sensitive card data stored
- **PCI Compliance**: Stripe and PayPal handle all card data
- **Audit Logging**: Complete payment and billing event trails
- **Permission-based Access**: Role-based access to billing features

## Usage Examples

### Creating a Subscription
```typescript
const result = await subscriptionLifecycleService.createSubscription({
  tenantId: 'tenant-uuid',
  planId: 'basic',
  provider: 'stripe',
  customerEmail: 'customer@example.com',
  trialDays: 14,
  couponCode: 'WELCOME20'
});
```

### Handling Payment Failures
```typescript
const result = await dunningService.handlePaymentFailure({
  tenantId: 'tenant-uuid',
  subscriptionId: 'sub-uuid',
  provider: 'stripe',
  providerFailureId: 'pi_failed_123',
  amount: 9.99,
  currency: 'USD',
  failureReason: 'Your card was declined'
});
```

### Running Payment Tests
```typescript
const results = await paymentTestingFramework.runAllTests('tenant-uuid', {
  categories: ['subscription', 'payment'],
  providers: ['stripe'],
  parallel: true
});
```

## Deployment Configuration

### Environment Variables
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal Configuration  
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# Testing
ENABLE_PAYMENT_TESTING=true
CRON_SECRET=your-cron-secret
```

### Cron Job Setup
```bash
# Railway.app cron configuration
# Every 15 minutes - process payment retries
0,15,30,45 * * * * curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/payment-processing

# Daily at 2 AM - send trial ending notifications
0 2 * * * curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/payment-processing
```

## Monitoring and Analytics

### Payment Metrics
- **Monthly Recurring Revenue (MRR)**
- **Annual Recurring Revenue (ARR)**
- **Churn Rate and Retention**
- **Payment Failure Rates**
- **Dunning Recovery Success**
- **Trial Conversion Rates**

### Billing Analytics
- **Revenue by Payment Method**
- **Invoice Payment Times**
- **Outstanding Receivables**
- **Seasonal Revenue Patterns**
- **Customer Lifetime Value**

## Error Handling and Recovery

### Graceful Degradation
- **Service Availability**: Continue operations when payment providers are down
- **Retry Logic**: Exponential backoff for transient failures
- **Fallback Mechanisms**: Alternative payment methods when primary fails
- **Data Consistency**: Ensures billing data integrity across provider failures

### Monitoring and Alerts
- **Payment Failure Alerts**: Real-time notifications for critical failures
- **Dunning Process Monitoring**: Track recovery success rates
- **Service Health Checks**: Monitor payment provider connectivity
- **Performance Metrics**: Track API response times and success rates

## Compliance and Security

### PCI Compliance
- **No Card Data Storage**: All sensitive data handled by payment providers
- **Tokenization**: Use payment method tokens for recurring charges
- **Secure Transmission**: HTTPS/TLS for all payment communications
- **Access Controls**: Restrict payment data access to authorized personnel

### GDPR Compliance
- **Data Minimization**: Store only necessary payment metadata
- **Right to Deletion**: Remove customer payment data on request
- **Data Portability**: Export billing history and payment records
- **Consent Management**: Track consent for payment processing

## Implementation Checklist

- ✅ **Stripe Integration**: Complete test mode implementation with all features
- ✅ **PayPal Integration**: Sandbox integration with subscription support
- ✅ **Payment Method Management**: Full CRUD operations for payment methods
- ✅ **Dunning Management**: Automated retry and recovery system
- ✅ **Subscription Lifecycle**: Complete lifecycle management with events
- ✅ **Billing Operations**: Invoice generation and receipt management
- ✅ **Email Notifications**: Template-based notification system
- ✅ **Testing Framework**: Comprehensive automated testing suite
- ✅ **Database Schema**: Enhanced tables with proper indexing and RLS
- ✅ **API Security**: Multi-tenant isolation and permission controls
- ✅ **Webhook Handling**: Secure event processing for both providers
- ✅ **Cron Jobs**: Automated background processing for billing tasks

This comprehensive payment and billing architecture provides ClearSpendly with a robust, scalable, and secure foundation for managing subscriptions, processing payments, and handling billing operations across multiple payment providers while maintaining strict multi-tenant data isolation.