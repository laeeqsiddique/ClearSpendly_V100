-- Script to create a tenant for the current user
-- Run this AFTER running the migration script

DO $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  new_tenant_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    -- Get user email
    SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    
    -- Check if user already has a tenant
    IF NOT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = current_user_id) THEN
      -- Create a default organization name from email
      org_name := COALESCE(
        (SELECT raw_user_meta_data->>'organization_name' FROM auth.users WHERE id = current_user_id),
        SPLIT_PART(current_user_email, '@', 1) || '''s Organization'
      );
      
      -- Generate slug
      org_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-zA-Z0-9]', '-', 'g'));
      org_slug := REGEXP_REPLACE(org_slug, '-+', '-', 'g');
      org_slug := TRIM(BOTH '-' FROM org_slug);
      
      -- Ensure unique slug
      WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = org_slug) LOOP
        org_slug := org_slug || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
      END LOOP;
      
      -- Create tenant
      INSERT INTO public.tenants (name, slug, subscription_status, receipts_limit, storage_limit_gb)
      VALUES (org_name, org_slug, 'free', 10, 10)
      RETURNING id INTO new_tenant_id;
      
      -- Create membership
      INSERT INTO public.memberships (user_id, tenant_id, role)
      VALUES (current_user_id, new_tenant_id, 'owner');
      
      RAISE NOTICE 'Created tenant "%" with slug "%" for user %', org_name, org_slug, current_user_email;
    ELSE
      RAISE NOTICE 'User % already has a tenant', current_user_email;
    END IF;
  ELSE
    RAISE NOTICE 'No authenticated user found. Please run this while logged in.';
  END IF;
END$$;

-- Verify the setup
SELECT 
  t.name as tenant_name,
  t.slug as tenant_slug,
  m.role as user_role,
  u.email as user_email
FROM public.memberships m
JOIN public.tenants t ON t.id = m.tenant_id
JOIN public.users u ON u.id = m.user_id
WHERE u.id = auth.uid();