-- Real-time Onboarding Flow Monitoring Script
-- Run these queries to monitor the onboarding process as it happens

-- 1. Monitor Recent User Signups (last 10 minutes)
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data->>'onboarding_completed' as onboarding_completed,
    last_sign_in_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_since_signup
FROM auth.users
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- 2. Monitor User Record Creation
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.created_at,
    u.updated_at,
    CASE 
        WHEN au.id IS NULL THEN 'No auth record!'
        ELSE 'Auth record exists'
    END as auth_status
FROM public.user u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY u.created_at DESC;

-- 3. Monitor Tenant Creation
SELECT 
    t.id,
    t.name,
    t.slug,
    t.created_at,
    t.subscription_status,
    t.subscription_plan,
    COUNT(m.id) as member_count
FROM public.tenant t
LEFT JOIN public.membership m ON t.id = m.tenant_id
WHERE t.created_at > NOW() - INTERVAL '10 minutes'
GROUP BY t.id, t.name, t.slug, t.created_at, t.subscription_status, t.subscription_plan
ORDER BY t.created_at DESC;

-- 4. Monitor Membership Creation with Details
SELECT 
    m.id as membership_id,
    m.user_id,
    m.tenant_id,
    m.role,
    m.status,
    m.accepted_at,
    m.created_at,
    u.email as user_email,
    t.name as tenant_name,
    au.raw_user_meta_data->>'onboarding_completed' as onboarding_completed
FROM public.membership m
JOIN public.user u ON m.user_id = u.id
JOIN public.tenant t ON m.tenant_id = t.id
LEFT JOIN auth.users au ON m.user_id = au.id
WHERE m.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY m.created_at DESC;

-- 5. Check for Orphaned Records (potential issues)
-- Users without memberships
SELECT 
    'Users without membership' as issue_type,
    u.id,
    u.email,
    u.created_at,
    au.raw_user_meta_data->>'onboarding_completed' as onboarding_completed
FROM public.user u
LEFT JOIN public.membership m ON u.id = m.user_id
LEFT JOIN auth.users au ON u.id = au.id
WHERE m.id IS NULL
    AND u.created_at > NOW() - INTERVAL '1 hour';

-- Tenants without members
SELECT 
    'Tenants without members' as issue_type,
    t.id,
    t.name,
    t.created_at
FROM public.tenant t
LEFT JOIN public.membership m ON t.id = m.tenant_id
WHERE m.id IS NULL
    AND t.created_at > NOW() - INTERVAL '1 hour';

-- 6. Onboarding Flow Status Summary
WITH recent_users AS (
    SELECT 
        au.id,
        au.email,
        au.created_at,
        au.raw_user_meta_data->>'onboarding_completed' as onboarding_completed,
        u.id as user_record_exists,
        m.id as membership_exists,
        m.tenant_id,
        m.role,
        m.status as membership_status
    FROM auth.users au
    LEFT JOIN public.user u ON au.id = u.id
    LEFT JOIN public.membership m ON au.id = m.user_id
    WHERE au.created_at > NOW() - INTERVAL '10 minutes'
)
SELECT 
    email,
    created_at,
    CASE 
        WHEN onboarding_completed = 'true' THEN '✓ Completed'
        ELSE '⏳ Pending'
    END as onboarding_status,
    CASE 
        WHEN user_record_exists IS NOT NULL THEN '✓'
        ELSE '✗'
    END as has_user_record,
    CASE 
        WHEN membership_exists IS NOT NULL THEN '✓'
        ELSE '✗'
    END as has_membership,
    CASE 
        WHEN tenant_id IS NOT NULL THEN '✓'
        ELSE '✗'
    END as has_tenant,
    role,
    membership_status,
    CASE 
        WHEN onboarding_completed = 'true' 
            AND user_record_exists IS NOT NULL 
            AND membership_exists IS NOT NULL 
            AND tenant_id IS NOT NULL THEN '✅ Complete'
        WHEN onboarding_completed = 'true' 
            AND (user_record_exists IS NULL 
                OR membership_exists IS NULL 
                OR tenant_id IS NULL) THEN '⚠️ Incomplete despite flag'
        ELSE '🔄 In Progress'
    END as overall_status
FROM recent_users
ORDER BY created_at DESC;

-- 7. Test RLS Access for Specific User
-- Replace with actual user_id to test
DO $$
DECLARE
    test_user_id UUID := NULL; -- Set this to test specific user
BEGIN
    -- Get most recent user if not specified
    IF test_user_id IS NULL THEN
        SELECT id INTO test_user_id 
        FROM auth.users 
        WHERE created_at > NOW() - INTERVAL '10 minutes'
        ORDER BY created_at DESC 
        LIMIT 1;
    END IF;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing RLS for user: %', test_user_id;
        
        -- Set user context
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims.sub', test_user_id::text, true);
        
        -- Test queries
        RAISE NOTICE 'Membership visible: %', (SELECT COUNT(*) FROM public.membership);
        RAISE NOTICE 'Tenants visible: %', (SELECT COUNT(*) FROM public.tenant);
        RAISE NOTICE 'Users visible: %', (SELECT COUNT(*) FROM public.user);
        
        -- Reset context
        PERFORM set_config('role', 'postgres', true);
        PERFORM set_config('request.jwt.claims.sub', '', true);
    ELSE
        RAISE NOTICE 'No recent users found to test';
    END IF;
END $$;

-- 8. Performance Check - Slow Queries During Onboarding
SELECT 
    query,
    calls,
    mean_exec_time,
    max_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%membership%' 
   OR query LIKE '%tenant%'
   OR query LIKE '%user%'
ORDER BY mean_exec_time DESC
LIMIT 10;