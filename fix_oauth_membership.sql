-- Fix OAuth user by creating tenant and membership
-- Replace the user_id and email with your actual values

-- 1. Create a tenant for the OAuth user
INSERT INTO public.tenant (id, name, slug, subscription_status, subscription_plan, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Servaling Services', -- Based on your email
  'servaling-services', 
  'trial',
  'free',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, name, slug;

-- 2. Get the tenant ID we just created (or existing one)
WITH tenant_info AS (
  SELECT id as tenant_id FROM public.tenant WHERE slug = 'servaling-services' LIMIT 1
),
user_info AS (
  SELECT id as user_id FROM public."user" WHERE email = 'servalingservices@gmail.com' LIMIT 1
)
-- 3. Create membership linking user to tenant
INSERT INTO public.membership (
  id,
  tenant_id, 
  user_id, 
  role, 
  status, 
  created_at, 
  updated_at
)
SELECT 
  gen_random_uuid(),
  t.tenant_id,
  u.user_id,
  'owner',
  'active',
  NOW(),
  NOW()
FROM tenant_info t, user_info u
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW()
RETURNING id, tenant_id, user_id, role, status;

-- 4. Verify the fix worked
SELECT 
  u.email,
  t.name as tenant_name,
  m.role,
  m.status
FROM public."user" u
JOIN public.membership m ON m.user_id = u.id
JOIN public.tenant t ON t.id = m.tenant_id
WHERE u.email = 'servalingservices@gmail.com';