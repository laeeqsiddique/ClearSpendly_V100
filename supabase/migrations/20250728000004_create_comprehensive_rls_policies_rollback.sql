-- ROLLBACK: Comprehensive RLS Policies for ALL Tenant-Isolated Tables
-- This script removes all RLS policies created in 20250728000004

-- =============================================================================
-- DROP MILEAGE SYSTEM POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "mileage_log_select_membership" ON mileage_log;
DROP POLICY IF EXISTS "mileage_log_insert_membership" ON mileage_log;
DROP POLICY IF EXISTS "mileage_log_update_membership" ON mileage_log;
DROP POLICY IF EXISTS "mileage_log_delete_membership" ON mileage_log;

DROP POLICY IF EXISTS "mileage_template_select_membership" ON mileage_template;
DROP POLICY IF EXISTS "mileage_template_insert_membership" ON mileage_template;
DROP POLICY IF EXISTS "mileage_template_update_membership" ON mileage_template;
DROP POLICY IF EXISTS "mileage_template_delete_membership" ON mileage_template;

DROP POLICY IF EXISTS "irs_mileage_rate_select_membership" ON irs_mileage_rate;
DROP POLICY IF EXISTS "irs_mileage_rate_insert_membership" ON irs_mileage_rate;
DROP POLICY IF EXISTS "irs_mileage_rate_update_membership" ON irs_mileage_rate;
DROP POLICY IF EXISTS "irs_mileage_rate_delete_membership" ON irs_mileage_rate;

-- =============================================================================
-- DROP INVOICE SYSTEM POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "client_select_membership" ON client;
DROP POLICY IF EXISTS "client_insert_membership" ON client;
DROP POLICY IF EXISTS "client_update_membership" ON client;
DROP POLICY IF EXISTS "client_delete_membership" ON client;

DROP POLICY IF EXISTS "invoice_template_select_membership" ON invoice_template;
DROP POLICY IF EXISTS "invoice_template_insert_membership" ON invoice_template;
DROP POLICY IF EXISTS "invoice_template_update_membership" ON invoice_template;
DROP POLICY IF EXISTS "invoice_template_delete_membership" ON invoice_template;

DROP POLICY IF EXISTS "invoice_select_membership" ON invoice;
DROP POLICY IF EXISTS "invoice_insert_membership" ON invoice;
DROP POLICY IF EXISTS "invoice_update_membership" ON invoice;
DROP POLICY IF EXISTS "invoice_delete_membership" ON invoice;

DROP POLICY IF EXISTS "recurring_invoice_select_membership" ON recurring_invoice;
DROP POLICY IF EXISTS "recurring_invoice_insert_membership" ON recurring_invoice;
DROP POLICY IF EXISTS "recurring_invoice_update_membership" ON recurring_invoice;
DROP POLICY IF EXISTS "recurring_invoice_delete_membership" ON recurring_invoice;

-- =============================================================================
-- DROP PAYMENT SYSTEM POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "payment_select_membership" ON payment;
DROP POLICY IF EXISTS "payment_insert_membership" ON payment;
DROP POLICY IF EXISTS "payment_update_membership" ON payment;
DROP POLICY IF EXISTS "payment_delete_membership" ON payment;

-- =============================================================================
-- DROP EMAIL SYSTEM POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "email_templates_select_membership" ON email_templates;
DROP POLICY IF EXISTS "email_templates_insert_membership" ON email_templates;
DROP POLICY IF EXISTS "email_templates_update_membership" ON email_templates;
DROP POLICY IF EXISTS "email_templates_delete_membership" ON email_templates;

DROP POLICY IF EXISTS "email_send_log_select_membership" ON email_send_log;
DROP POLICY IF EXISTS "email_send_log_insert_membership" ON email_send_log;

DROP POLICY IF EXISTS "email_connector_select_membership" ON email_connector;
DROP POLICY IF EXISTS "email_connector_insert_membership" ON email_connector;
DROP POLICY IF EXISTS "email_connector_update_membership" ON email_connector;
DROP POLICY IF EXISTS "email_connector_delete_membership" ON email_connector;

-- =============================================================================
-- DROP ADMIN SYSTEM POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "support_ticket_select_membership" ON support_ticket;
DROP POLICY IF EXISTS "support_ticket_insert_membership" ON support_ticket;
DROP POLICY IF EXISTS "support_ticket_update_membership" ON support_ticket;

DROP POLICY IF EXISTS "backup_log_select_membership" ON backup_log;

DROP POLICY IF EXISTS "api_usage_log_select_membership" ON api_usage_log;
DROP POLICY IF EXISTS "api_usage_log_insert_membership" ON api_usage_log;

DROP POLICY IF EXISTS "admin_user_preference_select_membership" ON admin_user_preference;
DROP POLICY IF EXISTS "admin_user_preference_insert_membership" ON admin_user_preference;
DROP POLICY IF EXISTS "admin_user_preference_update_membership" ON admin_user_preference;
DROP POLICY IF EXISTS "admin_user_preference_delete_membership" ON admin_user_preference;

DROP POLICY IF EXISTS "subscription_usage_select_membership" ON subscription_usage;
DROP POLICY IF EXISTS "subscription_usage_insert_membership" ON subscription_usage;
DROP POLICY IF EXISTS "subscription_usage_update_membership" ON subscription_usage;

-- =============================================================================
-- DROP ML AND ANALYTICS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "ml_training_data_select_membership" ON ml_training_data;
DROP POLICY IF EXISTS "ml_training_data_insert_membership" ON ml_training_data;

DROP POLICY IF EXISTS "price_book_select_membership" ON price_book;
DROP POLICY IF EXISTS "price_book_insert_membership" ON price_book;
DROP POLICY IF EXISTS "price_book_update_membership" ON price_book;
DROP POLICY IF EXISTS "price_book_delete_membership" ON price_book;

DROP POLICY IF EXISTS "price_alert_select_membership" ON price_alert;
DROP POLICY IF EXISTS "price_alert_insert_membership" ON price_alert;
DROP POLICY IF EXISTS "price_alert_update_membership" ON price_alert;
DROP POLICY IF EXISTS "price_alert_delete_membership" ON price_alert;

-- Note: We don't revoke permissions as they may have been granted by other migrations
-- and removing them could break existing functionality