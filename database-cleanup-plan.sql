-- Database Cleanup Plan for ClearSpendly
-- The codebase is inconsistent, using both singular and plural table names

-- ANALYSIS:
-- Files using PLURAL (with 's'):
-- - lib/tenant.ts: uses 'memberships', 'tenants'
-- - middleware.ts: uses 'memberships'
-- - app/onboarding/page.tsx: uses 'memberships', 'tenants'
-- - app/dashboard/payment/page.tsx: uses 'receipts'
-- - app/api/webhooks/polar/route.ts: uses 'tenants', 'users'

-- Files using SINGULAR (no 's'):
-- - lib/supabase/auth.ts: uses 'user'
-- - lib/supabase/tenant.ts: uses 'membership'
-- - app/api/chat/route.ts: uses 'receipt'
-- - app/api/debug/receipt-discrepancy/route.ts: uses 'receipt'
-- - app/api/admin/stats/route.ts: uses 'receipt'

-- RECOMMENDATION: Use PLURAL naming (industry standard)
-- We need to:
-- 1. Keep plural tables: users, tenants, memberships, receipts
-- 2. Drop singular tables: user, tenant, membership, receipt
-- 3. Update the code files that use singular names

-- First, let's see what tables actually exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user', 'users', 'tenant', 'tenants', 'membership', 'memberships', 'receipt', 'receipts')
ORDER BY table_name;

-- Check if we have data we need to preserve:
SELECT 'users' as tbl, COUNT(*) as cnt FROM public.users UNION ALL
SELECT 'user' as tbl, COUNT(*) as cnt FROM public.user UNION ALL
SELECT 'tenants' as tbl, COUNT(*) as cnt FROM public.tenants UNION ALL
SELECT 'tenant' as tbl, COUNT(*) as cnt FROM public.tenant UNION ALL
SELECT 'memberships' as tbl, COUNT(*) as cnt FROM public.memberships UNION ALL
SELECT 'membership' as tbl, COUNT(*) as cnt FROM public.membership UNION ALL
SELECT 'receipts' as tbl, COUNT(*) as cnt FROM public.receipts UNION ALL
SELECT 'receipt' as tbl, COUNT(*) as cnt FROM public.receipt;