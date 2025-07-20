-- QUICK FIX: Delete the extra plural tables immediately
-- This will clean up the mess and stop the confusion

-- Drop all the plural tables that are causing problems
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE; 
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.receipt_items CASCADE;
DROP TABLE IF EXISTS public.receipt_item_tags CASCADE;

-- Confirm what's left (should only be singular tables)
SELECT 
    table_name,
    'REMAINING' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Quick check: make sure we have the right singular tables
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user') THEN '✅ user table exists'
        ELSE '❌ user table missing'
    END as user_table,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant') THEN '✅ tenant table exists'
        ELSE '❌ tenant table missing'
    END as tenant_table,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'membership') THEN '✅ membership table exists'
        ELSE '❌ membership table missing'
    END as membership_table;