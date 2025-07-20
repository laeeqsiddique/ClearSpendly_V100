-- Row Level Security Policies for Multi-Tenant Architecture
-- This ensures complete data isolation between tenants

-- Helper function to get user's tenant IDs
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.tenant_id
  FROM public.memberships m
  WHERE m.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is tenant owner/admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.tenant_id = tenant_uuid 
    AND m.user_id = user_uuid 
    AND m.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants policies
DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

DROP POLICY IF EXISTS "Tenant admins can update their tenants" ON public.tenants;
CREATE POLICY "Tenant admins can update their tenants" ON public.tenants
  FOR UPDATE USING (
    public.is_tenant_admin(id)
  );

-- Users policies
DROP POLICY IF EXISTS "Users can view themselves" ON public.users;
CREATE POLICY "Users can view themselves" ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update themselves" ON public.users;
CREATE POLICY "Users can update themselves" ON public.users
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert themselves" ON public.users;
CREATE POLICY "Users can insert themselves" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Memberships policies
DROP POLICY IF EXISTS "Users can view their memberships" ON public.memberships;
CREATE POLICY "Users can view their memberships" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Tenant admins can manage memberships" ON public.memberships;
CREATE POLICY "Tenant admins can manage memberships" ON public.memberships
  FOR ALL USING (
    public.is_tenant_admin(tenant_id)
  );

-- Receipts policies
DROP POLICY IF EXISTS "Users can view tenant receipts" ON public.receipts;
CREATE POLICY "Users can view tenant receipts" ON public.receipts
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

DROP POLICY IF EXISTS "Users can insert tenant receipts" ON public.receipts;
CREATE POLICY "Users can insert tenant receipts" ON public.receipts
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

DROP POLICY IF EXISTS "Users can update tenant receipts" ON public.receipts;
CREATE POLICY "Users can update tenant receipts" ON public.receipts
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

DROP POLICY IF EXISTS "Users can delete tenant receipts" ON public.receipts;
CREATE POLICY "Users can delete tenant receipts" ON public.receipts
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

-- Transactions policies
DROP POLICY IF EXISTS "Users can view tenant transactions" ON public.transactions;
CREATE POLICY "Users can view tenant transactions" ON public.transactions
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

DROP POLICY IF EXISTS "Users can insert tenant transactions" ON public.transactions;
CREATE POLICY "Users can insert tenant transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

DROP POLICY IF EXISTS "Users can update tenant transactions" ON public.transactions;
CREATE POLICY "Users can update tenant transactions" ON public.transactions
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

DROP POLICY IF EXISTS "Users can delete tenant transactions" ON public.transactions;
CREATE POLICY "Users can delete tenant transactions" ON public.transactions
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM public.get_user_tenant_ids())
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tenants TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.memberships TO authenticated;
GRANT ALL ON public.receipts TO authenticated;
GRANT ALL ON public.transactions TO authenticated;