-- Add support for manual expense entries without receipts

-- Add receipt_type to distinguish between scanned and manual entries
ALTER TABLE receipt 
ADD COLUMN IF NOT EXISTS receipt_type VARCHAR(20) DEFAULT 'scanned' 
  CHECK (receipt_type IN ('scanned', 'manual', 'imported'));

-- Add reason for manual entry (audit trail)
ALTER TABLE receipt 
ADD COLUMN IF NOT EXISTS manual_entry_reason TEXT;

-- Add business purpose for IRS compliance
ALTER TABLE receipt 
ADD COLUMN IF NOT EXISTS business_purpose TEXT;

-- Add URL for alternative proof (bank statements, emails, etc.)
ALTER TABLE receipt 
ADD COLUMN IF NOT EXISTS alternative_proof_url TEXT;

-- Make original_file_url nullable for manual entries
ALTER TABLE receipt 
ALTER COLUMN original_file_url DROP NOT NULL;

-- Add index for filtering by receipt type
CREATE INDEX IF NOT EXISTS idx_receipt_type ON receipt(tenant_id, receipt_type);

-- Add comment for clarity
COMMENT ON COLUMN receipt.receipt_type IS 'Type of receipt entry: scanned (OCR processed), manual (no receipt), imported (from bank)';
COMMENT ON COLUMN receipt.manual_entry_reason IS 'Reason why receipt is not available (for manual entries)';
COMMENT ON COLUMN receipt.business_purpose IS 'Business purpose of expense for IRS compliance';
COMMENT ON COLUMN receipt.alternative_proof_url IS 'URL to alternative documentation (bank statement, email, etc.)';

-- Update RLS policies to handle manual entries
-- (Existing policies already cover the receipt table, no changes needed)