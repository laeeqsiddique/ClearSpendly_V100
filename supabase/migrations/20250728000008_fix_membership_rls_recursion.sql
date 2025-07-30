-- Fix infinite recursion in membership RLS policies
-- The issue: helper functions query membership table, but membership table RLS policies
-- use those same helper functions, creating infinite recursion

-- Step 1: Drop helper functions that cause recursion
DROP FUNCTION IF EXISTS public.get_user_tenant_ids(UUID);
DROP FUNCTION IF EXISTS public.can_access_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin_or_owner(UUID, UUID);

-- Step 2: Disable RLS on membership temporarily to recreate safe policies
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop all existing membership policies
DROP POLICY IF EXISTS "membership_select_own" ON public.membership;
DROP POLICY IF EXISTS "membership_select_tenant" ON public.membership;
DROP POLICY IF EXISTS "membership_modify_admin" ON public.membership;
DROP POLICY IF EXISTS "service_role_full_access_membership" ON public.membership;

-- Step 4: Create NEW safe helper functions that don't cause recursion
-- These functions use SECURITY DEFINER and bypass RLS entirely
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids_safe(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  -- Return empty if no user provided
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS on membership table
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.membership m
  WHERE m.user_id = user_uuid
    AND m.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check tenant access - bypasses RLS
CREATE OR REPLACE FUNCTION public.can_access_tenant_safe(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS on membership table
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check admin status - bypasses RLS
CREATE OR REPLACE FUNCTION public.is_tenant_admin_safe(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS on membership table
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.role IN ('owner', 'admin')
      AND m.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 5: Create simple membership policies that don't use helper functions
-- Users can view their own memberships (direct comparison, no subquery)
CREATE POLICY "membership_select_own_safe" ON public.membership
  FOR SELECT USING (user_id = auth.uid());

-- Service role can access everything
CREATE POLICY "service_role_full_access_membership" ON public.membership
  FOR ALL USING (auth.role() = 'service_role');

-- Step 6: Re-enable RLS on membership
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;

-- Step 7: Create new safe helper functions for other tables
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.can_access_tenant_safe(tenant_uuid, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant_safe(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin_safe(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO authenticated;

-- Grant to service role as well
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids_safe(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_access_tenant_safe(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin_safe(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION public.get_user_tenant_ids_safe(UUID) IS 'Returns all tenant IDs that a user has active membership in (bypasses RLS)';
COMMENT ON FUNCTION public.can_access_tenant_safe(UUID, UUID) IS 'Checks if a user has active access to a specific tenant (bypasses RLS)';
COMMENT ON FUNCTION public.is_tenant_admin_safe(UUID, UUID) IS 'Checks if a user is an admin or owner of a specific tenant (bypasses RLS)';
COMMENT ON FUNCTION public.user_has_tenant_access(UUID) IS 'Simple wrapper for tenant access check using current authenticated user (bypasses RLS)';

COMMENT ON POLICY "membership_select_own_safe" ON public.membership IS 'Users can view their own memberships without recursion';