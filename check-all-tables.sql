-- Check all tables in the public schema
SELECT 
    table_name,
    CASE 
        WHEN table_name LIKE '%s' THEN 'Plural (with s)'
        ELSE 'Singular (no s)'
    END as naming_style
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check which tables have data
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM public.users
UNION ALL
SELECT 
    'user' as table_name, COUNT(*) as row_count FROM public.user
UNION ALL
SELECT 
    'tenants' as table_name, COUNT(*) as row_count FROM public.tenants
UNION ALL
SELECT 
    'tenant' as table_name, COUNT(*) as row_count FROM public.tenant
UNION ALL
SELECT 
    'memberships' as table_name, COUNT(*) as row_count FROM public.memberships
UNION ALL
SELECT 
    'membership' as table_name, COUNT(*) as row_count FROM public.membership
UNION ALL
SELECT 
    'receipts' as table_name, COUNT(*) as row_count FROM public.receipts
UNION ALL
SELECT 
    'receipt' as table_name, COUNT(*) as row_count FROM public.receipt;