# ClearSpendly Database Migration Order

This document outlines the proper order for running database migrations in ClearSpendly. All migrations are located in the `supabase/migrations/` directory.

## Migration Order

Run these migrations in the following order:

### 1. Foundation & Extensions
```sql
-- 20240718000001_create_tenant_system.sql
-- Core tenant system setup
```

### 2. Core Tables
```sql
-- 20250714000001_create_core_tables.sql
-- Creates: tenant, user, membership, vendor, receipt, receipt_item
-- Includes: Extensions (uuid-ossp, pgcrypto, vector)
```

### 3. Security & Policies
```sql
-- 20240718000002_create_rls_policies.sql
-- Row-Level Security policies for multi-tenant isolation
```

### 4. JWT & Authentication
```sql
-- 20240718000003_jwt_claims.sql
-- JWT token configuration for Supabase Auth
```

### 5. Subscription System
```sql
-- 20240718000004_add_polar_fields.sql
-- Polar subscription integration fields
```

### 6. Mileage Tracking System
```sql
-- 20250720000001_create_mileage_tables.sql
-- Creates: mileage_entry, mileage_template
-- IRS-compliant mileage tracking for contractors
```

### 7. IRS Rate Management
```sql
-- 20250720000002_create_irs_rate_table.sql
-- Creates: irs_mileage_rate
-- Automated IRS rate updates and historical tracking
```

### 8. Invoice System
```sql
-- 20250720000003_create_invoice_system.sql
-- Creates: client, invoice_template, invoice, invoice_item
-- Complete invoicing solution for contractors
```

### 9. Payment System
```sql
-- 20250721000001_create_payment_system.sql
-- Creates: payment, payment_allocation
-- Payment tracking and allocation to invoices
-- Includes triggers for automatic status updates
```

### 10. Invoice Template Enhancements
```sql
-- 20250721054722_add_logo_fields_to_templates.sql
-- Adds logo support to invoice templates
```

### 11. Font Customization
```sql
-- 20250721061558_add_font_family_to_templates.sql
-- Adds font family options to invoice templates
```

### 12. Email Template System
```sql
-- 20250722000001_create_email_templates.sql
-- Creates: email_templates, email_template_variables, email_send_log
-- Complete email customization and branding system
```

### 13. Tenant Branding Fields (Bug Fix)
```sql
-- 20250722000002_add_tenant_branding_fields.sql
-- DEPRECATED: Added fields to wrong table (tenants instead of tenant)
-- Skip this migration - use 20250722000005 instead
```

### 14. Fix Tenant Branding Fields
```sql
-- 20250722000003_fix_tenant_branding_fields.sql
-- Adds branding fields to correct tenant table
-- SUPERSEDED by 20250722000005_complete_branding_system.sql
```

### 15. Logos Storage Bucket
```sql
-- 20250722000004_create_logos_bucket.sql
-- Creates public storage bucket for logos
-- SUPERSEDED by 20250722000005_complete_branding_system.sql
```

### 16. Complete Branding System
```sql
-- 20250722000005_complete_branding_system.sql
-- Comprehensive branding system setup:
-- - Adds all branding fields to tenant table
-- - Creates private logos storage bucket
-- - Sets up RLS policies for secure logo access
-- - Includes verification and migration helpers
-- NOTE: This is the only branding migration you need to run
```

### 17. Administrative & System Tables
```sql
-- 20250723000001_create_admin_system_tables.sql
-- Creates: support_ticket, system_health, backup_log, api_usage_log
-- Creates: user_preferences, subscription_usage, email_connector
-- Creates: training_queue, model_registry, price_book, price_alert
-- Includes utility functions and triggers
```

## Database Schema Overview

After running all migrations, your database will contain:

### Core System Tables
- `tenant` - Multi-tenant organization data
- `user` - Extended user profiles
- `membership` - User-tenant relationships with roles
- `user_preferences` - User-specific settings

### Receipt Management
- `vendor` - Vendor/merchant information
- `receipt` - Receipt headers with OCR data
- `receipt_item` - Line items from receipts
- `price_book` - Historical price tracking
- `price_alert` - Price anomaly detection

### Invoice & Payment System
- `client` - Client/customer information
- `invoice_template` - Invoice template configurations
- `invoice` - Invoice headers
- `invoice_item` - Invoice line items
- `payment` - Payment records
- `payment_allocation` - Payment-to-invoice mapping

### Mileage Tracking
- `mileage_entry` - Business trip records
- `mileage_template` - Frequent trip templates
- `irs_mileage_rate` - IRS rate history

### Email System
- `email_templates` - Custom email templates
- `email_template_variables` - Dynamic email variables
- `email_send_log` - Email delivery tracking
- `email_connector` - Email service integration

### Administrative
- `support_ticket` - Customer support system
- `system_health` - Service monitoring
- `backup_log` - Backup tracking
- `api_usage_log` - API usage analytics
- `subscription_usage` - Usage metrics
- `training_queue` - AI/ML model training
- `model_registry` - ML model versions

## Running Migrations

### Using Supabase CLI
```bash
# Reset database (development only)
supabase db reset

# Run all migrations
supabase db push

# Or run individual migration
supabase migration up --target 20250723000001
```

### Manual Execution
If running migrations manually, execute the SQL files in the order listed above using your preferred PostgreSQL client.

## Important Notes

1. **Order Matters**: Migrations must be run in the specified order due to foreign key dependencies.

2. **RLS Policies**: Row-Level Security is enabled on all tenant-scoped tables for proper multi-tenant isolation.

3. **Extensions**: The following PostgreSQL extensions are required:
   - `uuid-ossp` - UUID generation
   - `pgcrypto` - Cryptographic functions
   - `vector` - Vector similarity search

4. **Triggers**: Several tables have automated triggers for:
   - Updating `updated_at` timestamps
   - Calculating invoice payment status
   - Preventing payment over-allocation
   - Generating ticket numbers

5. **Functions**: Utility functions are included for:
   - System health monitoring
   - API usage logging
   - Subscription usage tracking
   - Price anomaly detection

## Verification

After running all migrations, verify the setup by:

1. Checking that all tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. Verifying RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND rowsecurity = true;
   ```

3. Confirming indexes are created:
   ```sql
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   ORDER BY tablename, indexname;
   ```

## Rollback Strategy

Each migration should be designed to be reversible. If you need to rollback:

1. **Development**: Use `supabase db reset` to start fresh
2. **Production**: Create reverse migration files with `DROP` statements in reverse order

## Support

For migration issues:
- Check Supabase logs for detailed error messages
- Verify all foreign key relationships exist before running dependent migrations
- Ensure proper permissions for the database user running migrations