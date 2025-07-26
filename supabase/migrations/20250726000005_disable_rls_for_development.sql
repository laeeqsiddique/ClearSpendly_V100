-- Temporarily disable RLS for development to avoid infinite recursion issues
-- This allows the team management system to work while we fix the RLS policies properly

-- Disable RLS on problematic tables for now
ALTER TABLE public."user" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean slate
DROP POLICY IF EXISTS "user_select_own" ON public."user";
DROP POLICY IF EXISTS "user_insert_own" ON public."user";
DROP POLICY IF EXISTS "user_update_own" ON public."user";
DROP POLICY IF EXISTS "service_role_full_access_user" ON public."user";
DROP POLICY IF EXISTS "membership_select_own" ON public.membership;
DROP POLICY IF EXISTS "membership_select_tenant" ON public.membership;
DROP POLICY IF EXISTS "membership_modify_admin" ON public.membership;
DROP POLICY IF EXISTS "service_role_full_access_membership" ON public.membership;

-- Keep RLS disabled for development
-- TODO: Re-enable with proper policies once the team system is working

-- Ensure proper permissions are granted
GRANT ALL ON public."user" TO authenticated;
GRANT ALL ON public.membership TO authenticated;
GRANT ALL ON public."user" TO service_role;
GRANT ALL ON public.membership TO service_role;