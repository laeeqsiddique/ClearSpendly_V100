-- Rollback for membership RLS recursion fix

-- Drop the safe helper functions
DROP FUNCTION IF EXISTS public.get_user_tenant_ids_safe(UUID);
DROP FUNCTION IF EXISTS public.can_access_tenant_safe(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin_safe(UUID, UUID);
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID);

-- Disable RLS temporarily
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;

-- Drop safe policies
DROP POLICY IF EXISTS "membership_select_own_safe" ON public.membership;
DROP POLICY IF EXISTS "service_role_full_access_membership" ON public.membership;

-- Restore original helper functions (these cause recursion)
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.membership m
  WHERE m.user_id = user_uuid
    AND m.status = 'active';
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

CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.can_access_tenant(tenant_uuid, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Restore original membership policies (these cause recursion)
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

-- Re-enable RLS
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO authenticated;