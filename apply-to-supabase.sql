-- 🚀 FLOWVYA PRODUCTION SETUP - Run this in Supabase SQL Editor
-- This creates the essential tables for your subscription system

-- 1. Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  stripe_price_id_monthly VARCHAR(200),
  stripe_price_id_yearly VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name),
  UNIQUE(slug)
);

-- 2. Create subscription table (only if tenant table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant') THEN
        CREATE TABLE IF NOT EXISTS public.subscription (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
          plan_id UUID NOT NULL REFERENCES public.subscription_plan(id),
          billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          stripe_subscription_id VARCHAR(200),
          stripe_customer_id VARCHAR(200),
          current_period_start TIMESTAMPTZ,
          current_period_end TIMESTAMPTZ,
          trial_end TIMESTAMPTZ,
          cancel_at_period_end BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        RAISE NOTICE 'Tenant table does not exist - skipping subscription table creation';
    END IF;
END
$$;

-- 3. Create usage tracking table (only if tenant table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant') THEN
        CREATE TABLE IF NOT EXISTS public.usage_tracking (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
          metric_name VARCHAR(100) NOT NULL,
          current_usage INTEGER DEFAULT 0,
          period_start TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()),
          period_end TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
          last_reset TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(tenant_id, metric_name, period_start)
        );
    ELSE
        RAISE NOTICE 'Tenant table does not exist - skipping usage_tracking table creation';
    END IF;
END
$$;

-- 4. Insert default subscription plans
INSERT INTO public.subscription_plan (name, slug, description, price_monthly, price_yearly, features, limits, sort_order)
VALUES 
  (
    'Free',
    'free',
    'Perfect for getting started with basic expense tracking',
    0.00,
    0.00,
    '{"receipts": true, "invoices": true, "basic_ocr": true, "email_support": false, "priority_support": false, "custom_branding": false, "analytics": "basic", "api_access": false}',
    '{"monthly_receipts": 10, "monthly_invoices": 2, "storage_mb": 100, "team_members": 1}',
    1
  ),
  (
    'Pro',
    'pro', 
    'Advanced features for growing businesses',
    19.99,
    199.99,
    '{"receipts": true, "invoices": true, "enhanced_ocr": true, "email_templates": true, "email_support": true, "priority_support": false, "custom_branding": true, "analytics": "advanced", "api_access": "basic"}',
    '{"monthly_receipts": 500, "monthly_invoices": 50, "storage_mb": 5120, "team_members": 1}',
    2
  ),
  (
    'Business',
    'business',
    'Everything you need to run your business efficiently',
    49.99, 
    499.99,
    '{"receipts": true, "invoices": true, "premium_ocr": true, "email_templates": true, "email_support": true, "priority_support": true, "custom_branding": true, "analytics": "premium", "api_access": "full", "team_management": true}',
    '{"monthly_receipts": -1, "monthly_invoices": -1, "storage_mb": 25600, "team_members": 10}',
    3
  ),
  (
    'Enterprise',
    'enterprise',
    'Complete solution for large organizations',
    99.99,
    999.99,
    '{"receipts": true, "invoices": true, "premium_ocr": true, "email_templates": true, "email_support": true, "priority_support": true, "custom_branding": true, "analytics": "premium", "api_access": "full", "team_management": true, "sso": true, "custom_integrations": true}',
    '{"monthly_receipts": -1, "monthly_invoices": -1, "storage_mb": -1, "team_members": -1}',
    4
  )
ON CONFLICT (slug) DO NOTHING;

-- 5. Create Supabase Storage Buckets (these are safe to run multiple times)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('receipts', 'receipts', false, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('invoices', 'invoices', false, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('profiles', 'profiles', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('logos', 'logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- 6. Enable Row Level Security on new tables (if they were created)
DO $$
BEGIN
    -- Enable RLS on subscription tables if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plan') THEN
        ALTER TABLE public.subscription_plan ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription') THEN
        ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
        ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- 7. Create RLS policies (only if subscription table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription') THEN
        -- Subscription plans are publicly readable
        DROP POLICY IF EXISTS "subscription_plans_public_read" ON public.subscription_plan;
        CREATE POLICY "subscription_plans_public_read" ON public.subscription_plan
        FOR SELECT USING (is_active = true);

        -- Subscriptions are tenant-isolated  
        DROP POLICY IF EXISTS "tenant_subscription_isolation" ON public.subscription;
        CREATE POLICY "tenant_subscription_isolation" ON public.subscription
        FOR ALL USING (
            tenant_id IN (
                SELECT tenant_id FROM public.membership 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        );

        -- Usage tracking is tenant-isolated
        DROP POLICY IF EXISTS "tenant_usage_isolation" ON public.usage_tracking;
        CREATE POLICY "tenant_usage_isolation" ON public.usage_tracking
        FOR ALL USING (
            tenant_id IN (
                SELECT tenant_id FROM public.membership 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        );
    END IF;
END
$$;

-- 8. Create storage bucket policies (safe to run multiple times)
DO $$
BEGIN
    -- Receipts bucket - tenant isolated
    DROP POLICY IF EXISTS "tenant_receipts_policy" ON storage.objects;
    CREATE POLICY "tenant_receipts_policy" ON storage.objects
    FOR ALL USING (
        bucket_id = 'receipts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
        AND (storage.foldername(name))[2] IN (
            SELECT tenant_id::text FROM public.membership 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

    -- Invoices bucket - tenant isolated
    DROP POLICY IF EXISTS "tenant_invoices_policy" ON storage.objects;  
    CREATE POLICY "tenant_invoices_policy" ON storage.objects
    FOR ALL USING (
        bucket_id = 'invoices'
        AND auth.uid()::text = (storage.foldername(name))[1] 
        AND (storage.foldername(name))[2] IN (
            SELECT tenant_id::text FROM public.membership
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

    -- Profiles bucket - user isolated
    DROP POLICY IF EXISTS "user_profiles_policy" ON storage.objects;
    CREATE POLICY "user_profiles_policy" ON storage.objects
    FOR ALL USING (
        bucket_id = 'profiles'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

    -- Logos bucket - public read, tenant write
    DROP POLICY IF EXISTS "logos_public_read_policy" ON storage.objects;
    CREATE POLICY "logos_public_read_policy" ON storage.objects
    FOR SELECT USING (bucket_id = 'logos');

    DROP POLICY IF EXISTS "logos_tenant_write_policy" ON storage.objects;
    CREATE POLICY "logos_tenant_write_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
        AND (storage.foldername(name))[2] IN (
            SELECT tenant_id::text FROM public.membership
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );
END
$$;

-- Success message
SELECT 'Flowvya database setup completed successfully! 🎉' as result;