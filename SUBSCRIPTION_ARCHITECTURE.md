# SaaS Subscription Expense Architecture

This document outlines the enterprise-grade subscription expense generation system designed for multi-tenant SaaS applications with strict compliance, audit, and billing accuracy requirements.

## Architecture Overview

The subscription expense system is built with the following SaaS-specific principles:

### 🔐 **Multi-Tenant Isolation**
- Complete tenant data isolation using Row-Level Security (RLS)
- All operations scoped to tenant context with proper authorization
- Batch processing maintains tenant boundaries for security and performance

### 💰 **Financial Data Accuracy**
- Idempotency protection prevents duplicate expense generation
- Comprehensive audit trails for compliance and debugging  
- Prorated charge calculations for mid-cycle subscription changes
- Atomic operations ensure data consistency

### 🚀 **Scalable Processing**
- Tenant-aware batch processing for high-volume operations
- Queue-based processing with distributed locking
- Configurable retry mechanisms with exponential backoff
- Performance optimized for hundreds of tenants with thousands of subscriptions

## Database Schema

### Core Tables

#### `expense_subscription`
Tracks customer subscription services (Netflix, Spotify, etc.)
```sql
- id (UUID, Primary Key)
- tenant_id (UUID, FK to tenant) 
- service_name (VARCHAR) - e.g., "Netflix", "Spotify"
- amount (DECIMAL) - Monthly/recurring amount
- frequency (ENUM) - weekly, monthly, quarterly, yearly
- start_date, next_charge_date, last_charge_date, end_date
- status (ENUM) - active, paused, cancelled
- payment_method, category, notes
- Audit fields: created_by, created_at, updated_at
```

#### `subscription_processing_event` (New)
Comprehensive audit trail for all subscription processing events
```sql
- id (UUID, Primary Key)
- tenant_id (UUID) - Tenant isolation
- subscription_id (UUID) - Links to expense_subscription
- event_type (ENUM) - generation_started, generation_completed, generation_failed, etc.
- event_date (DATE) - Business date of the event
- idempotency_key (VARCHAR) - Prevents duplicate processing
- batch_id (UUID) - Groups related processing events
- expenses_generated (INTEGER) - Number of expenses created
- total_amount (DECIMAL) - Total dollar amount processed
- processing_duration_ms (INTEGER) - Performance tracking
- error_code, error_message - Error details for debugging
- processor_version (VARCHAR) - System version tracking
- processing_context (JSONB) - Additional event context
```

#### `subscription_processing_queue` (New)  
Manages processing order and prevents race conditions
```sql
- id (UUID, Primary Key)
- tenant_id, subscription_id (UUIDs)
- scheduled_for (TIMESTAMPTZ) - When to process
- priority (INTEGER) - Processing priority
- processing_status (ENUM) - pending, processing, completed, failed
- locked_at, locked_by, lock_expires_at - Distributed locking
- attempt_count, max_attempts, next_attempt_at - Retry logic
```

### Enhanced Receipt Integration

The existing `receipt` table is enhanced with:
```sql
- source_subscription_id (UUID, FK) - Links auto-generated expenses to subscriptions
- Index on (source_subscription_id, receipt_date) for performance
```

## Core Services

### 1. SubscriptionExpenseProcessor

**Location:** `lib/services/subscription-expense-processor.ts`

**Key Features:**
- **Multi-tenant batch processing** - Processes all tenants while maintaining isolation
- **Idempotency protection** - Uses tenant:subscription:date keys to prevent duplicates
- **Comprehensive error handling** - Graceful degradation with detailed error logging
- **Performance optimization** - Efficient database queries and batch operations

**Main Methods:**
```typescript
// Process all subscriptions across all tenants (cron job entry point)
async processAllSubscriptions(): Promise<BatchProcessingResult>

// Process single subscription with full audit trail
private async processSubscriptionExpenses(subscription, batchId): Promise<ProcessingResult>
```

### 2. SubscriptionLifecycleManager

**Location:** `lib/services/subscription-lifecycle-manager.ts`

**Key Features:**
- **Subscription state management** - Pause, resume, cancel with proper audit trails
- **Prorated charge calculations** - Mid-cycle changes with accurate financial calculations
- **Compliance audit trails** - Complete history of all subscription changes

**Main Methods:**
```typescript
// Pause subscription with mid-cycle proration
async pauseSubscription(params): Promise<{success, prorationDetails?, error?}>

// Resume paused subscription  
async resumeSubscription(params): Promise<{success, nextChargeDate?, error?}>

// Cancel subscription with end-date handling
async cancelSubscription(params): Promise<{success, endDate?, prorationDetails?, error?}>
```

## API Endpoints

### Automated Processing

#### `GET /api/cron/process-subscriptions`
- **Purpose:** Automated expense generation for all active subscriptions
- **Security:** Bearer token authentication with CRON_SECRET
- **Scheduling:** Recommended daily execution via Vercel Cron
- **Response:** Detailed processing metrics and error reports

### Subscription Lifecycle Management  

#### `POST /api/subscriptions/[id]/lifecycle`
- **Purpose:** Manage subscription state changes (pause/resume/cancel)
- **Authentication:** User session with tenant membership validation
- **Body:**
```json
{
  "action": "pause|resume|cancel",
  "effectiveDate": "2025-01-15",
  "reason": "Customer request", 
  "immediateCancel": false
}
```

#### `GET /api/subscriptions/[id]/lifecycle`  
- **Purpose:** Retrieve subscription lifecycle event history
- **Returns:** Complete audit trail of all subscription changes

### Health Monitoring

#### `GET /api/health/subscriptions`
- **Purpose:** System health check for monitoring/alerting
- **Returns:** Database connectivity, processing metrics, error counts
- **Status Codes:** 200 (healthy/degraded), 503 (unhealthy)

## Deployment Configuration

### Environment Variables
```bash
# Required for processing
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for cron job security
CRON_SECRET=your_secure_random_secret

# Optional: Error reporting
SENTRY_DSN=your_sentry_dsn
```

### Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-subscriptions",
      "schedule": "0 6 * * *"  // Daily at 6 AM UTC
    }
  ]
}
```

### Database Migrations

Run the following migrations to set up the subscription processing system:

1. `20250806000002_create_expense_subscriptions.sql` - Core subscription table
2. `20250806000003_add_subscription_expense_link.sql` - Receipt integration  
3. `20250807000001_subscription_processing_audit.sql` - Audit and queue tables

## Security & Compliance

### Multi-Tenant Security
- ✅ **Row-Level Security (RLS)** enforced on all subscription tables
- ✅ **Tenant context validation** in all API endpoints  
- ✅ **User permission checks** (owner/admin/member roles)
- ✅ **SQL injection protection** via parameterized queries

### Financial Data Protection  
- ✅ **Idempotency keys** prevent duplicate expense generation
- ✅ **Atomic transactions** ensure data consistency
- ✅ **Audit trails** track all changes for compliance
- ✅ **Error isolation** prevents cross-tenant data leakage

### Compliance Features
- ✅ **Complete audit trail** of all subscription processing events
- ✅ **Immutable event log** for financial reconciliation
- ✅ **User action tracking** for customer support and compliance
- ✅ **Data retention policies** with configurable cleanup functions

## Monitoring & Alerting

### Key Metrics to Monitor
```typescript
interface SubscriptionMetrics {
  activeSubscriptions: number      // Total active subscriptions across all tenants
  pendingProcessing: number        // Overdue subscriptions needing processing
  recentErrors: number            // Processing errors in last 24 hours  
  lastProcessingBatch: string     // Timestamp of last successful batch
  processingDurationMs: number    // Performance tracking
  healthStatus: 'healthy' | 'degraded' | 'unhealthy'
}
```

### Recommended Alerts
1. **Processing Failures** - More than 5% error rate in daily batch
2. **Overdue Subscriptions** - More than 10 subscriptions overdue for >24 hours  
3. **Health Check Failures** - System health endpoint returns unhealthy status
4. **Performance Degradation** - Processing time exceeds 5 minutes for typical batch

### Monitoring Dashboard
The health endpoint (`/api/health/subscriptions`) provides real-time metrics for:
- System component health (database, subscriptions, processing)
- Performance metrics (processing times, error rates)
- Business metrics (active subscriptions, pending processing)

## Error Handling & Recovery

### Automatic Retry Logic
- **Transient failures:** Automatic retry with exponential backoff
- **Rate limiting:** Queue-based processing prevents system overload
- **Dead letter queue:** Failed items tracked for manual investigation

### Error Categories
1. **System Errors** - Database connectivity, external service failures
2. **Data Errors** - Invalid subscription data, constraint violations  
3. **Business Logic Errors** - Invalid state transitions, calculation errors
4. **Authentication Errors** - Permission denied, token validation failures

### Recovery Procedures
1. **Failed Processing Events** - Logged with full context for investigation
2. **Stuck Processing Locks** - Automatic timeout and cleanup after 30 minutes
3. **Data Inconsistencies** - Audit trail allows for transaction reconstruction
4. **Tenant Isolation Breaches** - Comprehensive logging and alerting

## Performance Optimization

### Database Optimization
- **Strategic indexes** on frequently queried columns
- **Tenant-scoped queries** to leverage RLS effectively
- **Batch operations** to minimize database round trips
- **Connection pooling** for high-concurrency processing

### Processing Optimization  
- **Tenant-aware batching** processes related subscriptions together
- **Parallel processing** within tenant boundaries for safety
- **Memory efficient** streaming for large tenant datasets
- **Graceful degradation** under high load conditions

### Monitoring & Profiling
- **Processing duration tracking** for each subscription and batch
- **Database query performance** monitoring via slow query logs
- **Memory usage tracking** for large batch operations
- **Error rate monitoring** by tenant and subscription type

## Best Practices

### Development
1. **Always test with multiple tenants** to verify proper isolation
2. **Use idempotency keys** for all financial data operations
3. **Log comprehensive audit information** for debugging and compliance
4. **Handle edge cases gracefully** (paused subscriptions, end dates, etc.)

### Deployment  
1. **Run migrations in transaction** to ensure consistency
2. **Test cron job authentication** before production deployment
3. **Monitor health endpoints** immediately after deployment  
4. **Verify tenant isolation** with production data subset

### Operations
1. **Monitor daily processing results** for errors and performance
2. **Set up alerting** for processing failures and health check issues
3. **Review audit logs regularly** for suspicious activity
4. **Maintain cleanup procedures** for old processing events

---

This architecture provides enterprise-grade subscription expense processing with the security, compliance, and scalability requirements necessary for multi-tenant SaaS applications handling financial data.