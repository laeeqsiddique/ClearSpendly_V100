# Comprehensive Tenant Setup System

## Overview

The Comprehensive Tenant Setup System automatically creates all necessary seed data and configurations for new tenants in ClearSpendly. This system ensures every new tenant starts with a complete, production-ready environment.

## Features

### 🏗️ Complete Seed Data Creation
- **Default Tag System**: Pre-configured tag categories (Project, Department, Tax Status, Client, Expense Type) with sensible default tags
- **Email Templates**: Professional templates for invoices, payment reminders, and confirmations
- **Invoice Templates**: Modern, customizable invoice designs
- **User Preferences**: Business-appropriate defaults for currency, timezone, notifications
- **IRS Mileage Rates**: Current and historical rates for expense tracking
- **Usage Tracking**: Subscription limits and billing counters
- **Vendor Categories**: Default categorization for business vendors

### 🔒 Enterprise-Grade Reliability
- **Transaction Safety**: Atomic operations with comprehensive rollback
- **Error Handling**: Retry logic with exponential backoff
- **Timeout Protection**: Prevents hanging operations
- **Comprehensive Logging**: Full audit trail of all setup operations
- **Validation**: Pre-flight checks and post-setup verification

### 🔧 Administrative Tools
- **Migration System**: Bulk migration for existing tenants
- **Individual Setup**: Targeted setup for specific tenants
- **Status Monitoring**: Real-time dashboard for setup progress
- **Validation Scripts**: Automated system health checks

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tenant Setup System                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Setup API     │    │  Admin Tools    │                │
│  │  /setup-tenant  │    │  /admin/migrate │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                         │
│           └───────┬───────────────┘                         │
│                   │                                         │
│           ┌─────────────────┐                               │
│           │ Setup Service   │                               │
│           │ • Validation    │                               │
│           │ • Execution     │                               │
│           │ • Rollback      │                               │
│           │ • Logging       │                               │
│           └─────────────────┘                               │
│                   │                                         │
│           ┌─────────────────┐                               │
│           │  Default Data   │                               │
│           │ • Tag System    │                               │
│           │ • Templates     │                               │
│           │ • Preferences   │                               │
│           │ • IRS Rates     │                               │
│           └─────────────────┘                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Setup Tables

```sql
-- Tenant Setup Log - Tracks setup completion and audit trail
tenant_setup_log (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenant(id),
  user_id UUID REFERENCES auth.users(id),
  setup_version VARCHAR(50),
  steps_completed INTEGER,
  setup_data JSONB,
  completed_at TIMESTAMPTZ,
  rollback_performed BOOLEAN
);

-- User Preferences - Per-tenant user settings
user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenant(id),
  preferences JSONB
);

-- Invoice Templates - Customizable invoice designs
invoice_template (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenant(id),
  name VARCHAR(255),
  template_data JSONB,
  is_default BOOLEAN
);

-- Tenant Usage - Subscription limits and tracking
tenant_usage (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenant(id),
  plan_type VARCHAR(50),
  limits JSONB,
  usage JSONB
);

-- Vendor Categories - Business categorization
vendor_category (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenant(id),
  name VARCHAR(255)
);
```

## Setup Process

### 1. New Tenant Registration

When a new user signs up, the enhanced `/api/setup-tenant` endpoint:

1. **Creates Basic Tenant Structure**
   - User record in `user` table
   - Tenant record in `tenant` table  
   - Owner membership in `membership` table

2. **Runs Comprehensive Setup**
   - Validates setup context
   - Executes all setup steps with retry logic
   - Logs progress and results
   - Performs rollback on failure

### 2. Setup Steps Executed

Each step is executed atomically with rollback capability:

1. **Tag System Creation**
   - Creates 5 default tag categories
   - Adds 20+ default tags across categories
   - Configures category settings (required, multiple, colors)

2. **Email Template Setup**
   - Creates 3 professional email templates
   - Configures branding and styling
   - Sets up template variables

3. **Invoice Template Creation**
   - Creates modern professional template
   - Configures layout and typography
   - Sets default template flag

4. **User Preferences Initialization**
   - Sets currency, timezone, date formats
   - Configures notification preferences
   - Establishes business settings

5. **IRS Mileage Rate Setup**
   - Adds current year rates
   - Includes historical rates (2021-2025)
   - Sets up automatic rate application

6. **Usage Tracking Initialization**
   - Creates usage counters
   - Sets subscription limits
   - Initializes billing period

7. **Vendor Category Creation**
   - Adds 10 default business categories
   - Sets up categorization structure

8. **Tenant Branding Setup**
   - Configures default branding
   - Sets feature flags
   - Establishes default settings

## API Endpoints

### Core Setup API

```typescript
POST /api/setup-tenant
// Automatically called during user registration
// Creates complete tenant environment

Response: {
  success: boolean,
  message: string,
  data: {
    tenant: TenantData,
    setupResult: SetupResult,
    setupTimeMs: number
  }
}
```

### Administrative APIs

```typescript
// Bulk migration for existing tenants
POST /api/admin/migrate-existing-tenants
GET  /api/admin/migrate-existing-tenants  // Status check

// Individual tenant setup
POST /api/admin/setup-individual-tenant
GET  /api/admin/setup-individual-tenant?tenantId=...
```

## Error Handling & Recovery

### Retry Logic
- Each setup step retries up to 2 times
- Exponential backoff between retries
- Timeout protection (30 seconds per step)

### Rollback System
- Automatic rollback on any step failure
- Reverse-order cleanup of completed steps
- Comprehensive rollback logging

### Error Categories
- **Validation Errors**: Invalid setup context
- **Database Errors**: Connection or constraint issues  
- **Timeout Errors**: Long-running operations
- **Resource Errors**: Missing dependencies

## Monitoring & Administration

### Admin Dashboard
Located at `/dashboard/admin/tenant-setup`:

- **Overview Tab**: System-wide statistics and progress
- **Individual Tenant Tab**: Per-tenant status and management
- **Migration Tab**: Bulk migration controls

### Validation Script
```bash
node scripts/validate-tenant-setup.js
```

Validates:
- Database schema completeness
- Default data integrity
- Service functionality
- API endpoint availability
- Migration status

## Migration for Existing Tenants

### Automatic Migration
The system can identify and add missing components to existing tenants:

```typescript
// Check what's missing
const missing = await setupService.identifyMissingComponents(tenantId);

// Add missing components
const result = await setupService.addMissingComponents(tenantId, userId);
```

### Bulk Migration
Run migration for all existing tenants:

```bash
curl -X POST /api/admin/migrate-existing-tenants
```

## Configuration

### Default Data Customization

Edit `lib/tenant-setup/default-data.ts` to customize:

- Tag categories and default tags
- Email template designs and content
- User preference defaults
- IRS mileage rates
- Usage limits by subscription plan

### Setup Steps

Modify `lib/tenant-setup/tenant-setup-service.ts` to:

- Add new setup steps
- Modify existing step logic
- Adjust retry and timeout settings
- Customize rollback behavior

## Security & Permissions

### Row Level Security (RLS)
All setup tables use RLS policies ensuring:
- Users only access their tenant's data
- Admins can manage their tenant's settings
- System operations use admin client

### Admin Access
Admin endpoints require system admin privileges:
- Membership in system-admin tenant
- Owner role verification
- Service-level authentication

## Deployment

### Database Migrations
```bash
# Apply setup system migrations
supabase db push

# Verify migrations
node scripts/validate-tenant-setup.js
```

### Environment Variables
Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Post-Deployment
1. Run validation script
2. Execute bulk migration for existing tenants
3. Monitor setup success rates
4. Verify admin dashboard access

## Performance Considerations

### Setup Time
- Average setup time: 2-5 seconds
- Database operations optimized with indexes
- Parallel execution where possible

### Scalability
- Atomic operations prevent conflicts
- Efficient batch processing for migrations
- Minimal impact on existing tenants

### Monitoring
- Setup completion rates tracked
- Performance metrics logged
- Error rates monitored

## Troubleshooting

### Common Issues

1. **Setup Timeout**
   - Check database connectivity
   - Verify service role permissions
   - Review error logs

2. **Partial Setup**
   - Run individual tenant setup
   - Check missing components
   - Use force setup option

3. **Migration Failures**
   - Validate existing data integrity
   - Check for constraint violations
   - Review tenant permissions

### Debugging

```typescript
// Check tenant setup status
const status = await setupService.checkTenantSetupStatus(tenantId);

// Get detailed component status
const details = await fetch(`/api/admin/setup-individual-tenant?tenantId=${tenantId}`);

// Force complete setup
await setupService.setupTenant(context, { force: true });
```

## Support & Maintenance

### Regular Maintenance
- Update IRS mileage rates annually
- Review and update default templates
- Monitor setup success rates
- Validate system health monthly

### Updates
When adding new setup components:
1. Add to default data configuration
2. Create setup step with rollback
3. Update migration system
4. Test thoroughly
5. Deploy with validation

## Conclusion

The Comprehensive Tenant Setup System ensures every new ClearSpendly tenant starts with a complete, production-ready environment. With robust error handling, comprehensive logging, and powerful administrative tools, it provides enterprise-grade reliability for tenant onboarding.