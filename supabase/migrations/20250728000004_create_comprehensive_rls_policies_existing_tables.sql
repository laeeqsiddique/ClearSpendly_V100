-- Phase 1: Comprehensive RLS Policies for EXISTING Tenant-Isolated Tables
-- This creates RLS policies only for tables that actually exist in the database
-- RLS is NOT enabled yet - only policies are defined

-- =============================================================================
-- MILEAGE SYSTEM POLICIES (3 tables)
-- =============================================================================

-- Mileage Log: Full CRUD with admin-only delete
CREATE POLICY "mileage_log_select_membership" ON mileage_log FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "mileage_log_insert_membership" ON mileage_log FOR INSERT 
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "mileage_log_update_membership" ON mileage_log FOR UPDATE 
  USING (user_has_tenant_access(tenant_id))
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "mileage_log_delete_membership" ON mileage_log FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- Mileage Template: Full CRUD with admin-only delete
CREATE POLICY "mileage_template_select_membership" ON mileage_template FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "mileage_template_insert_membership" ON mileage_template FOR INSERT 
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "mileage_template_update_membership" ON mileage_template FOR UPDATE 
  USING (user_has_tenant_access(tenant_id))
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "mileage_template_delete_membership" ON mileage_template FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- IRS Mileage Rate: Admin-only management
CREATE POLICY "irs_mileage_rate_select_membership" ON irs_mileage_rate FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "irs_mileage_rate_insert_membership" ON irs_mileage_rate FOR INSERT 
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "irs_mileage_rate_update_membership" ON irs_mileage_rate FOR UPDATE 
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "irs_mileage_rate_delete_membership" ON irs_mileage_rate FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- =============================================================================
-- INVOICE SYSTEM POLICIES (4 tables)
-- =============================================================================

-- Client: Full CRUD with admin-only delete
CREATE POLICY "client_select_membership" ON client FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "client_insert_membership" ON client FOR INSERT 
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "client_update_membership" ON client FOR UPDATE 
  USING (user_has_tenant_access(tenant_id))
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "client_delete_membership" ON client FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- Invoice Template: Full CRUD with admin-only delete
CREATE POLICY "invoice_template_select_membership" ON invoice_template FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "invoice_template_insert_membership" ON invoice_template FOR INSERT 
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "invoice_template_update_membership" ON invoice_template FOR UPDATE 
  USING (user_has_tenant_access(tenant_id))
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "invoice_template_delete_membership" ON invoice_template FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- Invoice: Full CRUD with admin-only delete
CREATE POLICY "invoice_select_membership" ON invoice FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "invoice_insert_membership" ON invoice FOR INSERT 
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "invoice_update_membership" ON invoice FOR UPDATE 
  USING (user_has_tenant_access(tenant_id))
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "invoice_delete_membership" ON invoice FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- Recurring Invoice: Full CRUD with admin-only delete
CREATE POLICY "recurring_invoice_select_membership" ON recurring_invoice FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "recurring_invoice_insert_membership" ON recurring_invoice FOR INSERT 
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "recurring_invoice_update_membership" ON recurring_invoice FOR UPDATE 
  USING (user_has_tenant_access(tenant_id))
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "recurring_invoice_delete_membership" ON recurring_invoice FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- =============================================================================
-- PAYMENT SYSTEM POLICIES (2 tables)
-- =============================================================================

-- Payment: Full CRUD with admin-only delete
CREATE POLICY "payment_select_membership" ON payment FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "payment_insert_membership" ON payment FOR INSERT 
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "payment_update_membership" ON payment FOR UPDATE 
  USING (user_has_tenant_access(tenant_id))
  WITH CHECK (user_has_tenant_access(tenant_id));

CREATE POLICY "payment_delete_membership" ON payment FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- Note: payment_summary table removed as it doesn't exist in the database

-- =============================================================================
-- EMAIL SYSTEM POLICIES (2 tables)
-- =============================================================================

-- Email Templates: Admin-only management
CREATE POLICY "email_templates_select_membership" ON email_templates FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "email_templates_insert_membership" ON email_templates FOR INSERT 
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "email_templates_update_membership" ON email_templates FOR UPDATE 
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "email_templates_delete_membership" ON email_templates FOR DELETE 
  USING (is_tenant_admin(tenant_id));

-- Email Send Log: Read/insert for members, view for all
CREATE POLICY "email_send_log_select_membership" ON email_send_log FOR SELECT 
  USING (user_has_tenant_access(tenant_id));

CREATE POLICY "email_send_log_insert_membership" ON email_send_log FOR INSERT 
  WITH CHECK (user_has_tenant_access(tenant_id));

-- =============================================================================
-- CORE SYSTEM TABLES (5 tables) - Already have policies from earlier migrations
-- =============================================================================
-- These tables already have RLS policies:
-- - receipt, receipt_item, vendor, tag, tag_category, receipt_tag, receipt_item_tag
-- - membership (tenant relationship table)

-- Note: Core tables (receipt, receipt_item, vendor, tag tables, membership) 
-- already have RLS policies from previous migrations

-- Grant necessary permissions (these may already exist but won't error if run again)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON POLICY "mileage_log_select_membership" ON mileage_log IS 'Allow viewing mileage logs for tenant members';
COMMENT ON POLICY "client_select_membership" ON client IS 'Allow viewing clients for tenant members';
COMMENT ON POLICY "invoice_select_membership" ON invoice IS 'Allow viewing invoices for tenant members';
COMMENT ON POLICY "payment_select_membership" ON payment IS 'Allow viewing payments for tenant members';
COMMENT ON POLICY "email_templates_select_membership" ON email_templates IS 'Allow viewing email templates for tenant members';