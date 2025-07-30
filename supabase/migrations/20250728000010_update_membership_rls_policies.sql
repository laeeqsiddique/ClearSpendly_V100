-- Update membership RLS policies to use non-recursive SECURITY DEFINER functions
-- This fixes the infinite recursion error (42P17) in membership policies

-- First, disable RLS temporarily to update the policies safely
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;

-- Drop existing membership policies that cause recursion
DROP POLICY IF EXISTS "membership_select_own" ON public.membership;
DROP POLICY IF EXISTS "membership_select_tenant" ON public.membership;
DROP POLICY IF EXISTS "membership_modify_admin" ON public.membership;
DROP POLICY IF EXISTS "service_role_full_access_membership" ON public.membership;

-- Create new membership policies using the secure non-recursive functions
-- Users can view their own memberships
CREATE POLICY "membership_select_own_v2" ON public.membership
  FOR SELECT USING (user_id = auth.uid());

-- Users can view memberships of their tenant (for team management)
-- Uses secure function to avoid recursion
CREATE POLICY "membership_select_tenant_v2" ON public.membership
  FOR SELECT USING (
    tenant_id = ANY(
      SELECT secure_get_user_tenant_ids(auth.uid())
    )
  );

-- Only owners and admins can modify memberships
-- Uses secure function to avoid recursion
CREATE POLICY "membership_modify_admin_v2" ON public.membership
  FOR ALL USING (
    secure_is_tenant_admin(tenant_id, auth.uid())
  );

-- Allow service role to manage all memberships (for API operations)
CREATE POLICY "service_role_full_access_membership_v2" ON public.membership
  FOR ALL USING (auth.role() = 'service_role');

-- Re-enable RLS on membership table
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions (ensure they exist)
GRANT ALL ON public.membership TO authenticated;
GRANT ALL ON public.membership TO service_role;

-- Comments for documentation
COMMENT ON POLICY "membership_select_own_v2" ON public.membership IS 'Users can view their own memberships - non-recursive version';
COMMENT ON POLICY "membership_select_tenant_v2" ON public.membership IS 'Users can view memberships of their tenant - uses secure non-recursive function';
COMMENT ON POLICY "membership_modify_admin_v2" ON public.membership IS 'Only admins can modify memberships - uses secure non-recursive function';
COMMENT ON POLICY "service_role_full_access_membership_v2" ON public.membership IS 'Service role can manage all memberships for API operations';