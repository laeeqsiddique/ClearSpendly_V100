-- Manual setup for your user
-- Replace YOUR_USER_ID with your actual user ID from Supabase Auth

-- Step 1: Find your user ID
-- Go to Supabase Dashboard > Authentication > Users
-- Copy your user ID (it looks like: 53fdc491-6855-49d1-81a8-9ac847445274)

-- Step 2: Check if user exists in public.users
SELECT * FROM public.users WHERE id = 'YOUR_USER_ID';

-- Step 3: If no user found above, create one
INSERT INTO public.users (id, email, full_name)
VALUES (
    'YOUR_USER_ID',  -- Replace with your actual user ID
    'your-email@example.com',  -- Replace with your email
    'Your Name'  -- Replace with your name
)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create a tenant
INSERT INTO public.tenants (name, slug, subscription_status, receipts_limit, storage_limit_gb)
VALUES (
    'ClearSpendly Organization',  -- You can change this name
    'clearspendly-' || substr(md5(random()::text), 0, 8),
    'free',
    10,
    10
)
RETURNING id;  -- Copy this ID for the next step

-- Step 5: Create membership (replace both IDs)
INSERT INTO public.memberships (user_id, tenant_id, role)
VALUES (
    'YOUR_USER_ID',  -- Replace with your user ID from step 1
    'TENANT_ID_FROM_STEP_4',  -- Replace with the tenant ID from step 4
    'owner'
);

-- Step 6: Verify everything is set up
SELECT 
    u.email,
    t.name as tenant_name,
    t.slug,
    m.role
FROM public.users u
JOIN public.memberships m ON m.user_id = u.id
JOIN public.tenants t ON t.id = m.tenant_id
WHERE u.id = 'YOUR_USER_ID';  -- Replace with your user ID