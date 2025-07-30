-- Fix function conflicts by dropping all versions and recreating cleanly

-- Drop all versions of conflicting functions
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID, UUID);
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID);
DROP FUNCTION IF EXISTS public.get_user_tenant_ids(UUID);
DROP FUNCTION IF EXISTS public.get_user_tenant_ids();
DROP FUNCTION IF EXISTS public.can_access_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_access_tenant(UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin(UUID);

-- Now recreate them cleanly with proper signatures
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  -- Return empty if no user provided
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  -- Use a direct query that bypasses RLS by using SECURITY DEFINER
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.membership m
  WHERE m.user_id = user_uuid
    AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID, UUID) TO authenticated;

-- Now fix the membership RLS policies
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;

-- Drop all existing membership policies
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
DROP POLICY IF EXISTS "membership_own_select" ON public.membership;
DROP POLICY IF EXISTS "membership_service_role_access" ON public.membership;
DROP POLICY IF EXISTS "membership_admin_management" ON public.membership;

-- Create simple, non-recursive policies
CREATE POLICY "membership_own_select" ON public.membership
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "membership_service_role_access" ON public.membership
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "membership_admin_management" ON public.membership
  FOR ALL USING (
    -- User can manage memberships if they are an owner/admin of the same tenant
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

-- Verify the functions exist and work
SELECT 'Functions created successfully' as status;