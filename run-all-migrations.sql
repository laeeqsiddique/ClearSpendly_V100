-- Combined migration script for ClearSpendly
-- Run this in your Supabase SQL Editor

-- 1. Create tenant system tables
-- From: 20240718000001_create_tenant_system.sql

-- Enable RLS on auth.users if not already enabled
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise')),
  subscription_current_period_end TIMESTAMPTZ,
  receipts_limit INTEGER DEFAULT 10,
  storage_limit_gb INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create memberships table (many-to-many between users and tenants)
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON public.memberships(tenant_id);

-- Enable RLS on tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies
-- From: 20240718000002_create_rls_policies.sql

-- Helper function to get user's tenant IDs
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.memberships m
  WHERE m.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is tenant owner/admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.tenant_id = tenant_uuid 
    AND m.user_id = user_uuid 
    AND m.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

CREATE POLICY "Tenant admins can update their tenants" ON public.tenants
  FOR UPDATE USING (
    public.is_tenant_admin(id)
  );

-- Users policies
CREATE POLICY "Users can view themselves" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update themselves" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert themselves" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Memberships policies
CREATE POLICY "Users can view their memberships" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can manage memberships" ON public.memberships
  FOR ALL USING (
    public.is_tenant_admin(tenant_id)
  );

-- 3. JWT Claims
-- From: 20240718000003_jwt_claims.sql

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Add Polar fields
-- From: 20240718000004_add_polar_fields.sql

-- Add Polar-specific fields to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- Create index for Polar lookups
CREATE INDEX IF NOT EXISTS idx_tenants_polar_customer_id ON public.tenants(polar_customer_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tenants TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.memberships TO authenticated;

-- 5. Create core tables (receipts, transactions, etc.)
-- You'll need to run the 20250714000001_create_core_tables.sql separately if needed