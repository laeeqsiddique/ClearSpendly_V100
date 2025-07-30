-- ROLLBACK: Phase 1 RLS Helper Functions Migration
-- This script undoes the helper function creation from 20250728000001

-- Drop the new helper functions
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin(UUID);
DROP FUNCTION IF EXISTS public.can_access_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_access_tenant(UUID);
DROP FUNCTION IF EXISTS public.get_user_tenant_ids(UUID);
DROP FUNCTION IF EXISTS public.get_user_tenant_ids();

-- Restore the original get_user_tenant_ids function from the original migration
-- This matches the function from 20240718000002_create_rls_policies.sql
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.membership m
  WHERE m.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore the original is_tenant_admin function
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
    AND m.user_id = user_uuid 
    AND m.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant basic permissions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID, UUID) TO authenticated;