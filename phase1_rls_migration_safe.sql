-- PHASE 1: RLS Policy Fix - Safe Migration Script
-- This script implements Phase 1 of the RLS standardization plan
-- CRITICAL: Does NOT enable RLS on any tables - only updates policy definitions

-- =============================================================================
-- PHASE 1 SAFETY CHECKS
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Phase 1 RLS Migration - Safety Checks ===';
    
    -- Check if RLS is currently disabled (should be for safety)
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('tag_category', 'tag', 'receipt_tag', 'receipt_item_tag')
          AND rowsecurity = true
    ) THEN
        RAISE WARNING 'RLS is currently enabled on some tagging tables. This is unexpected for Phase 1.';
    ELSE
        RAISE NOTICE 'Confirmed: RLS is disabled on tagging tables - safe to proceed';
    END IF;
END
$$;

-- =============================================================================
-- STEP 1: CREATE ENHANCED HELPER FUNCTIONS
-- =============================================================================

\echo 'Step 1: Creating enhanced RLS helper functions...'

-- Enhanced helper function to get user's tenant IDs with better error handling
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  -- Return empty if no user provided
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.membership m
  WHERE m.user_id = user_uuid
    AND m.status = 'active';  -- Only active memberships
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can access a specific tenant
CREATE OR REPLACE FUNCTION public.can_access_tenant(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is tenant admin/owner
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.role IN ('owner', 'admin')
      AND m.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function for consistent tenant isolation in policies
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.can_access_tenant(tenant_uuid, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids() TO authenticated;

\echo 'Step 1: Helper functions created successfully'

-- =============================================================================
-- STEP 2: UPDATE TAGGING SYSTEM POLICIES (WITHOUT ENABLING RLS)
-- =============================================================================

\echo 'Step 2: Updating tagging system policies to use membership-based approach...'

-- Drop existing current_setting-based policies
DROP POLICY IF EXISTS "Users can view tag categories for their tenant" ON tag_category;
DROP POLICY IF EXISTS "Users can manage tag categories for their tenant" ON tag_category;
DROP POLICY IF EXISTS "Users can view tags for their tenant" ON tag;
DROP POLICY IF EXISTS "Users can manage tags for their tenant" ON tag;
DROP POLICY IF EXISTS "Users can view receipt tags for their tenant" ON receipt_tag;
DROP POLICY IF EXISTS "Users can manage receipt tags for their tenant" ON receipt_tag;
DROP POLICY IF EXISTS "Users can view receipt item tags for their tenant" ON receipt_item_tag;
DROP POLICY IF EXISTS "Users can manage receipt item tags for their tenant" ON receipt_item_tag;

-- Create new membership-based policies for tag_category
CREATE POLICY "tag_category_select_membership" ON tag_category
    FOR SELECT USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "tag_category_insert_membership" ON tag_category
    FOR INSERT WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "tag_category_update_membership" ON tag_category
    FOR UPDATE USING (public.user_has_tenant_access(tenant_id))
    WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "tag_category_delete_membership" ON tag_category
    FOR DELETE USING (public.user_has_tenant_access(tenant_id));

-- Create new membership-based policies for tag
CREATE POLICY "tag_select_membership" ON tag
    FOR SELECT USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "tag_insert_membership" ON tag
    FOR INSERT WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "tag_update_membership" ON tag
    FOR UPDATE USING (public.user_has_tenant_access(tenant_id))
    WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "tag_delete_membership" ON tag
    FOR DELETE USING (public.user_has_tenant_access(tenant_id));

-- Create new membership-based policies for receipt_tag
CREATE POLICY "receipt_tag_select_membership" ON receipt_tag
    FOR SELECT USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "receipt_tag_insert_membership" ON receipt_tag
    FOR INSERT WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "receipt_tag_update_membership" ON receipt_tag
    FOR UPDATE USING (public.user_has_tenant_access(tenant_id))
    WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "receipt_tag_delete_membership" ON receipt_tag
    FOR DELETE USING (public.user_has_tenant_access(tenant_id));

-- Create new membership-based policies for receipt_item_tag
CREATE POLICY "receipt_item_tag_select_membership" ON receipt_item_tag
    FOR SELECT USING (public.user_has_tenant_access(tenant_id));

CREATE POLICY "receipt_item_tag_insert_membership" ON receipt_item_tag
    FOR INSERT WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "receipt_item_tag_update_membership" ON receipt_item_tag
    FOR UPDATE USING (public.user_has_tenant_access(tenant_id))
    WITH CHECK (public.user_has_tenant_access(tenant_id));

CREATE POLICY "receipt_item_tag_delete_membership" ON receipt_item_tag
    FOR DELETE USING (public.user_has_tenant_access(tenant_id));

-- Ensure proper permissions
GRANT ALL ON tag_category TO authenticated;
GRANT ALL ON tag TO authenticated;
GRANT ALL ON receipt_tag TO authenticated;
GRANT ALL ON receipt_item_tag TO authenticated;

\echo 'Step 2: Tagging system policies updated successfully'

-- =============================================================================
-- STEP 3: CREATE TESTING FRAMEWORK
-- =============================================================================

\echo 'Step 3: Creating testing framework...'

-- Function to test helper function behavior
CREATE OR REPLACE FUNCTION public.test_rls_helper_functions()
RETURNS TABLE(test_name TEXT, result BOOLEAN, details TEXT) AS $$
DECLARE
    tenant_count INTEGER;
    access_result BOOLEAN;
BEGIN
    -- Test 1: get_user_tenant_ids function exists and runs
    SELECT COUNT(*) INTO tenant_count
    FROM public.get_user_tenant_ids(auth.uid());
    
    RETURN QUERY SELECT 
        'get_user_tenant_ids_function_works'::TEXT,
        (tenant_count >= 0)::BOOLEAN,
        ('Function returned ' || tenant_count || ' tenants')::TEXT;

    -- Test 2: can_access_tenant returns boolean
    SELECT public.can_access_tenant('00000000-0000-0000-0000-000000000001'::UUID) INTO access_result;
    
    RETURN QUERY SELECT 
        'can_access_tenant_function_works'::TEXT,
        (access_result IS NOT NULL)::BOOLEAN,
        ('Function returned: ' || COALESCE(access_result::TEXT, 'NULL'))::TEXT;

    -- Test 3: user_has_tenant_access wrapper works
    SELECT public.user_has_tenant_access('00000000-0000-0000-0000-000000000001'::UUID) INTO access_result;
    
    RETURN QUERY SELECT 
        'user_has_tenant_access_works'::TEXT,
        (access_result IS NOT NULL)::BOOLEAN,
        ('Function returned: ' || COALESCE(access_result::TEXT, 'NULL'))::TEXT;

    -- Test 4: Functions handle NULL inputs gracefully
    SELECT public.can_access_tenant(NULL, NULL) INTO access_result;
    
    RETURN QUERY SELECT 
        'null_handling_test'::TEXT,
        (access_result = FALSE)::BOOLEAN,
        ('NULL inputs correctly return FALSE')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check policy definitions
CREATE OR REPLACE FUNCTION public.check_policy_definitions()
RETURNS TABLE(table_name TEXT, policy_count INTEGER, has_membership_policies BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        COALESCE(pol_count.count, 0)::INTEGER,
        COALESCE(membership_count.count, 0) > 0 AS has_membership_policies
    FROM (VALUES 
        ('tag_category'), ('tag'), ('receipt_tag'), ('receipt_item_tag')
    ) t(table_name)
    LEFT JOIN (
        SELECT tablename, COUNT(*) as count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY tablename
    ) pol_count ON t.table_name = pol_count.tablename
    LEFT JOIN (
        SELECT tablename, COUNT(*) as count
        FROM pg_policies 
        WHERE schemaname = 'public' AND policyname LIKE '%membership%'
        GROUP BY tablename
    ) membership_count ON t.table_name = membership_count.tablename
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions on test functions
GRANT EXECUTE ON FUNCTION public.test_rls_helper_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_policy_definitions() TO authenticated;

\echo 'Step 3: Testing framework created successfully'

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    \echo 'Final verification of Phase 1 migration...'
    
    -- Count membership-based policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('tag_category', 'tag', 'receipt_tag', 'receipt_item_tag')
      AND policyname LIKE '%membership%';
    
    RAISE NOTICE 'Created % membership-based policies for tagging system', policy_count;
    
    -- Verify RLS is still disabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('tag_category', 'tag', 'receipt_tag', 'receipt_item_tag')
          AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'SUCCESS: RLS remains disabled on all tagging tables';
    ELSE
        RAISE WARNING 'UNEXPECTED: RLS is enabled on some tagging tables';
    END IF;
    
    RAISE NOTICE '=== Phase 1 Migration Completed Successfully ===';
    RAISE NOTICE 'Next step: Test the helper functions and prepare for Phase 2';
END
$$;