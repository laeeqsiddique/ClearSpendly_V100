-- PHASE 1 ROLLBACK: RLS Policy Fix - Safe Rollback Script
-- This script completely undoes Phase 1 changes and restores original state

-- =============================================================================
-- ROLLBACK SAFETY CHECKS
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Phase 1 RLS Rollback - Safety Checks ===';
    
    -- Verify RLS is still disabled (should be safe to rollback)
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('tag_category', 'tag', 'receipt_tag', 'receipt_item_tag')
          AND rowsecurity = true
    ) THEN
        RAISE WARNING 'RLS is currently enabled on some tagging tables. Proceeding with rollback...';
    ELSE
        RAISE NOTICE 'Confirmed: RLS is disabled on tagging tables - safe to rollback';
    END IF;
END
$$;

-- =============================================================================
-- STEP 1: REMOVE TESTING FRAMEWORK
-- =============================================================================

\echo 'Step 1: Removing testing framework...'

DROP FUNCTION IF EXISTS public.test_rls_helper_functions();
DROP FUNCTION IF EXISTS public.check_policy_definitions();
DROP FUNCTION IF EXISTS public.test_policy_definitions();
DROP FUNCTION IF EXISTS public.check_rls_status();
DROP FUNCTION IF EXISTS public.simulate_tenant_isolation_test();

\echo 'Step 1: Testing framework removed'

-- =============================================================================
-- STEP 2: ROLLBACK TAGGING SYSTEM POLICIES
-- =============================================================================

\echo 'Step 2: Rolling back tagging system policies...'

-- Drop the new membership-based policies
DROP POLICY IF EXISTS "tag_category_select_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_insert_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_update_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_delete_membership" ON tag_category;

DROP POLICY IF EXISTS "tag_select_membership" ON tag;
DROP POLICY IF EXISTS "tag_insert_membership" ON tag;
DROP POLICY IF EXISTS "tag_update_membership" ON tag;
DROP POLICY IF EXISTS "tag_delete_membership" ON tag;

DROP POLICY IF EXISTS "receipt_tag_select_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_insert_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_update_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_delete_membership" ON receipt_tag;

DROP POLICY IF EXISTS "receipt_item_tag_select_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_insert_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_update_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_delete_membership" ON receipt_item_tag;

-- Restore original current_setting-based policies
CREATE POLICY "Users can view tag categories for their tenant" ON tag_category
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage tag categories for their tenant" ON tag_category
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can view tags for their tenant" ON tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage tags for their tenant" ON tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can view receipt tags for their tenant" ON receipt_tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage receipt tags for their tenant" ON receipt_tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can view receipt item tags for their tenant" ON receipt_item_tag
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can manage receipt item tags for their tenant" ON receipt_item_tag
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

\echo 'Step 2: Original tagging policies restored'

-- =============================================================================
-- STEP 3: ROLLBACK HELPER FUNCTIONS
-- =============================================================================

\echo 'Step 3: Rolling back helper functions...'

-- Drop the new enhanced helper functions
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID);
DROP FUNCTION IF EXISTS public.can_access_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_access_tenant(UUID);

-- Update existing functions to original state if they were modified
-- Restore the original get_user_tenant_ids function (note: uses 'memberships' table name)
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.memberships m
  WHERE m.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore the original is_tenant_admin function (note: uses 'memberships' table name)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.tenant_id = tenant_uuid 
    AND m.user_id = user_uuid 
    AND m.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore basic permissions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID) TO authenticated;

\echo 'Step 3: Original helper functions restored'

-- =============================================================================
-- STEP 4: RESTORE PERMISSIONS
-- =============================================================================

\echo 'Step 4: Ensuring proper permissions...'

-- Maintain permissions on tables
GRANT ALL ON tag_category TO authenticated;
GRANT ALL ON tag TO authenticated;
GRANT ALL ON receipt_tag TO authenticated;
GRANT ALL ON receipt_item_tag TO authenticated;

\echo 'Step 4: Permissions restored'

-- =============================================================================
-- ROLLBACK VERIFICATION
-- =============================================================================

DO $$
DECLARE
    membership_policy_count INTEGER;
    current_setting_policy_count INTEGER;
BEGIN
    \echo 'Final verification of Phase 1 rollback...'
    
    -- Count membership-based policies (should be 0)
    SELECT COUNT(*) INTO membership_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('tag_category', 'tag', 'receipt_tag', 'receipt_item_tag')
      AND policyname LIKE '%membership%';
    
    -- Count current_setting policies (should be 8)
    SELECT COUNT(*) INTO current_setting_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('tag_category', 'tag', 'receipt_tag', 'receipt_item_tag')
      AND pg_get_expr(qual, 'public.' || tablename::regclass)::text LIKE '%current_setting%';
    
    RAISE NOTICE 'Membership-based policies remaining: %', membership_policy_count;
    RAISE NOTICE 'Current_setting-based policies restored: %', current_setting_policy_count;
    
    -- Verify helper functions exist
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
          AND p.proname IN ('get_user_tenant_ids', 'is_tenant_admin')
    ) THEN
        RAISE NOTICE 'Original helper functions are present';
    END IF;
    
    -- Verify new functions are removed
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
          AND p.proname IN ('can_access_tenant', 'user_has_tenant_access')
    ) THEN
        RAISE NOTICE 'Enhanced helper functions successfully removed';
    END IF;
    
    IF membership_policy_count = 0 AND current_setting_policy_count >= 4 THEN
        RAISE NOTICE '=== Phase 1 Rollback Completed Successfully ===';
        RAISE NOTICE 'System restored to original state before Phase 1 migration';
    ELSE
        RAISE WARNING 'Rollback may be incomplete - please verify manually';
    END IF;
END
$$;