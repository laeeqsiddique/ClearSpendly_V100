-- Phase 1: Create standardized RLS helper functions
-- This migration creates robust helper functions for membership-based RLS policies
-- WITHOUT enabling RLS on any tables

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
-- This provides a single point of truth for tenant access checks
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.can_access_tenant(tenant_uuid, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO authenticated;

-- Also grant default parameter versions (PostgreSQL handles default parameters automatically)
-- These grants are not needed as the main function grants cover default parameter usage

-- Comments for documentation
COMMENT ON FUNCTION public.get_user_tenant_ids(UUID) IS 'Returns all tenant IDs that a user has active membership in';
COMMENT ON FUNCTION public.can_access_tenant(UUID, UUID) IS 'Checks if a user has active access to a specific tenant';
COMMENT ON FUNCTION public.is_tenant_admin(UUID, UUID) IS 'Checks if a user is an admin or owner of a specific tenant';
COMMENT ON FUNCTION public.user_has_tenant_access(UUID) IS 'Simple wrapper for tenant access check using current authenticated user';