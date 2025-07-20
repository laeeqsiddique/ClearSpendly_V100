-- Custom JWT Claims for Multi-Tenant Context
-- This adds tenant information to the JWT token for client-side access

-- Function to get user's tenant claims
CREATE OR REPLACE FUNCTION public.get_user_tenant_claims(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  tenant_claims JSON;
BEGIN
  SELECT json_build_object(
    'tenant_ids', json_agg(DISTINCT m.tenant_id),
    'primary_tenant_id', (
      SELECT m2.tenant_id 
      FROM public.memberships m2 
      WHERE m2.user_id = user_uuid 
      ORDER BY m2.created_at ASC 
      LIMIT 1
    ),
    'roles', json_object_agg(m.tenant_id, m.role)
  )
  INTO tenant_claims
  FROM public.memberships m
  WHERE m.user_id = user_uuid;
  
  RETURN COALESCE(tenant_claims, '{"tenant_ids": [], "primary_tenant_id": null, "roles": {}}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update custom claims in auth.users
CREATE OR REPLACE FUNCTION public.update_user_claims()
RETURNS TRIGGER AS $$
DECLARE
  user_uuid UUID;
  claims JSON;
BEGIN
  -- Get the user_id from the membership change
  IF TG_OP = 'DELETE' THEN
    user_uuid := OLD.user_id;
  ELSE
    user_uuid := NEW.user_id;
  END IF;

  -- Get updated claims
  SELECT public.get_user_tenant_claims(user_uuid) INTO claims;

  -- Update the user's raw_app_meta_data
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_context', claims)
  WHERE id = user_uuid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update claims when memberships change
DROP TRIGGER IF EXISTS update_user_claims_on_membership_change ON public.memberships;
CREATE TRIGGER update_user_claims_on_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_user_claims();

-- Function to update claims when a user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();