-- Fix membership RLS infinite recursion by creating non-recursive SECURITY DEFINER functions
-- These functions bypass RLS to avoid infinite recursion when checking membership permissions

-- Create new non-recursive function to check user's tenant access
-- This function uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION public.secure_user_has_tenant_access(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN 
SECURITY DEFINER  -- This bypasses RLS
SET search_path = public
AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Direct query to membership table without RLS checks
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Create new non-recursive function to get user's tenant IDs
-- This function uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION public.secure_get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) 
SECURITY DEFINER  -- This bypasses RLS
SET search_path = public
AS $$
BEGIN
  -- Return empty if no user provided
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  -- Direct query to membership table without RLS checks
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.membership m
  WHERE m.user_id = user_uuid
    AND m.status = 'active';  -- Only active memberships
END;
$$ LANGUAGE plpgsql;

-- Create new non-recursive function to check if user is tenant admin
-- This function uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION public.secure_is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN 
SECURITY DEFINER  -- This bypasses RLS
SET search_path = public
AS $$
BEGIN
  -- Return false if no user or tenant provided
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Direct query to membership table without RLS checks
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.role IN ('owner', 'admin')
      AND m.status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execution permissions to authenticated users for the new functions
GRANT EXECUTE ON FUNCTION public.secure_user_has_tenant_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_is_tenant_admin(UUID, UUID) TO authenticated;

-- Also grant to service role for API operations
GRANT EXECUTE ON FUNCTION public.secure_user_has_tenant_access(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_get_user_tenant_ids(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_is_tenant_admin(UUID, UUID) TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION public.secure_user_has_tenant_access(UUID, UUID) IS 'SECURITY DEFINER function to check tenant access without RLS recursion';
COMMENT ON FUNCTION public.secure_get_user_tenant_ids(UUID) IS 'SECURITY DEFINER function to get user tenant IDs without RLS recursion';
COMMENT ON FUNCTION public.secure_is_tenant_admin(UUID, UUID) IS 'SECURITY DEFINER function to check admin status without RLS recursion';