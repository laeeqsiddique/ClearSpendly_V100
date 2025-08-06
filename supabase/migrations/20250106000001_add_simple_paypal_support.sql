-- Add simple PayPal support to tenant table
-- No complex integration, just store PayPal contact info for invoice emails

-- Add PayPal fields to tenant table
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS paypal_email VARCHAR(255);
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS paypal_me_link TEXT;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Add updated_at trigger for tenant table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_tenant_updated_at' 
    AND tgrelid = 'tenant'::regclass
  ) THEN
    CREATE TRIGGER set_tenant_updated_at
      BEFORE UPDATE ON tenant
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- Add comments for documentation
COMMENT ON COLUMN tenant.paypal_email IS 'PayPal email address for receiving payments';
COMMENT ON COLUMN tenant.paypal_me_link IS 'PayPal.me link for easy payments (e.g., paypal.me/businessname)';
COMMENT ON COLUMN tenant.payment_instructions IS 'Custom payment instructions to include in invoice emails';