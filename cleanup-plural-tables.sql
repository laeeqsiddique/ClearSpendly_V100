-- Cleanup script to remove plural tables and keep singular ones
-- The application was designed to use singular table names

-- First, let's check what exists
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('user', 'tenant', 'membership', 'receipt', 'transaction') THEN 'KEEP (singular)'
        WHEN table_name IN ('users', 'tenants', 'memberships', 'receipts', 'transactions') THEN 'DELETE (plural)'
        ELSE 'OTHER'
    END as action
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Drop the plural tables that were mistakenly created
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Verify the singular tables exist
SELECT 
    'Remaining tables:' as info,
    string_agg(table_name, ', ') as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Now let's make sure the current user has a proper setup in the singular tables
-- Check if user exists
SELECT * FROM public.user WHERE id = auth.uid();

-- If not, create user record
INSERT INTO public.user (id, email, full_name)
SELECT 
    id, 
    email,
    COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users 
WHERE id = auth.uid()
ON CONFLICT (id) DO NOTHING;

-- Create tenant and membership if needed
DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if user has a membership
    IF NOT EXISTS (SELECT 1 FROM public.membership WHERE user_id = v_user_id) THEN
        -- Create a tenant
        INSERT INTO public.tenant (name, slug)
        VALUES ('My Organization', 'my-org-' || substr(md5(random()::text), 0, 8))
        RETURNING id INTO v_tenant_id;
        
        -- Create membership
        INSERT INTO public.membership (user_id, tenant_id, role)
        VALUES (v_user_id, v_tenant_id, 'owner');
        
        RAISE NOTICE 'Created tenant and membership for user';
    END IF;
END$$;

-- Verify setup
SELECT 
    u.email,
    t.name as tenant_name,
    t.slug,
    m.role
FROM public.user u
JOIN public.membership m ON m.user_id = u.id
JOIN public.tenant t ON t.id = m.tenant_id
WHERE u.id = auth.uid();