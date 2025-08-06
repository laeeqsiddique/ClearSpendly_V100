# Flowvya Subscription System - Complete Implementation Guide

## Overview

This document outlines the complete membership/subscription system implemented for Flowvya SaaS application. The system supports multi-tenant architecture with Stripe and PayPal payment integrations, feature gating, usage limits, and comprehensive billing management.

## Architecture Components

### 1. Database Schema (`20250806000001_create_subscription_system.sql`)

**Core Tables:**
- `subscription_plan` - Available subscription tiers (Free, Pro, Business, Enterprise)
- `subscription` - Active tenant subscriptions
- `subscription_usage` - Historical usage tracking
- `subscription_transaction` - Payment history and transactions
- `feature_flag` - Per-tenant feature overrides

**Key Features:**
- Multi-provider support (Stripe + PayPal)
- Flexible pricing (monthly/yearly)
- Usage tracking and limits
- Feature-based access control
- Trial period management
- Automated billing cycle handling

### 2. Service Layer

#### Subscription Service (`lib/subscription-service.ts`)
- **Plan Management:** Retrieve available subscription plans
- **Subscription Lifecycle:** Create, update, cancel subscriptions
- **Provider Integration:** Unified interface for Stripe and PayPal
- **Usage Tracking:** Monitor and enforce usage limits
- **Feature Gating:** Check feature availability

#### Feature Gating (`lib/feature-gating.ts`)
- **Feature Control:** Boolean and level-based features
- **Usage Limits:** Enforce monthly/storage/user limits
- **Middleware Support:** API route protection
- **Override System:** Temporary feature access

### 3. API Endpoints

#### Subscription Management
- `GET /api/subscriptions/plans` - Available plans
- `GET /api/subscriptions/current` - Current subscription
- `GET /api/subscriptions/usage` - Usage statistics
- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/change` - Upgrade/downgrade
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/payment-history` - Transaction history

#### Webhook Handlers
- `POST /api/webhooks/stripe/subscriptions` - Stripe events
- `POST /api/webhooks/paypal/subscriptions` - PayPal events

### 4. User Interface

#### Billing Dashboard (`app/dashboard/billing/page.tsx`)
- **Plan Comparison:** Interactive pricing cards
- **Usage Monitoring:** Real-time usage displays
- **Subscription Management:** Upgrade/cancel controls
- **Payment History:** Transaction logs and invoices

#### UI Components
- `PricingCard` - Plan selection with provider choice
- `UsageCard` - Visual usage indicators with progress bars
- `SubscriptionDetails` - Current subscription information
- `PaymentHistory` - Transaction history table

## Subscription Tiers

### Free Tier
- **Limits:** 10 receipts/month, 2 invoices, 100MB storage
- **Features:** Basic OCR, basic analytics
- **Price:** $0/month

### Pro Tier
- **Limits:** 500 receipts/month, 50 invoices, 5GB storage
- **Features:** Enhanced OCR, email templates, custom branding
- **Price:** $19.99/month, $199.99/year (17% savings)

### Business Tier
- **Limits:** Unlimited receipts/invoices, 25GB storage, 10 users
- **Features:** Premium OCR, multi-user, API access, integrations
- **Price:** $49.99/month, $499.99/year (17% savings)

### Enterprise Tier
- **Limits:** Unlimited everything
- **Features:** All features + dedicated support, SLA, custom features
- **Price:** $99.99/month, $999.99/year (17% savings)

## Feature Gating System

### Available Features
- **OCR Processing:** basic/enhanced/premium levels
- **Email Templates:** Boolean feature
- **Analytics:** basic/advanced/premium levels
- **Multi-User Access:** Boolean feature
- **API Access:** none/basic/full levels
- **Integrations:** Boolean feature
- **Priority Support:** Boolean feature
- **Custom Branding:** Boolean feature

### Usage Limits
- **receipts_per_month:** Monthly receipt processing
- **invoices_per_month:** Monthly invoice creation
- **storage_mb:** File storage space
- **users_max:** Team member count

## Setup Instructions

### 1. Database Migration
```bash
# Apply the subscription system migration
supabase db push

# Verify tables are created
supabase db diff
```

### 2. Environment Variables
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BUSINESS_EMAIL=business@yourcompany.com

# Application URLs
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

### 3. Stripe Setup

#### Create Products and Prices
```javascript
// Use Stripe Dashboard or API to create:
// 1. Products for each plan (Free, Pro, Business, Enterprise)
// 2. Recurring prices for monthly/yearly billing
// 3. Update subscription_plan table with Stripe IDs
```

#### Configure Webhooks
```
Webhook URL: https://yourapp.com/api/webhooks/stripe/subscriptions
Events:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
- customer.subscription.trial_will_end
```

### 4. PayPal Setup

#### Create Billing Plans
```bash
# Use PayPal API to create billing plans
# Update subscription_plan table with PayPal plan IDs
```

#### Configure Webhooks
```
Webhook URL: https://yourapp.com/api/webhooks/paypal/subscriptions
Events:
- BILLING.SUBSCRIPTION.ACTIVATED
- BILLING.SUBSCRIPTION.CANCELLED
- BILLING.SUBSCRIPTION.SUSPENDED
- PAYMENT.SALE.COMPLETED
```

### 5. Update Existing API Routes

#### Add Feature Gating
```typescript
import { requireFeature, requireUsage } from '@/lib/feature-gating';

// Example: Protect analytics endpoint
export async function GET(request: NextRequest) {
  await requireFeature('advanced_reporting');
  // ... rest of handler
}

// Example: Enforce receipt processing limits
export async function POST(request: NextRequest) {
  const featureGate = await requireUsage('receipts_per_month');
  // ... process receipt
  await featureGate.incrementUsage('receipts_per_month');
}
```

## Security Considerations

### 1. Payment Data Protection
- **No Card Storage:** All payment methods stored with providers
- **PCI Compliance:** Using Stripe/PayPal SDKs for PCI compliance
- **Webhook Verification:** All webhooks verified with signatures
- **Encryption:** Sensitive configuration encrypted at rest

### 2. Multi-Tenant Isolation
- **RLS Policies:** All subscription tables have tenant-based RLS
- **API Security:** All endpoints validate tenant access
- **Usage Isolation:** Usage counters isolated per tenant
- **Feature Isolation:** Feature flags scoped to tenants

### 3. Rate Limiting & Abuse Prevention
- **Usage Monitoring:** Real-time usage tracking
- **Automated Limits:** Hard stops when limits exceeded
- **Grace Periods:** Brief grace periods for legitimate overages
- **Fraud Detection:** Unusual usage pattern detection

## Testing Strategy

### 1. Unit Tests
- Subscription service methods
- Feature gating logic
- Usage calculation functions
- Payment webhook handlers

### 2. Integration Tests
- End-to-end subscription flows
- Webhook event processing
- Usage limit enforcement
- Feature gate validation

### 3. Load Testing
- High-volume usage tracking
- Concurrent subscription operations
- Database performance under load
- API rate limiting behavior

## Monitoring & Analytics

### 1. Business Metrics
- Monthly Recurring Revenue (MRR)
- Customer Lifetime Value (CLV)
- Churn rate by plan
- Usage patterns by tier
- Feature adoption rates

### 2. Technical Metrics
- API response times
- Webhook processing latency
- Database query performance
- Error rates by endpoint

### 3. Alerting
- Failed payments
- Webhook failures
- Usage limit breaches
- System errors

## Migration Strategy

### 1. Existing Tenants
- All existing tenants automatically assigned Free plan
- Trial periods set to 14 days from migration
- Usage counters initialized to zero
- No interruption to current functionality

### 2. Gradual Rollout
- Feature gates initially disabled (allow all)
- Gradual activation of usage limits
- Email notifications for limit approaches
- Grace period for plan upgrades

## Support & Maintenance

### 1. Customer Support
- Billing dashboard for self-service
- Usage monitoring and alerts
- Upgrade/downgrade automation
- Payment failure recovery flows

### 2. Administrative Tools
- Admin dashboard for subscription management
- Usage override capabilities
- Feature flag management
- Payment reconciliation tools

### 3. Maintenance Tasks
- Monthly usage reset automation
- Failed payment retry logic
- Invoice generation and delivery
- Subscription analytics reporting

## Future Enhancements

### 1. Advanced Features
- Usage-based pricing models
- Custom plan creation
- Corporate/team billing
- Multi-currency support
- Tax calculation integration

### 2. Integration Expansions
- Additional payment providers
- Accounting software integrations
- Customer success platforms
- Advanced analytics platforms

### 3. User Experience
- Mobile-optimized billing
- Progressive web app features
- Advanced usage dashboards
- Predictive usage alerts

---

This subscription system provides a robust foundation for SaaS billing while maintaining security, scalability, and user experience best practices. The modular design allows for easy expansion and customization as business requirements evolve.