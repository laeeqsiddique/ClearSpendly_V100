-- Development Setup: Create user, tenant, and membership manually
-- Use this when not using Polar integration yet

-- Step 1: Find your user ID from auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Step 2: Replace YOUR_USER_ID with your actual ID from above
-- Replace YOUR_EMAIL with your actual email

-- Create user record in public.user table
INSERT INTO public.user (id, email, full_name, created_at, updated_at)
VALUES (
    'YOUR_USER_ID',  -- Replace this
    'YOUR_EMAIL',    -- Replace this  
    'Dev User',      -- You can change this name
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Create a development tenant
INSERT INTO public.tenant (id, name, slug, subscription_status, subscription_plan, privacy_mode, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Development Organization',
    'dev-org',
    'trial',
    'free', 
    false,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO NOTHING
RETURNING id;  -- Copy this tenant ID

-- Step 3: Create membership (replace both IDs)
INSERT INTO public.membership (id, user_id, tenant_id, role, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'YOUR_USER_ID',      -- Same user ID from Step 2
    'TENANT_ID_FROM_ABOVE',  -- Tenant ID from the INSERT above
    'owner',
    NOW(),
    NOW()
);

-- Step 4: Verify setup
SELECT 
    u.email as user_email,
    t.name as tenant_name,
    t.slug as tenant_slug,
    m.role as user_role,
    t.subscription_status,
    t.subscription_plan
FROM public.user u
JOIN public.membership m ON m.user_id = u.id
JOIN public.tenant t ON t.id = m.tenant_id
WHERE u.id = 'YOUR_USER_ID';  -- Same user ID