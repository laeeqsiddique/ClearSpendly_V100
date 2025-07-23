-- ===================================================================
-- FIX: Payment Status Not Updating Correctly
-- ===================================================================

-- First, let's check if the function exists and recreate it with better logic
DROP FUNCTION IF EXISTS update_invoice_payment_status() CASCADE;

CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(10,2);
    v_invoice_total DECIMAL(10,2);
    v_new_payment_status VARCHAR(20);
    v_new_invoice_status VARCHAR(20);
    v_invoice_id UUID;
BEGIN
    -- Get the invoice ID from the trigger context
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Skip if no invoice_id
    IF v_invoice_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate total paid for the invoice (use fresh calculation)
    SELECT COALESCE(SUM(pa.allocated_amount), 0)
    INTO v_total_paid
    FROM public.payment_allocation pa
    WHERE pa.invoice_id = v_invoice_id;
    
    -- Get invoice total amount
    SELECT total_amount
    INTO v_invoice_total
    FROM public.invoice
    WHERE id = v_invoice_id;
    
    -- Skip if invoice not found
    IF v_invoice_total IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Determine payment status with proper logic
    IF v_total_paid = 0 THEN
        v_new_payment_status := 'unpaid';
        -- Keep original invoice status if unpaid
        v_new_invoice_status := (SELECT status FROM public.invoice WHERE id = v_invoice_id);
    ELSIF v_total_paid >= v_invoice_total THEN
        v_new_payment_status := 'paid';
        v_new_invoice_status := 'paid';  -- Mark invoice as paid
    ELSE
        v_new_payment_status := 'partial';
        -- Keep original status for partial payments (don't change sent/viewed to draft)
        v_new_invoice_status := (SELECT status FROM public.invoice WHERE id = v_invoice_id);
    END IF;
    
    -- Update invoice with calculated values
    UPDATE public.invoice
    SET 
        amount_paid = v_total_paid,
        balance_due = v_invoice_total - v_total_paid,
        payment_status = v_new_payment_status,
        status = v_new_invoice_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_invoice_id;
    
    -- Log for debugging (optional - remove in production)
    RAISE NOTICE 'Updated invoice %: total_paid=%, payment_status=%, invoice_status=%', 
                 v_invoice_id, v_total_paid, v_new_payment_status, v_new_invoice_status;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with proper timing
DROP TRIGGER IF EXISTS update_invoice_on_payment_allocation ON public.payment_allocation;
CREATE TRIGGER update_invoice_on_payment_allocation
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocation
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Add a function to manually recalculate all invoice payment statuses
CREATE OR REPLACE FUNCTION recalculate_all_invoice_payments()
RETURNS INTEGER AS $$
DECLARE
    invoice_record RECORD;
    total_updated INTEGER := 0;
BEGIN
    -- Loop through all invoices and recalculate their payment status
    FOR invoice_record IN 
        SELECT i.id, i.total_amount,
               COALESCE(SUM(pa.allocated_amount), 0) as total_paid
        FROM public.invoice i
        LEFT JOIN public.payment_allocation pa ON i.id = pa.invoice_id
        GROUP BY i.id, i.total_amount
    LOOP
        -- Update each invoice with correct payment status
        UPDATE public.invoice
        SET 
            amount_paid = invoice_record.total_paid,
            balance_due = invoice_record.total_amount - invoice_record.total_paid,
            payment_status = CASE
                WHEN invoice_record.total_paid = 0 THEN 'unpaid'
                WHEN invoice_record.total_paid >= invoice_record.total_amount THEN 'paid'
                ELSE 'partial'
            END,
            status = CASE
                WHEN invoice_record.total_paid >= invoice_record.total_amount THEN 'paid'
                ELSE status  -- Keep existing status for unpaid/partial
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = invoice_record.id;
        
        total_updated := total_updated + 1;
    END LOOP;
    
    RETURN total_updated;
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation to fix existing data
SELECT recalculate_all_invoice_payments() as invoices_updated;

-- Add constraint to prevent over-allocation
CREATE OR REPLACE FUNCTION check_payment_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_total DECIMAL(10,2);
    v_existing_paid DECIMAL(10,2);
    v_remaining_balance DECIMAL(10,2);
BEGIN
    -- Get invoice total
    SELECT total_amount INTO v_invoice_total
    FROM public.invoice
    WHERE id = NEW.invoice_id;
    
    -- Get existing payments for this invoice (excluding current allocation if updating)
    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_existing_paid
    FROM public.payment_allocation
    WHERE invoice_id = NEW.invoice_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    -- Calculate remaining balance
    v_remaining_balance := v_invoice_total - v_existing_paid;
    
    -- Check if new allocation exceeds remaining balance
    IF NEW.allocated_amount > v_remaining_balance THEN
        RAISE EXCEPTION 'Payment allocation ($%) exceeds remaining invoice balance ($%)', 
                       NEW.allocated_amount, v_remaining_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to prevent over-allocation
DROP TRIGGER IF EXISTS check_payment_allocation_trigger ON public.payment_allocation;
CREATE TRIGGER check_payment_allocation_trigger
    BEFORE INSERT OR UPDATE ON public.payment_allocation
    FOR EACH ROW
    EXECUTE FUNCTION check_payment_allocation();