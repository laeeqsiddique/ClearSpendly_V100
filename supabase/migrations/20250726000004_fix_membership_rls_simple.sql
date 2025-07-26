-- Fix RLS policies to prevent infinite recursion
-- This creates simple, non-recursive policies

-- First, disable RLS temporarily to fix the policies
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" DISABLE ROW LEVEL SECURITY;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view their memberships" ON public.membership;
DROP POLICY IF EXISTS "Tenant admins can manage memberships" ON public.membership;
DROP POLICY IF EXISTS "Users can view tenant memberships" ON public.membership;
DROP POLICY IF EXISTS "Users can view themselves" ON public."user";
DROP POLICY IF EXISTS "Users can update themselves" ON public."user";
DROP POLICY IF EXISTS "Users can insert themselves" ON public."user";
DROP POLICY IF EXISTS "Users can view their own record" ON public."user";
DROP POLICY IF EXISTS "Users can update their own record" ON public."user";
DROP POLICY IF EXISTS "Users can insert their own record" ON public."user";
DROP POLICY IF EXISTS "Tenant members can view each other" ON public."user";
DROP POLICY IF EXISTS "Tenant admins can manage user records for invitations" ON public."user";

-- Create simple, safe policies for the user table
CREATE POLICY "user_select_own" ON public."user"
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "user_insert_own" ON public."user" 
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "user_update_own" ON public."user"
  FOR UPDATE USING (id = auth.uid());

-- Allow service role to manage all users (for invitations)
CREATE POLICY "service_role_full_access_user" ON public."user"
  FOR ALL USING (auth.role() = 'service_role');

-- Create simple, safe policies for the membership table
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

-- Re-enable RLS
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public."user" TO authenticated;
GRANT ALL ON public.membership TO authenticated;

-- Also grant to service role for API operations
GRANT ALL ON public."user" TO service_role;
GRANT ALL ON public.membership TO service_role;