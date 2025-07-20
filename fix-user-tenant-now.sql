-- First, let's check if your user exists in the public.users table
SELECT id, email FROM public.users WHERE id = auth.uid();

-- If no results above, create the user record first:
INSERT INTO public.users (id, email, full_name)
SELECT 
    id, 
    email,
    COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users 
WHERE id = auth.uid()
ON CONFLICT (id) DO NOTHING;

-- Now create a tenant and membership for the current user
WITH new_tenant AS (
    INSERT INTO public.tenants (
        name, 
        slug, 
        subscription_status, 
        receipts_limit, 
        storage_limit_gb
    )
    VALUES (
        'My Organization',  -- Change this to your preferred name
        'my-org-' || substr(md5(random()::text), 0, 8),  -- Generates unique slug
        'free', 
        10, 
        10
    )
    RETURNING id
)
INSERT INTO public.memberships (user_id, tenant_id, role)
SELECT 
    auth.uid(), 
    id, 
    'owner'
FROM new_tenant;

-- Verify it worked:
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    m.role as your_role,
    u.email as your_email
FROM public.memberships m
JOIN public.tenants t ON t.id = m.tenant_id
JOIN public.users u ON u.id = m.user_id
WHERE u.id = auth.uid();