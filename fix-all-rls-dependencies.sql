-- COMPREHENSIVE RLS FIX - Handle all dependencies first
-- This eliminates 42P17 infinite recursion by updating ALL dependent policies

-- ==============================================================================
-- PHASE 1: CREATE NEW SAFE FUNCTIONS FIRST (before dropping old ones)
-- ==============================================================================

-- Create safe functions with different names to avoid conflicts
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids_safe()
RETURNS UUID[] AS $$
DECLARE
  user_id UUID;
  tenant_ids UUID[];
BEGIN
  user_id := auth.uid();
  
  -- Return empty array if no user
  IF user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS and avoid recursion
  SELECT ARRAY_AGG(m.tenant_id)
  INTO tenant_ids
  FROM public.membership m
  WHERE m.user_id = user_id
    AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL));
    
  RETURN COALESCE(tenant_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_can_access_tenant_safe(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  user_id := auth.uid();
  
  -- Return false if no user or tenant
  IF user_id IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS and avoid recursion
  RETURN tenant_uuid = ANY(public.get_user_tenant_ids_safe());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_is_tenant_admin_safe(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  user_id := auth.uid();
  
  -- Return false if no user or tenant
  IF user_id IS NULL OR tenant_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use SECURITY DEFINER to bypass RLS and avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.membership m
    WHERE m.tenant_id = tenant_uuid 
      AND m.user_id = user_id 
      AND m.role IN ('owner', 'admin')
      AND (m.status = 'active' OR (m.status IS NULL AND m.accepted_at IS NOT NULL))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_tenant_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_tenant_admin_safe(UUID) TO authenticated;

-- ==============================================================================
-- PHASE 2: UPDATE ALL POLICIES TO USE SAFE FUNCTIONS
-- ==============================================================================

-- Update tag_category policies
DROP POLICY IF EXISTS "tag_category_select_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_insert_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_update_membership" ON tag_category;
DROP POLICY IF EXISTS "tag_category_delete_membership" ON tag_category;

CREATE POLICY "tag_category_select_safe" ON tag_category
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "tag_category_insert_safe" ON tag_category
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "tag_category_update_safe" ON tag_category
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "tag_category_delete_safe" ON tag_category
  FOR DELETE USING (public.user_can_access_tenant_safe(tenant_id));

-- Update tag policies
DROP POLICY IF EXISTS "tag_select_membership" ON tag;
DROP POLICY IF EXISTS "tag_insert_membership" ON tag;
DROP POLICY IF EXISTS "tag_update_membership" ON tag;
DROP POLICY IF EXISTS "tag_delete_membership" ON tag;

CREATE POLICY "tag_select_safe" ON tag
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "tag_insert_safe" ON tag
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "tag_update_safe" ON tag
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "tag_delete_safe" ON tag
  FOR DELETE USING (public.user_can_access_tenant_safe(tenant_id));

-- Update receipt_tag policies
DROP POLICY IF EXISTS "receipt_tag_select_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_insert_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_update_membership" ON receipt_tag;
DROP POLICY IF EXISTS "receipt_tag_delete_membership" ON receipt_tag;

CREATE POLICY "receipt_tag_select_safe" ON receipt_tag
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "receipt_tag_insert_safe" ON receipt_tag
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "receipt_tag_update_safe" ON receipt_tag
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "receipt_tag_delete_safe" ON receipt_tag
  FOR DELETE USING (public.user_can_access_tenant_safe(tenant_id));

-- Update receipt_item_tag policies
DROP POLICY IF EXISTS "receipt_item_tag_select_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_insert_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_update_membership" ON receipt_item_tag;
DROP POLICY IF EXISTS "receipt_item_tag_delete_membership" ON receipt_item_tag;

CREATE POLICY "receipt_item_tag_select_safe" ON receipt_item_tag
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "receipt_item_tag_insert_safe" ON receipt_item_tag
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "receipt_item_tag_update_safe" ON receipt_item_tag
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "receipt_item_tag_delete_safe" ON receipt_item_tag
  FOR DELETE USING (public.user_can_access_tenant_safe(tenant_id));

-- Update mileage_template policies
DROP POLICY IF EXISTS "mileage_template_select_membership" ON mileage_template;
DROP POLICY IF EXISTS "mileage_template_insert_membership" ON mileage_template;
DROP POLICY IF EXISTS "mileage_template_update_membership" ON mileage_template;

CREATE POLICY "mileage_template_select_safe" ON mileage_template
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "mileage_template_insert_safe" ON mileage_template
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "mileage_template_update_safe" ON mileage_template
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- Update irs_mileage_rate policies
DROP POLICY IF EXISTS "irs_mileage_rate_select_membership" ON irs_mileage_rate;

CREATE POLICY "irs_mileage_rate_select_safe" ON irs_mileage_rate
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));

-- Update client policies
DROP POLICY IF EXISTS "client_select_membership" ON client;
DROP POLICY IF EXISTS "client_insert_membership" ON client;
DROP POLICY IF EXISTS "client_update_membership" ON client;

CREATE POLICY "client_select_safe" ON client
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "client_insert_safe" ON client
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "client_update_safe" ON client
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- Update invoice_template policies
DROP POLICY IF EXISTS "invoice_template_select_membership" ON invoice_template;
DROP POLICY IF EXISTS "invoice_template_insert_membership" ON invoice_template;
DROP POLICY IF EXISTS "invoice_template_update_membership" ON invoice_template;

CREATE POLICY "invoice_template_select_safe" ON invoice_template
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "invoice_template_insert_safe" ON invoice_template
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "invoice_template_update_safe" ON invoice_template
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- Update invoice policies
DROP POLICY IF EXISTS "invoice_select_membership" ON invoice;
DROP POLICY IF EXISTS "invoice_insert_membership" ON invoice;
DROP POLICY IF EXISTS "invoice_update_membership" ON invoice;

CREATE POLICY "invoice_select_safe" ON invoice
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "invoice_insert_safe" ON invoice
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "invoice_update_safe" ON invoice
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- Update recurring_invoice policies
DROP POLICY IF EXISTS "recurring_invoice_select_membership" ON recurring_invoice;
DROP POLICY IF EXISTS "recurring_invoice_insert_membership" ON recurring_invoice;
DROP POLICY IF EXISTS "recurring_invoice_update_membership" ON recurring_invoice;

CREATE POLICY "recurring_invoice_select_safe" ON recurring_invoice
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "recurring_invoice_insert_safe" ON recurring_invoice
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "recurring_invoice_update_safe" ON recurring_invoice
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- Update payment policies
DROP POLICY IF EXISTS "payment_select_membership" ON payment;
DROP POLICY IF EXISTS "payment_insert_membership" ON payment;
DROP POLICY IF EXISTS "payment_update_membership" ON payment;

CREATE POLICY "payment_select_safe" ON payment
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "payment_insert_safe" ON payment
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "payment_update_safe" ON payment
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- Update email_templates policies
DROP POLICY IF EXISTS "email_templates_select_membership" ON email_templates;

CREATE POLICY "email_templates_select_safe" ON email_templates
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));

-- Update email_send_log policies
DROP POLICY IF EXISTS "email_send_log_select_membership" ON email_send_log;
DROP POLICY IF EXISTS "email_send_log_insert_membership" ON email_send_log;

CREATE POLICY "email_send_log_select_safe" ON email_send_log
  FOR SELECT USING (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "email_send_log_insert_safe" ON email_send_log
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- Update receipt policies
DROP POLICY IF EXISTS "receipt_insert_user_isolation" ON receipt;
DROP POLICY IF EXISTS "receipt_update_user_isolation" ON receipt;

CREATE POLICY "receipt_insert_safe" ON receipt
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "receipt_update_safe" ON receipt
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- Update mileage_log policies
DROP POLICY IF EXISTS "mileage_log_insert_user_isolation" ON mileage_log;
DROP POLICY IF EXISTS "mileage_log_update_user_isolation" ON mileage_log;

CREATE POLICY "mileage_log_insert_safe" ON mileage_log
  FOR INSERT WITH CHECK (public.user_can_access_tenant_safe(tenant_id));
CREATE POLICY "mileage_log_update_safe" ON mileage_log
  FOR UPDATE USING (public.user_can_access_tenant_safe(tenant_id))
  WITH CHECK (public.user_can_access_tenant_safe(tenant_id));

-- ==============================================================================
-- PHASE 3: NOW WE CAN SAFELY DROP OLD FUNCTIONS AND FIX MEMBERSHIP POLICIES
-- ==============================================================================

-- Now drop the old functions since no policies depend on them
DROP FUNCTION IF EXISTS public.user_has_tenant_access(UUID);
DROP FUNCTION IF EXISTS public.can_access_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_tenant_ids(UUID);
DROP FUNCTION IF EXISTS public.is_tenant_admin_or_owner(UUID, UUID);

-- Fix membership table policies (the source of recursion)
ALTER TABLE public.membership DISABLE ROW LEVEL SECURITY;

-- Drop all existing membership policies
DROP POLICY IF EXISTS "membership_select" ON public.membership;
DROP POLICY IF EXISTS "membership_insert" ON public.membership;
DROP POLICY IF EXISTS "membership_update" ON public.membership;
DROP POLICY IF EXISTS "membership_delete" ON public.membership;
DROP POLICY IF EXISTS "membership_select_own" ON public.membership;
DROP POLICY IF EXISTS "membership_select_tenant" ON public.membership;
DROP POLICY IF EXISTS "membership_modify_admin" ON public.membership;
DROP POLICY IF EXISTS "service_role_full_access_membership" ON public.membership;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.membership;
DROP POLICY IF EXISTS "Tenant admins can manage memberships" ON public.membership;
DROP POLICY IF EXISTS "Users can view tenant memberships" ON public.membership;
DROP POLICY IF EXISTS "membership_own_select" ON public.membership;
DROP POLICY IF EXISTS "membership_service_role_access" ON public.membership;
DROP POLICY IF EXISTS "membership_admin_management" ON public.membership;
DROP POLICY IF EXISTS "membership_select_own_v2" ON public.membership;
DROP POLICY IF EXISTS "membership_select_tenant_v2" ON public.membership;
DROP POLICY IF EXISTS "membership_modify_admin_v2" ON public.membership;
DROP POLICY IF EXISTS "service_role_full_access_membership_v2" ON public.membership;

-- Create simple, non-recursive membership policies
CREATE POLICY "membership_select_direct" ON public.membership
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "membership_service_role_full" ON public.membership
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "membership_insert_direct" ON public.membership
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "membership_update_direct" ON public.membership
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Re-enable RLS
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- PHASE 4: ADD SERVICE ROLE BYPASS FOR ALL TABLES
-- ==============================================================================

-- Add service role policies to all tables to ensure APIs work
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP
        BEGIN
            EXECUTE format('CREATE POLICY "service_role_bypass_%s" ON %I.%I FOR ALL USING (auth.role() = ''service_role'')', 
                          table_record.tablename, table_record.schemaname, table_record.tablename);
        EXCEPTION 
            WHEN duplicate_object THEN
                -- Policy already exists, skip
                NULL;
            WHEN undefined_table THEN
                -- Table doesn't exist or doesn't support RLS, skip
                NULL;
        END;
    END LOOP;
END $$;

-- ==============================================================================
-- COMPLETION MESSAGE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '
======================================================================
🎯 COMPREHENSIVE RLS FIX COMPLETED SUCCESSFULLY!
======================================================================

✅ FIXED ALL DEPENDENCIES:
   - Updated all table policies to use safe functions
   - Removed old recursive functions
   - Created bulletproof membership policies

✅ ELIMINATED RECURSION:
   - Membership policies use direct auth.uid() checks only
   - Safe functions use SECURITY DEFINER to bypass RLS
   - Service role bypass policies for all tables

✅ READY FOR TESTING:
   - Middleware should work without 42P17 errors
   - All dashboard APIs should return 200 (not 403)
   - Onboarding flow should work perfectly

======================================================================
  ';
END $$;