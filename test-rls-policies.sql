-- RLS Policy Testing Script
-- This script helps test and debug RLS policies for the onboarding flow

-- 1. Test Helper Functions
-- Replace '[user_id]' with actual user ID from auth.users
DO $$
DECLARE
    test_user_id UUID := '[user_id]'::UUID;
    test_tenant_id UUID;
    tenant_ids UUID[];
BEGIN
    -- Test get_user_tenant_ids function
    RAISE NOTICE 'Testing get_user_tenant_ids for user %', test_user_id;
    SELECT array_agg(tenant_id) INTO tenant_ids 
    FROM public.get_user_tenant_ids(test_user_id);
    RAISE NOTICE 'User tenant IDs: %', tenant_ids;
    
    -- Get first tenant for further tests
    IF array_length(tenant_ids, 1) > 0 THEN
        test_tenant_id := tenant_ids[1];
        
        -- Test can_access_tenant
        RAISE NOTICE 'Testing can_access_tenant(%,%): %', 
            test_tenant_id, test_user_id,
            public.can_access_tenant(test_tenant_id, test_user_id);
        
        -- Test is_tenant_admin
        RAISE NOTICE 'Testing is_tenant_admin(%,%): %', 
            test_tenant_id, test_user_id,
            public.is_tenant_admin(test_tenant_id, test_user_id);
    ELSE
        RAISE NOTICE 'No tenants found for user';
    END IF;
END $$;

-- 2. Test RLS Policies as Specific User
-- This simulates what happens when the user makes API calls

-- Set the role and user context
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '[user_id]';

-- Test membership table access
RAISE NOTICE 'Testing membership table access';
SELECT COUNT(*) as membership_count, 
       array_agg(tenant_id) as tenant_ids,
       array_agg(role) as roles,
       array_agg(status) as statuses
FROM public.membership;

-- Test tenant table access
RAISE NOTICE 'Testing tenant table access';
SELECT COUNT(*) as tenant_count,
       array_agg(name) as tenant_names
FROM public.tenant;

-- Test user table access
RAISE NOTICE 'Testing user table access';
SELECT COUNT(*) as user_count,
       array_agg(email) as emails
FROM public.user;

-- Test creating a new receipt (should work if user has tenant)
RAISE NOTICE 'Testing receipt creation';
BEGIN
    INSERT INTO public.receipt (
        user_id,
        tenant_id,
        merchant_name,
        total_amount,
        currency,
        receipt_date,
        status
    ) VALUES (
        '[user_id]'::UUID,
        (SELECT tenant_id FROM public.membership WHERE user_id = '[user_id]'::UUID LIMIT 1),
        'Test Merchant',
        10.99,
        'USD',
        CURRENT_DATE,
        'pending'
    );
    RAISE NOTICE 'Receipt creation successful';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Receipt creation failed: %', SQLERRM;
END;

-- Reset role
RESET role;
RESET request.jwt.claims.sub;

-- 3. Direct Policy Testing
-- Check which policies are enabled on each table

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('user', 'tenant', 'membership', 'receipt', 'receipt_tag', 'tag')
ORDER BY tablename, policyname;

-- 4. Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('user', 'tenant', 'membership', 'receipt', 'receipt_tag', 'tag');

-- 5. Specific Onboarding Flow Tests
-- Test what happens during each step of onboarding

-- Step 1: User signs up (auth.users created)
-- Step 2: Middleware checks membership
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '[user_id]';

RAISE NOTICE 'Simulating middleware membership check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'User has membership'
        ELSE 'User has no membership'
    END as membership_status,
    COUNT(*) as membership_count
FROM public.membership 
WHERE user_id = '[user_id]'::UUID;

RESET role;
RESET request.jwt.claims.sub;

-- Step 3: API creates tenant (using admin role)
-- This should always work as it bypasses RLS

-- Step 4: User accesses dashboard
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '[user_id]';

RAISE NOTICE 'Simulating dashboard data access';
-- Should be able to see own receipts
SELECT COUNT(*) as receipt_count FROM public.receipt;
-- Should be able to see tenant info
SELECT COUNT(*) as visible_tenants FROM public.tenant;
-- Should be able to see own membership
SELECT COUNT(*) as visible_memberships FROM public.membership;

RESET role;
RESET request.jwt.claims.sub;

-- 6. Debug Helper - Show all data for a user
-- This uses admin privileges to show what data exists

RAISE NOTICE 'All data for user (admin view)';
SELECT 
    'User' as table_name,
    COUNT(*) as count
FROM public.user 
WHERE id = '[user_id]'::UUID
UNION ALL
SELECT 
    'Membership' as table_name,
    COUNT(*) as count
FROM public.membership 
WHERE user_id = '[user_id]'::UUID
UNION ALL
SELECT 
    'Receipt' as table_name,
    COUNT(*) as count
FROM public.receipt 
WHERE user_id = '[user_id]'::UUID;

-- 7. Test Edge Cases

-- Test null user context (should fail gracefully)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO NULL;

RAISE NOTICE 'Testing with NULL user context';
SELECT COUNT(*) as count_with_null_user FROM public.membership;

RESET role;
RESET request.jwt.claims.sub;

-- Test non-existent user (should return empty)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000000';

RAISE NOTICE 'Testing with non-existent user';
SELECT COUNT(*) as count_with_fake_user FROM public.membership;

RESET role;
RESET request.jwt.claims.sub;