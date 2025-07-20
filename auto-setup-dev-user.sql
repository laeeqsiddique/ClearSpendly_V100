-- Automatic Development Setup
-- This will create tenant and membership for whoever is currently logged in
-- Just run this while logged into your app

DO $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    new_tenant_id UUID;
BEGIN
    -- Get current user from session (you must be logged in)
    SELECT id, email INTO current_user_id, current_user_email 
    FROM auth.users 
    WHERE id = auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found. Please log in first.';
    END IF;
    
    RAISE NOTICE 'Setting up user: % (%)', current_user_email, current_user_id;
    
    -- Create user record in public.user
    INSERT INTO public.user (id, email, full_name, created_at, updated_at)
    VALUES (
        current_user_id,
        current_user_email,
        COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = current_user_id), 'Dev User'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    -- Check if user already has a membership
    IF EXISTS (SELECT 1 FROM public.membership WHERE user_id = current_user_id) THEN
        RAISE NOTICE 'User already has a membership, skipping tenant creation';
    ELSE
        -- Create development tenant
        INSERT INTO public.tenant (name, slug, subscription_status, subscription_plan, privacy_mode, created_at, updated_at)
        VALUES (
            'Development Organization',
            'dev-org-' || substr(md5(random()::text), 1, 6),  -- Random suffix to avoid conflicts
            'trial',
            'free',
            false,
            NOW(),
            NOW()
        )
        RETURNING id INTO new_tenant_id;
        
        -- Create membership
        INSERT INTO public.membership (user_id, tenant_id, role, created_at, updated_at)
        VALUES (
            current_user_id,
            new_tenant_id,
            'owner',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created tenant % and membership for user %', new_tenant_id, current_user_email;
    END IF;
END$$;

-- Verify the setup worked
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
WHERE u.id = auth.uid();