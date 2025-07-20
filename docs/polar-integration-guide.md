# Polar.sh Integration Guide

## Overview
This guide explains how ClearSpendly integrates with Polar.sh for subscription billing and payment processing.

## Architecture

### Multi-Tenant Billing
- Each tenant has its own Polar customer
- Subscriptions are linked to tenants, not individual users
- Tenant owners can manage billing
- Usage limits are enforced at the tenant level

### Subscription Tiers
- **Free**: 10 receipts/month, 10GB storage
- **Pro**: Unlimited receipts, 100GB storage, $15/month

## Setup Instructions

### 1. Polar.sh Configuration
1. Create a Polar.sh account
2. Create a product for the Pro tier
3. Set up webhook endpoint: `https://your-domain.com/api/webhooks/polar`
4. Generate access token and webhook secret

### 2. Environment Variables
Update your `.env.local` with:
```env
POLAR_ACCESS_TOKEN=your_polar_access_token
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret
NEXT_PUBLIC_STARTER_TIER=your_polar_product_id
NEXT_PUBLIC_STARTER_SLUG=your_polar_product_slug
```

### 3. Database Migration
Run the Polar-specific migration:
```bash
# Apply the migration that adds Polar fields to tenants table
supabase db push
```

## API Endpoints

### Subscription Management
- `POST /api/subscriptions/create-checkout` - Create Polar checkout session
- `POST /api/subscriptions/customer-portal` - Get customer portal URL
- `POST /api/webhooks/polar` - Handle Polar webhooks

## Webhook Events

The system handles these Polar webhook events:

### subscription.created / subscription.updated
- Updates tenant subscription status
- Sets usage limits (unlimited for Pro, 10 for Free)
- Updates subscription period end date

### subscription.canceled
- Reverts tenant to free tier
- Resets usage limits to free tier values

### customer.created
- Links Polar customer ID to tenant
- Enables subscription management

## Usage Tracking

### Receipt Limits
- Free tier: 10 receipts per month per tenant
- Pro tier: Unlimited receipts
- Usage is tracked by tenant_id and reset monthly

### Storage Limits
- Free tier: 10GB per tenant
- Pro tier: 100GB per tenant

## Testing

### Local Development
1. Use ngrok to expose local webhook endpoint:
   ```bash
   ngrok http 3004
   ```
2. Configure Polar webhook URL to ngrok URL
3. Test subscription flows in Polar dashboard

### Test Cases
1. **New User Signup**: Creates tenant, no Polar customer yet
2. **Upgrade to Pro**: Creates Polar customer and subscription
3. **Subscription Active**: Webhook updates tenant limits
4. **Subscription Canceled**: Webhook reverts to free tier
5. **Usage Limits**: Receipt processing respects tenant limits

## Security

### Webhook Verification
- All webhook payloads are verified using HMAC-SHA256
- Invalid signatures are rejected with 401 status

### Tenant Isolation
- All subscription data is scoped to tenants
- Users can only access their tenant's billing information
- RLS policies ensure data isolation

## Troubleshooting

### Common Issues
1. **Missing Environment Variables**: Check all Polar variables are set
2. **Webhook Failures**: Verify webhook secret and endpoint URL
3. **Subscription Not Found**: Ensure customer is linked to tenant
4. **Usage Limits Not Updated**: Check webhook processing logs

### Debug Logging
- Webhook events are logged with tenant IDs
- Subscription updates include before/after states
- API errors include request context

## Development Workflow

### Adding New Features
1. Update tenant schema if needed
2. Add new webhook event handlers
3. Update subscription UI components
4. Test with Polar test mode
5. Deploy and configure production webhooks

### Monitoring
- Monitor webhook delivery success in Polar dashboard
- Track subscription status changes in application logs
- Alert on failed payment processing