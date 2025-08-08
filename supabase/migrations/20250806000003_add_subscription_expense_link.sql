-- Add field to link receipt records to subscriptions
-- This allows us to track which expenses were auto-generated from subscriptions

ALTER TABLE public.receipt 
ADD COLUMN IF NOT EXISTS source_subscription_id UUID REFERENCES public.expense_subscription(id) ON DELETE SET NULL;

-- Create index for performance when querying subscription-generated expenses
CREATE INDEX IF NOT EXISTS idx_receipt_source_subscription ON public.receipt(source_subscription_id) WHERE source_subscription_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.receipt.source_subscription_id IS 'Links to expense_subscription if this receipt was auto-generated from a subscription';