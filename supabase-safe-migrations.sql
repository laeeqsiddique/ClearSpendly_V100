-- Safe migration script for ClearSpendly
-- Run this in your Supabase SQL Editor

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise')),
  subscription_current_period_end TIMESTAMPTZ,
  receipts_limit INTEGER DEFAULT 10,
  storage_limit_gb INTEGER DEFAULT 10,
  polar_customer_id TEXT,
  polar_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create memberships table (many-to-many between users and tenants)
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- 4. Create receipts table (if needed)
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  vendor_name TEXT,
  amount DECIMAL(10,2),
  date DATE,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',
  image_url TEXT,
  ocr_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create transactions table (if needed)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE,
  amount DECIMAL(10,2),
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON public.memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_polar_customer_id ON public.tenants(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id ON public.receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON public.transactions(tenant_id);

-- 7. Enable RLS on tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 8. Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.memberships m
  WHERE m.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create basic RLS policies
-- Tenants policies
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
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

-- Receipts policies (if table exists)
CREATE POLICY "Users can view tenant receipts" ON public.receipts
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

CREATE POLICY "Users can insert tenant receipts" ON public.receipts
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

-- 10. Function to handle new user (simplified version)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger for new users (may fail if no permissions, that's OK)
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot create trigger on auth.users - insufficient privileges. This is OK.';
END$$;

-- 12. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tenants TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.memberships TO authenticated;
GRANT ALL ON public.receipts TO authenticated;
GRANT ALL ON public.transactions TO authenticated;

-- 13. Insert current user if they don't exist
DO $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  -- Get current user ID and email
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    -- Get user email from auth.users
    SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    
    -- Insert user if not exists
    INSERT INTO public.users (id, email)
    VALUES (current_user_id, current_user_email)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'User record created/verified for %', current_user_email;
  END IF;
END$$;