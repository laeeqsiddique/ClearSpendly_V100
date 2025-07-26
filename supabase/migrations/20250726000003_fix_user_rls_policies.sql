-- Fix RLS policies for the user table to prevent infinite recursion
-- This addresses the issue where user table policies were causing infinite loops

-- First, drop existing problematic policies on the user table
DROP POLICY IF EXISTS "Users can view themselves" ON public."user";
DROP POLICY IF EXISTS "Users can update themselves" ON public."user";
DROP POLICY IF EXISTS "Users can insert themselves" ON public."user";

-- Create simple, non-recursive policies for the user table
-- Allow users to view their own record
CREATE POLICY "Users can view their own record" ON public."user"
  FOR SELECT USING (id = auth.uid());

-- Allow users to update their own record
CREATE POLICY "Users can update their own record" ON public."user"
  FOR UPDATE USING (id = auth.uid());

-- Allow users to insert their own record (for initial signup)
CREATE POLICY "Users can insert their own record" ON public."user"
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow tenant admins to view and manage users in their tenant through membership table
-- This policy allows viewing users who are members of the same tenant
CREATE POLICY "Tenant members can view each other" ON public."user"
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT m2.user_id
      FROM public.membership m1
      JOIN public.membership m2 ON m1.tenant_id = m2.tenant_id
      WHERE m1.user_id = auth.uid()
    )
  );

-- Allow tenant admins to manage users for invitations
CREATE POLICY "Tenant admins can manage user records for invitations" ON public."user"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.membership m1
      WHERE m1.user_id = auth.uid()
      AND m1.role IN ('owner', 'admin')
      AND m1.tenant_id IN (
        SELECT m2.tenant_id FROM public.membership m2 WHERE m2.user_id = "user".id
      )
    )
  );

-- Update membership policies to handle invitations properly
DROP POLICY IF EXISTS "Tenant admins can manage memberships" ON public.membership;
CREATE POLICY "Tenant admins can manage memberships" ON public.membership
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.membership admin_membership
      WHERE admin_membership.user_id = auth.uid()
      AND admin_membership.tenant_id = membership.tenant_id
      AND admin_membership.role IN ('owner', 'admin')
    )
  );

-- Add specific policy for viewing memberships in the same tenant
CREATE POLICY "Users can view tenant memberships" ON public.membership
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.membership
      WHERE user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled on both tables
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;