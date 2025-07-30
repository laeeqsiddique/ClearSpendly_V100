-- ROLLBACK SCRIPT: Revert RLS recursion fix if needed
-- Use this ONLY if you need to undo the bulletproof fix

-- ==============================================================================
-- WARNING: THIS WILL RESTORE THE PROBLEMATIC POLICIES
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '
⚠️  WARNING: ROLLING BACK TO PREVIOUS RLS STATE
======================================================================

This will restore the previous RLS policies that had recursion issues.
Only proceed if you need to revert for some reason.

The recursion problems will return after this rollback!
======================================================================
  ';
END $$;

-- ==============================================================================
-- PHASE 1: DISABLE RLS TO SAFELY MODIFY
-- ==============================================================================

ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- PHASE 2: DROP THE BULLETPROOF POLICIES
-- ==============================================================================

-- Drop bulletproof membership policies
DROP POLICY IF EXISTS "membership_select_own_only" ON public.membership;
DROP POLICY IF EXISTS "membership_service_role_access" ON public.membership;
DROP POLICY IF EXISTS "membership_insert_own" ON public.membership;
DROP POLICY IF EXISTS "membership_update_own" ON public.membership;

-- Drop bulletproof user policies
DROP POLICY IF EXISTS "user_select_own" ON public."user";
DROP POLICY IF EXISTS "user_insert_own" ON public."user";
DROP POLICY IF EXISTS "user_update_own" ON public."user";
DROP POLICY IF EXISTS "user_service_role_access" ON public."user";

-- Drop safe helper functions
DROP FUNCTION IF EXISTS public.get_user_tenant_ids_safe();
DROP FUNCTION IF EXISTS public.user_can_access_tenant_safe(UUID);
DROP FUNCTION IF EXISTS public.user_is_tenant_admin_safe(UUID);

-- ==============================================================================
-- PHASE 3: RESTORE ORIGINAL PROBLEMATIC POLICIES
-- ==============================================================================

-- Restore original membership policies (WARNING: These cause recursion!)
CREATE POLICY "membership_select_own" ON public.membership
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "membership_select_tenant" ON public.membership
  FOR SELECT USING (
    tenant_id = ANY(
      SELECT m.tenant_id 
      FROM public.membership m 
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "membership_modify_admin" ON public.membership
  FOR ALL USING (
    tenant_id = ANY(
      SELECT m.tenant_id 
      FROM public.membership m 
      WHERE m.user_id = auth.uid() 
      AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "service_role_full_access_membership" ON public.membership
  FOR ALL USING (auth.role() = 'service_role');

-- Restore original user policies
CREATE POLICY "user_select_own" ON public."user"
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "user_insert_own" ON public."user" 
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "user_update_own" ON public."user"
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "service_role_full_access_user" ON public."user"
  FOR ALL USING (auth.role() = 'service_role');

-- ==============================================================================
-- PHASE 4: RESTORE ORIGINAL HELPER FUNCTIONS (PROBLEMATIC)
-- ==============================================================================

-- These functions cause recursion by querying membership from within RLS
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = auth.uid() 
      AND m.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_access_tenant(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(UUID, UUID) TO authenticated;

-- ==============================================================================
-- PHASE 5: RE-ENABLE RLS (WARNING: RECURSION WILL OCCUR)
-- ==============================================================================

ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- COMPLETION WARNING
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '
======================================================================
⚠️  ROLLBACK COMPLETED - RECURSION ISSUES RESTORED!
======================================================================

🚨 WARNING: The 42P17 infinite recursion errors will now occur again!

❌ WHAT WAS RESTORED:
   - Original recursive membership policies
   - Problematic helper functions that query membership table
   - The exact same setup that caused the infinite recursion

🔄 TO FIX AGAIN:
   Run: fix_rls_recursion_permanent.sql

💡 RECOMMENDATION:
   Do NOT use this rollback unless absolutely necessary.
   The bulletproof fix is the correct solution.
======================================================================
  ';
END $$;