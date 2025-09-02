-- Debug script to check OAuth user creation
-- Run this in your Supabase SQL Editor

-- 1. Check if there are any users in auth.users with Google provider
SELECT 
  id, 
  email, 
  raw_app_meta_data->>'provider' as provider,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE raw_app_meta_data->>'provider' = 'google'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if corresponding users exist in "user" table
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.created_at as user_created_at,
  au.created_at as auth_created_at,
  au.raw_app_meta_data->>'provider' as provider
FROM auth.users au
LEFT JOIN public."user" u ON u.id = au.id
WHERE au.raw_app_meta_data->>'provider' = 'google'
ORDER BY au.created_at DESC
LIMIT 5;

-- 3. Check for users with memberships
SELECT 
  u.id,
  u.email,
  m.tenant_id,
  m.role,
  m.status,
  t.name as tenant_name
FROM auth.users au
LEFT JOIN public."user" u ON u.id = au.id
LEFT JOIN public.membership m ON m.user_id = au.id
LEFT JOIN public.tenant t ON t.id = m.tenant_id
WHERE au.raw_app_meta_data->>'provider' = 'google'
ORDER BY au.created_at DESC
LIMIT 5;

-- 4. Check if the trigger function exists and is correct
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 5. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';