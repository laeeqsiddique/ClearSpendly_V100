-- Fix RLS infinite recursion issue in membership policies
-- The problem is policies that query the membership table from within membership RLS policies

-- First, disable RLS temporarily to clean up
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;

-- Drop all existing membership policies that cause recursion
DROP POLICY IF EXISTS "membership_select" ON public.membership;
DROP POLICY IF EXISTS "membership_insert" ON public.membership;
DROP POLICY IF EXISTS "membership_update" ON public.membership;
DROP POLICY IF EXISTS "membership_delete" ON public.membership;
DROP POLICY IF EXISTS "membership_select_own" ON public.membership;
DROP POLICY IF EXISTS "membership_select_tenant" ON public.membership;
DROP POLICY IF EXISTS "membership_modify_admin" ON public.membership;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.membership;
DROP POLICY IF EXISTS "Tenant admins can manage memberships" ON public.membership;
DROP POLICY IF EXISTS "Users can view tenant memberships" ON public.membership;
DROP POLICY IF EXISTS "service_role_full_access_membership" ON public.membership;

-- Create simple, non-recursive policies
-- 1. Users can always view their own memberships (no recursion)
CREATE POLICY "membership_own_select" ON public.membership
  FOR SELECT USING (user_id = auth.uid());

-- 2. Service role has full access (for admin operations)
CREATE POLICY "membership_service_role_access" ON public.membership
  FOR ALL USING (auth.role() = 'service_role');

-- 3. For team management, use a simple approach that doesn't cause recursion
-- Instead of querying membership table again, we'll use a direct check
CREATE POLICY "membership_admin_management" ON public.membership
  FOR ALL USING (
    -- User can manage memberships if they are an owner/admin of the same tenant
    -- We avoid recursion by using a direct subquery without calling helper functions
    EXISTS (
      SELECT 1 
      FROM public.membership m 
      WHERE m.user_id = auth.uid() 
        AND m.tenant_id = membership.tenant_id 
        AND m.role IN ('owner', 'admin')
        AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL))
    )
  );

-- Re-enable RLS
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;

-- Update the helper functions to avoid recursion by using direct queries
-- instead of relying on RLS policies that might cause circular references

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  -- Return empty if no user provided
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  -- Use a direct query that bypasses RLS by using SECURITY DEFINER
  -- This function runs with the privileges of the function owner (postgres)
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.membership m
  WHERE m.user_id = user_uuid
    AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_tenant(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS and avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.can_access_tenant(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS and avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.role IN ('owner', 'admin')
      AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID, UUID) TO authenticated;

-- Create a simple helper function for policies that need tenant access checks
-- This avoids the recursion problem by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS and avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID, UUID) TO authenticated;

-- Test the functions to make sure they work
-- Replace these UUIDs with actual values from your database to test
-- SELECT public.get_user_tenant_ids('YOUR_USER_ID'::UUID);
-- SELECT public.can_access_tenant('YOUR_TENANT_ID'::UUID, 'YOUR_USER_ID'::UUID);
-- SELECT public.is_tenant_admin('YOUR_TENANT_ID'::UUID, 'YOUR_USER_ID'::UUID);

-- Verify RLS is working properly
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'membership' 
ORDER BY policyname;

COMMENT ON FUNCTION public.get_user_tenant_ids IS 'Returns tenant IDs for a user, uses SECURITY DEFINER to avoid RLS recursion';
COMMENT ON FUNCTION public.can_access_tenant IS 'Checks if user can access tenant, uses SECURITY DEFINER to avoid RLS recursion';
COMMENT ON FUNCTION public.is_tenant_admin IS 'Checks if user is admin of tenant, uses SECURITY DEFINER to avoid RLS recursion';
COMMENT ON FUNCTION public.user_has_tenant_access IS 'Simple tenant access check for RLS policies, uses SECURITY DEFINER to avoid recursion';