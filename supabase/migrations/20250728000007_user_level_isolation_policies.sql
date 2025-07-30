-- Phase 2: User-Level Isolation RLS Policies
-- Implements user-level data isolation within tenants for expense data

-- Helper function to check if user is admin/owner (can see all tenant data)
CREATE OR REPLACE FUNCTION public.is_tenant_admin_or_owner(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF user_uuid IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_uuid 
      AND m.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update receipt policies for user-level isolation
DROP POLICY IF EXISTS "receipt_select" ON receipt;
DROP POLICY IF EXISTS "receipt_insert" ON receipt;
DROP POLICY IF EXISTS "receipt_update" ON receipt;
DROP POLICY IF EXISTS "receipt_delete" ON receipt;

-- Users see only their own receipts, admins/owners see all tenant receipts
CREATE POLICY "receipt_select_user_isolation" ON receipt
  FOR SELECT USING (
    CASE 
      WHEN is_tenant_admin_or_owner(tenant_id) THEN true
      ELSE created_by = auth.uid()
    END
  );

CREATE POLICY "receipt_insert_user_isolation" ON receipt
  FOR INSERT WITH CHECK (
    user_has_tenant_access(tenant_id) AND
    (created_by = auth.uid() OR is_tenant_admin_or_owner(tenant_id))
  );

CREATE POLICY "receipt_update_user_isolation" ON receipt
  FOR UPDATE USING (
    CASE 
      WHEN is_tenant_admin_or_owner(tenant_id) THEN true
      ELSE created_by = auth.uid()
    END
  ) WITH CHECK (
    user_has_tenant_access(tenant_id) AND
    (created_by = auth.uid() OR is_tenant_admin_or_owner(tenant_id))
  );

CREATE POLICY "receipt_delete_user_isolation" ON receipt
  FOR DELETE USING (is_tenant_admin_or_owner(tenant_id));

-- Update mileage_log policies for user-level isolation
DROP POLICY IF EXISTS "mileage_log_select_membership" ON mileage_log;
DROP POLICY IF EXISTS "mileage_log_insert_membership" ON mileage_log;
DROP POLICY IF EXISTS "mileage_log_update_membership" ON mileage_log;
DROP POLICY IF EXISTS "mileage_log_delete_membership" ON mileage_log;

-- Users see only their own mileage, admins/owners see all tenant mileage
CREATE POLICY "mileage_log_select_user_isolation" ON mileage_log
  FOR SELECT USING (
    CASE 
      WHEN is_tenant_admin_or_owner(tenant_id) THEN true
      ELSE user_id = auth.uid()
    END
  );

CREATE POLICY "mileage_log_insert_user_isolation" ON mileage_log
  FOR INSERT WITH CHECK (
    user_has_tenant_access(tenant_id) AND
    (user_id = auth.uid() OR is_tenant_admin_or_owner(tenant_id))
  );

CREATE POLICY "mileage_log_update_user_isolation" ON mileage_log
  FOR UPDATE USING (
    CASE 
      WHEN is_tenant_admin_or_owner(tenant_id) THEN true
      ELSE user_id = auth.uid()
    END
  ) WITH CHECK (
    user_has_tenant_access(tenant_id) AND
    (user_id = auth.uid() OR is_tenant_admin_or_owner(tenant_id))
  );

CREATE POLICY "mileage_log_delete_user_isolation" ON mileage_log
  FOR DELETE USING (is_tenant_admin_or_owner(tenant_id));

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_tenant_admin_or_owner(UUID, UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.is_tenant_admin_or_owner(UUID, UUID) IS 'Checks if user has admin or owner role for tenant';
COMMENT ON POLICY "receipt_select_user_isolation" ON receipt IS 'Users see own receipts, admins see all tenant receipts';
COMMENT ON POLICY "mileage_log_select_user_isolation" ON mileage_log IS 'Users see own mileage, admins see all tenant mileage';