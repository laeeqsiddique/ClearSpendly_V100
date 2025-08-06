# PayPal Integration Guide

## Overview

This guide covers the comprehensive PayPal integration for the multi-tenant SaaS invoicing application. The integration provides secure, tenant-isolated payment processing alongside the existing Stripe integration.

## Architecture

### Multi-Provider Payment System

The system now supports multiple payment providers per tenant:
- **Stripe**: Credit card processing with payment links
- **PayPal**: PayPal account and credit card processing
- **Provider Selection**: Automatic or manual provider selection per invoice

### Key Components

1. **Database Schema** (`/supabase/migrations/20250805000001_create_paypal_integration.sql`)
   - `payment_provider` table for tenant payment configurations
   - Extended `invoice` table with PayPal fields
   - `paypal_webhook_event` table for webhook processing and audit

2. **PayPal Service** (`/lib/paypal-service.ts`)
   - PayPal API integration using REST API v2
   - Order creation and capture
   - Webhook signature verification
   - Tenant configuration management

3. **API Endpoints**
   - `/api/webhooks/paypal` - PayPal webhook handler
   - `/api/payment-providers` - Provider management
   - `/api/invoices/payment-link` - Enhanced for multi-provider support

## Security Features

### Tenant Data Isolation

- **Row Level Security (RLS)**: All PayPal-related tables use RLS policies
- **Tenant-specific webhooks**: Each tenant gets unique webhook URLs
- **Provider verification**: Only verified providers can process payments
- **Access control**: Only tenant owners/admins can configure providers

### Payment Security

- **Webhook verification**: PayPal webhook signatures are validated
- **Idempotency**: Duplicate webhook events are handled gracefully
- **Audit trail**: All payment events are logged with full audit trail
- **Error handling**: Comprehensive error handling with retry logic

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BUSINESS_EMAIL=your_business_email@example.com

# Required for webhook URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. PayPal Developer Setup

1. Create a PayPal developer account at https://developer.paypal.com
2. Create a new application
3. Get your Client ID and Client Secret
4. Configure webhook endpoints:
   - URL: `https://yourdomain.com/api/webhooks/paypal?tenant={tenant_id}`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `CHECKOUT.ORDER.APPROVED`

### 3. Database Migration

Run the PayPal integration migration:

```bash
npm run supabase db push
```

### 4. Tenant Onboarding

Use the payment providers API to enable PayPal for a tenant:

```javascript
POST /api/payment-providers
{
  "provider_type": "paypal",
  "paypal_client_id": "tenant_paypal_client_id",
  "is_enabled": true,
  "is_default": false
}
```

## API Usage Examples

### 1. Create Payment Link with Provider Selection

```javascript
// Auto-select provider (uses tenant default)
POST /api/invoices/payment-link
{
  "invoiceId": "uuid",
  "provider": "auto"
}

// Force PayPal
POST /api/invoices/payment-link
{
  "invoiceId": "uuid", 
  "provider": "paypal"
}

// Force Stripe
POST /api/invoices/payment-link
{
  "invoiceId": "uuid",
  "provider": "stripe"
}
```

### 2. List Payment Providers

```javascript
GET /api/payment-providers

Response:
{
  "success": true,
  "providers": [
    {
      "id": "uuid",
      "provider_type": "stripe",
      "is_enabled": true,
      "is_default": true,
      "verification_status": "verified"
    },
    {
      "id": "uuid", 
      "provider_type": "paypal",
      "is_enabled": true,
      "is_default": false,
      "verification_status": "verified",
      "has_credentials": true
    }
  ]
}
```

### 3. Configure PayPal Provider

```javascript
POST /api/payment-providers
{
  "provider_type": "paypal",
  "paypal_client_id": "AeB1QIjO...client_id_here",
  "is_enabled": true,
  "is_default": false
}
```

## Webhook Flow

### PayPal Webhook Processing

1. **Webhook Reception**: PayPal sends webhook to `/api/webhooks/paypal?tenant={tenant_id}`
2. **Signature Verification**: Webhook signature is validated
3. **Duplicate Check**: Event ID is checked against existing records
4. **Event Processing**: Different event types are handled:
   - `PAYMENT.CAPTURE.COMPLETED`: Mark invoice as paid, record payment
   - `PAYMENT.CAPTURE.DENIED`: Log payment failure
   - `CHECKOUT.ORDER.APPROVED`: Log order approval
5. **Database Updates**: Invoice status, payment records, and activity logs are updated
6. **Email Notifications**: Payment confirmation emails are sent

### Supported Webhook Events

- `PAYMENT.CAPTURE.COMPLETED` - Payment successfully captured
- `PAYMENT.CAPTURE.DENIED` - Payment was denied
- `PAYMENT.CAPTURE.DECLINED` - Payment was declined  
- `CHECKOUT.ORDER.APPROVED` - Customer approved the payment
- `PAYMENT.AUTHORIZATION.CREATED` - Payment was authorized

## Error Handling

### Payment Failures

- Failed payments are logged in `invoice_activity`
- Webhook events are marked as 'failed' with error details
- Retry logic for webhook processing failures
- Email notifications are optional (won't fail payment processing)

### Provider Configuration Errors

- Invalid PayPal credentials result in 'failed' verification status
- Missing environment variables disable PayPal features gracefully
- Configuration test endpoints for validation

## Testing

### PayPal Sandbox Testing

1. Use PayPal sandbox credentials in development
2. Test webhook endpoints using ngrok for local development
3. Use PayPal's webhook simulator for testing events

### Test Scenarios

1. **Successful Payment**:
   - Create invoice → Generate PayPal payment link → Complete payment → Verify webhook processing

2. **Failed Payment**:
   - Create invoice → Generate PayPal payment link → Cancel payment → Verify failure handling

3. **Multi-Provider**:
   - Enable both Stripe and PayPal → Test provider selection → Verify correct payment processing

## Monitoring and Observability

### Database Queries for Monitoring

```sql
-- Check PayPal webhook processing status
SELECT 
  processing_status,
  COUNT(*) 
FROM paypal_webhook_event 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY processing_status;

-- Failed payment attempts
SELECT 
  i.invoice_number,
  pwe.event_type,
  pwe.error_message,
  pwe.created_at
FROM paypal_webhook_event pwe
JOIN invoice i ON pwe.invoice_id = i.id
WHERE pwe.processing_status = 'failed'
ORDER BY pwe.created_at DESC;

-- Payment provider status by tenant
SELECT 
  t.name as tenant_name,
  pp.provider_type,
  pp.is_enabled,
  pp.verification_status
FROM payment_provider pp
JOIN tenant t ON pp.tenant_id = t.id
ORDER BY t.name, pp.provider_type;
```

### Metrics to Track

- Payment success/failure rates by provider
- Webhook processing latency and failures
- Provider adoption rates across tenants
- Payment amounts and frequency by provider

## Security Considerations

### Multi-Tenant Isolation

- Each tenant's PayPal configuration is isolated
- Webhook URLs include tenant IDs for proper routing
- RLS policies prevent cross-tenant data access
- Payment processing is scoped to tenant membership

### Data Protection

- PayPal Client IDs are stored in plaintext (public data)
- PayPal Client Secrets are handled via environment variables
- Webhook signatures prevent replay attacks
- All payment events are audited

### Production Deployment

1. Use live PayPal credentials
2. Configure proper webhook endpoints with HTTPS
3. Set up monitoring and alerting for webhook failures
4. Regular verification of payment provider configurations

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**:
   - Check PayPal webhook configuration
   - Verify URL is accessible and returns 200
   - Check tenant ID in webhook URL

2. **Payment Link Creation Fails**:
   - Verify PayPal credentials are valid
   - Check provider is enabled and verified
   - Ensure invoice is in valid state for payment

3. **Payment Not Recorded**:
   - Check webhook event processing status
   - Verify invoice ID matches PayPal order custom_id
   - Check for database connection issues

### Debug Endpoints

- `GET /api/payment-providers` - Check provider configuration
- Check webhook event logs in `paypal_webhook_event` table
- Review `invoice_activity` for payment processing history

## Future Enhancements

1. **Additional Providers**: Support for more payment providers (Square, etc.)
2. **Advanced Routing**: Smart payment routing based on amount, region, etc.
3. **Subscription Support**: Recurring payment support via PayPal subscriptions
4. **Analytics**: Payment provider performance analytics and reporting
5. **Automated Reconciliation**: Automated payment reconciliation and reporting