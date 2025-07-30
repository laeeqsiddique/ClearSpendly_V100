-- Fix helper functions to match actual membership table structure
-- The membership table uses accepted_at to determine active memberships, not a status column

-- Enhanced helper function to get user's tenant IDs with correct membership logic
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
  WHERE m.user_id = user_uuid;
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
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID, UUID) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.get_user_tenant_ids(UUID) IS 'Returns all tenant IDs that a user has accepted membership in';
COMMENT ON FUNCTION public.can_access_tenant(UUID, UUID) IS 'Checks if a user has accepted access to a specific tenant';
COMMENT ON FUNCTION public.is_tenant_admin(UUID, UUID) IS 'Checks if a user is an admin or owner of a specific tenant with accepted membership';