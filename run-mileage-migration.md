# Manual Migration Instructions

Since we can't run the Supabase CLI directly, you'll need to manually run the migration in your Supabase dashboard:

## Steps:

1. Go to your Supabase dashboard: https://app.supabase.com/project/[your-project-id]
2. Navigate to the "SQL Editor" section
3. Copy and paste the contents of `supabase/migrations/20250720000001_create_mileage_tables.sql`
4. Click "Run" to execute the migration

## What this migration creates:

- `mileage_log` table: Stores individual trip records with IRS-compliant fields
- `mileage_template` table: Stores frequently used trips for quick logging
- RLS policies: Ensures users can only see their tenant's data
- Indexes: For optimal query performance
- Triggers: Auto-updates template usage statistics

## After running the migration:

The mileage tracking feature will be fully functional with:
- Trip logging with automatic tax deduction calculations
- Quick templates for frequent routes
- Real-time statistics and reporting
- Full database security via RLS policies

## Alternative: Direct SQL Execution

You can also copy this connection string format and run via any PostgreSQL client:
```
Host: aws-0-us-west-1.pooler.supabase.com
Port: 6543
Database: postgres
Username: postgres.snsqevaogpbkwqjwkfxl
Password: [your-password]
```