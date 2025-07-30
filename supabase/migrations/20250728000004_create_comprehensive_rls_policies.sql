-- Phase 1: Comprehensive RLS Policies for ALL Tenant-Isolated Tables
-- This migration creates RLS policies for ALL tables with tenant_id column
-- WITHOUT enabling RLS on any tables (safety first)

-- =============================================================================
-- MILEAGE SYSTEM TABLES
-- =============================================================================

-- Enable RLS on mileage tables (but create policies first)
-- ALTER TABLE mileage_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mileage_template ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE irs_mileage_rate ENABLE ROW LEVEL SECURITY;

-- Mileage Log Policies
CREATE POLICY "mileage_log_select_membership" ON mileage_log
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "mileage_log_insert_membership" ON mileage_log
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "mileage_log_update_membership" ON mileage_log
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "mileage_log_delete_membership" ON mileage_log
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- Mileage Template Policies
CREATE POLICY "mileage_template_select_membership" ON mileage_template
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "mileage_template_insert_membership" ON mileage_template
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "mileage_template_update_membership" ON mileage_template
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "mileage_template_delete_membership" ON mileage_template
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- IRS Mileage Rate Policies (tenant-specific rates)
CREATE POLICY "irs_mileage_rate_select_membership" ON irs_mileage_rate
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "irs_mileage_rate_insert_membership" ON irs_mileage_rate
  FOR INSERT WITH CHECK (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "irs_mileage_rate_update_membership" ON irs_mileage_rate
  FOR UPDATE USING (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "irs_mileage_rate_delete_membership" ON irs_mileage_rate
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- =============================================================================
-- INVOICE SYSTEM TABLES
-- =============================================================================

-- Enable RLS on invoice tables (but create policies first)
-- ALTER TABLE client ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoice_template ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recurring_invoice ENABLE ROW LEVEL SECURITY;

-- Client Policies
CREATE POLICY "client_select_membership" ON client
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "client_insert_membership" ON client
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "client_update_membership" ON client
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "client_delete_membership" ON client
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- Invoice Template Policies
CREATE POLICY "invoice_template_select_membership" ON invoice_template
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "invoice_template_insert_membership" ON invoice_template
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "invoice_template_update_membership" ON invoice_template
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "invoice_template_delete_membership" ON invoice_template
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- Invoice Policies
CREATE POLICY "invoice_select_membership" ON invoice
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "invoice_insert_membership" ON invoice
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "invoice_update_membership" ON invoice
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "invoice_delete_membership" ON invoice
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- Recurring Invoice Policies
CREATE POLICY "recurring_invoice_select_membership" ON recurring_invoice
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "recurring_invoice_insert_membership" ON recurring_invoice
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "recurring_invoice_update_membership" ON recurring_invoice
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "recurring_invoice_delete_membership" ON recurring_invoice
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- =============================================================================
-- PAYMENT SYSTEM TABLES
-- =============================================================================

-- Enable RLS on payment tables (but create policies first)
-- ALTER TABLE payment ENABLE ROW LEVEL SECURITY;

-- Payment Policies
CREATE POLICY "payment_select_membership" ON payment
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "payment_insert_membership" ON payment
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "payment_update_membership" ON payment
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "payment_delete_membership" ON payment
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- =============================================================================
-- EMAIL SYSTEM TABLES
-- =============================================================================

-- Enable RLS on email tables (but create policies first)
-- ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_connector ENABLE ROW LEVEL SECURITY;

-- Email Templates Policies
CREATE POLICY "email_templates_select_membership" ON email_templates
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "email_templates_insert_membership" ON email_templates
  FOR INSERT WITH CHECK (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "email_templates_update_membership" ON email_templates
  FOR UPDATE USING (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "email_templates_delete_membership" ON email_templates
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- Email Send Log Policies (read-only for most users)
CREATE POLICY "email_send_log_select_membership" ON email_send_log
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "email_send_log_insert_membership" ON email_send_log
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

-- Email Connector Policies (admin only)
CREATE POLICY "email_connector_select_membership" ON email_connector
  FOR SELECT USING (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "email_connector_insert_membership" ON email_connector
  FOR INSERT WITH CHECK (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "email_connector_update_membership" ON email_connector
  FOR UPDATE USING (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "email_connector_delete_membership" ON email_connector
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- =============================================================================
-- ADMIN SYSTEM TABLES
-- =============================================================================

-- Enable RLS on admin tables (but create policies first)
-- ALTER TABLE support_ticket ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE backup_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_user_preference ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Support Ticket Policies
CREATE POLICY "support_ticket_select_membership" ON support_ticket
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "support_ticket_insert_membership" ON support_ticket
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "support_ticket_update_membership" ON support_ticket
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

-- Backup Log Policies (read-only for admins)
CREATE POLICY "backup_log_select_membership" ON backup_log
  FOR SELECT USING (
    public.is_tenant_admin(tenant_id) OR tenant_id IS NULL -- Allow system backups
  );

-- API Usage Log Policies (read-only for admins)
CREATE POLICY "api_usage_log_select_membership" ON api_usage_log
  FOR SELECT USING (
    public.is_tenant_admin(tenant_id) OR tenant_id IS NULL -- Allow system logs
  );

CREATE POLICY "api_usage_log_insert_membership" ON api_usage_log
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id) OR tenant_id IS NULL -- Allow system logs
  );

-- Admin User Preference Policies
CREATE POLICY "admin_user_preference_select_membership" ON admin_user_preference
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "admin_user_preference_insert_membership" ON admin_user_preference
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "admin_user_preference_update_membership" ON admin_user_preference
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "admin_user_preference_delete_membership" ON admin_user_preference
  FOR DELETE USING (
    public.user_has_tenant_access(tenant_id)
  );

-- Subscription Usage Policies (admin only)
CREATE POLICY "subscription_usage_select_membership" ON subscription_usage
  FOR SELECT USING (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "subscription_usage_insert_membership" ON subscription_usage
  FOR INSERT WITH CHECK (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "subscription_usage_update_membership" ON subscription_usage
  FOR UPDATE USING (
    public.is_tenant_admin(tenant_id)
  );

-- =============================================================================
-- ML AND ANALYTICS TABLES
-- =============================================================================

-- Enable RLS on ML tables (but create policies first)
-- ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE price_book ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE price_alert ENABLE ROW LEVEL SECURITY;

-- ML Training Data Policies (system can create, admins can view)
CREATE POLICY "ml_training_data_select_membership" ON ml_training_data
  FOR SELECT USING (
    public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "ml_training_data_insert_membership" ON ml_training_data
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

-- Price Book Policies
CREATE POLICY "price_book_select_membership" ON price_book
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "price_book_insert_membership" ON price_book
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "price_book_update_membership" ON price_book
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "price_book_delete_membership" ON price_book
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- Price Alert Policies
CREATE POLICY "price_alert_select_membership" ON price_alert
  FOR SELECT USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "price_alert_insert_membership" ON price_alert
  FOR INSERT WITH CHECK (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "price_alert_update_membership" ON price_alert
  FOR UPDATE USING (
    public.user_has_tenant_access(tenant_id)
  );

CREATE POLICY "price_alert_delete_membership" ON price_alert
  FOR DELETE USING (
    public.is_tenant_admin(tenant_id)
  );

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions for all new tables
GRANT ALL ON mileage_log TO authenticated;
GRANT ALL ON mileage_template TO authenticated;
GRANT ALL ON irs_mileage_rate TO authenticated;
GRANT ALL ON client TO authenticated;
GRANT ALL ON invoice_template TO authenticated;
GRANT ALL ON invoice TO authenticated;
GRANT ALL ON recurring_invoice TO authenticated;
GRANT ALL ON payment TO authenticated;
GRANT ALL ON email_templates TO authenticated;
GRANT ALL ON email_send_log TO authenticated;
GRANT ALL ON email_connector TO authenticated;
GRANT ALL ON support_ticket TO authenticated;
GRANT ALL ON backup_log TO authenticated;
GRANT ALL ON api_usage_log TO authenticated;
GRANT ALL ON admin_user_preference TO authenticated;
GRANT ALL ON subscription_usage TO authenticated;
GRANT ALL ON ml_training_data TO authenticated;
GRANT ALL ON price_book TO authenticated;
GRANT ALL ON price_alert TO authenticated;

-- Comments for documentation
COMMENT ON POLICY "mileage_log_select_membership" ON mileage_log IS 'Users can view mileage logs for their tenants';
COMMENT ON POLICY "client_select_membership" ON client IS 'Users can view clients for their tenants';
COMMENT ON POLICY "invoice_select_membership" ON invoice IS 'Users can view invoices for their tenants';
COMMENT ON POLICY "payment_select_membership" ON payment IS 'Users can view payments for their tenants';
COMMENT ON POLICY "email_templates_select_membership" ON email_templates IS 'Users can view email templates for their tenants';
COMMENT ON POLICY "support_ticket_select_membership" ON support_ticket IS 'Users can view support tickets for their tenants';
COMMENT ON POLICY "price_book_select_membership" ON price_book IS 'Users can view price book entries for their tenants';