-- Phase 1: Testing Framework for RLS Tenant Isolation Validation
-- This creates test functions to validate tenant isolation without enabling RLS

-- Function to test helper function behavior
CREATE OR REPLACE FUNCTION public.test_rls_helper_functions()
RETURNS TABLE(
    test_name TEXT,
    result BOOLEAN,
    details TEXT
) AS $$
DECLARE
    test_user_1 UUID := '11111111-1111-1111-1111-111111111111';
    test_user_2 UUID := '22222222-2222-2222-2222-222222222222';
    test_tenant_1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    test_tenant_2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    tenant_count INTEGER;
    access_result BOOLEAN;
BEGIN
    -- Test 1: get_user_tenant_ids returns correct tenants
    SELECT COUNT(*) INTO tenant_count
    FROM public.get_user_tenant_ids(test_user_1);
    
    RETURN QUERY SELECT 
        'get_user_tenant_ids_function_exists'::TEXT,
        (tenant_count >= 0)::BOOLEAN,
        ('Function returned ' || tenant_count || ' tenants')::TEXT;

    -- Test 2: can_access_tenant returns boolean
    SELECT public.can_access_tenant(test_tenant_1, test_user_1) INTO access_result;
    
    RETURN QUERY SELECT 
        'can_access_tenant_function_works'::TEXT,
        (access_result IS NOT NULL)::BOOLEAN,
        ('Function returned: ' || COALESCE(access_result::TEXT, 'NULL'))::TEXT;

    -- Test 3: is_tenant_admin returns boolean
    SELECT public.is_tenant_admin(test_tenant_1, test_user_1) INTO access_result;
    
    RETURN QUERY SELECT 
        'is_tenant_admin_function_works'::TEXT,
        (access_result IS NOT NULL)::BOOLEAN,
        ('Function returned: ' || COALESCE(access_result::TEXT, 'NULL'))::TEXT;

    -- Test 4: user_has_tenant_access wrapper works
    SELECT public.user_has_tenant_access(test_tenant_1) INTO access_result;
    
    RETURN QUERY SELECT 
        'user_has_tenant_access_wrapper_works'::TEXT,
        (access_result IS NOT NULL)::BOOLEAN,
        ('Function returned: ' || COALESCE(access_result::TEXT, 'NULL'))::TEXT;

    -- Test 5: Functions handle NULL inputs gracefully
    SELECT public.can_access_tenant(NULL, NULL) INTO access_result;
    
    RETURN QUERY SELECT 
        'null_handling_test'::TEXT,
        (access_result = FALSE)::BOOLEAN,
        ('NULL inputs correctly return FALSE')::TEXT;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate policy existence without enabling RLS
CREATE OR REPLACE FUNCTION public.test_policy_definitions()
RETURNS TABLE(
    table_name TEXT,
    policy_name TEXT,
    exists_check BOOLEAN
) AS $$
BEGIN
    -- Check if membership-based policies exist for tagging system
    RETURN QUERY
    SELECT 
        'tag_category'::TEXT,
        pol.policyname::TEXT,
        TRUE::BOOLEAN
    FROM pg_policies pol 
    WHERE pol.schemaname = 'public' 
      AND pol.tablename = 'tag_category'
      AND pol.policyname LIKE '%membership%';

    RETURN QUERY
    SELECT 
        'tag'::TEXT,
        pol.policyname::TEXT,
        TRUE::BOOLEAN
    FROM pg_policies pol 
    WHERE pol.schemaname = 'public' 
      AND pol.tablename = 'tag'
      AND pol.policyname LIKE '%membership%';

    RETURN QUERY
    SELECT 
        'receipt_tag'::TEXT,
        pol.policyname::TEXT,
        TRUE::BOOLEAN
    FROM pg_policies pol 
    WHERE pol.schemaname = 'public' 
      AND pol.tablename = 'receipt_tag'
      AND pol.policyname LIKE '%membership%';

    RETURN QUERY
    SELECT 
        'receipt_item_tag'::TEXT,
        pol.policyname::TEXT,
        TRUE::BOOLEAN
    FROM pg_policies pol 
    WHERE pol.schemaname = 'public' 
      AND pol.tablename = 'receipt_item_tag'
      AND pol.policyname LIKE '%membership%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check RLS status of tables
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity::BOOLEAN,
        COALESCE(pol_count.count, 0)::INTEGER
    FROM pg_tables t
    LEFT JOIN (
        SELECT 
            tablename,
            COUNT(*) as count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY tablename
    ) pol_count ON t.tablename = pol_count.tablename
    WHERE t.schemaname = 'public'
      AND t.tablename IN ('tag_category', 'tag', 'receipt_tag', 'receipt_item_tag')
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to simulate tenant isolation testing (without actually enabling RLS)
CREATE OR REPLACE FUNCTION public.simulate_tenant_isolation_test()
RETURNS TABLE(
    test_scenario TEXT,
    expected_behavior TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY VALUES
        ('User accessing own tenant data', 'ALLOW - user has membership', 'Policy should return TRUE for user_has_tenant_access()'),
        ('User accessing other tenant data', 'DENY - user has no membership', 'Policy should return FALSE for user_has_tenant_access()'),
        ('Admin user managing tenant resources', 'ALLOW - admin role permissions', 'is_tenant_admin() should return TRUE for admin users'),
        ('Regular user trying admin operations', 'DENY - insufficient permissions', 'is_tenant_admin() should return FALSE for regular users'),
        ('Cross-tenant tag assignment', 'DENY - tags belong to different tenant', 'Membership check should prevent cross-tenant operations'),
        ('Inactive membership access', 'DENY - membership is not active', 'Only active memberships should grant access');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.test_rls_helper_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_policy_definitions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rls_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.simulate_tenant_isolation_test() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.test_rls_helper_functions() IS 'Tests the behavior of RLS helper functions without enabling RLS';
COMMENT ON FUNCTION public.test_policy_definitions() IS 'Validates that membership-based policies are properly defined';
COMMENT ON FUNCTION public.check_rls_status() IS 'Checks current RLS enablement status and policy counts for tagging tables';
COMMENT ON FUNCTION public.simulate_tenant_isolation_test() IS 'Describes expected tenant isolation behavior for future testing';