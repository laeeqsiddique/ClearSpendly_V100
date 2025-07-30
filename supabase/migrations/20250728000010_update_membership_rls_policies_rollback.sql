-- Rollback script for membership RLS policy updates
-- This reverts to the previous membership policies if needed

-- First, disable RLS temporarily to update the policies safely
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;

-- Drop the new policies
DROP POLICY IF EXISTS "membership_select_own_v2" ON public.membership;
DROP POLICY IF EXISTS "membership_select_tenant_v2" ON public.membership;
DROP POLICY IF EXISTS "membership_modify_admin_v2" ON public.membership;
DROP POLICY IF EXISTS "service_role_full_access_membership_v2" ON public.membership;

-- Restore the original policies (from 20250726000004_fix_membership_rls_simple.sql)
-- Users can view their own memberships
CREATE POLICY "membership_select_own" ON public.membership
  FOR SELECT USING (user_id = auth.uid());

-- Users can view memberships of their tenant (for team management)
CREATE POLICY "membership_select_tenant" ON public.membership
  FOR SELECT USING (
    tenant_id = ANY(
      SELECT m.tenant_id 
      FROM public.membership m 
      WHERE m.user_id = auth.uid()
    )
  );

-- Only owners and admins can modify memberships
CREATE POLICY "membership_modify_admin" ON public.membership
  FOR ALL USING (
    tenant_id = ANY(
      SELECT m.tenant_id 
      FROM public.membership m 
      WHERE m.user_id = auth.uid() 
      AND m.role IN ('owner', 'admin')
    )
  );

-- Allow service role to manage all memberships (for API operations)
CREATE POLICY "service_role_full_access_membership" ON public.membership
  FOR ALL USING (auth.role() = 'service_role');

-- Re-enable RLS on membership table
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;