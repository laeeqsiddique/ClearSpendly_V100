-- ===================================================================
-- PAYMENT SYSTEM MIGRATION - MULTI-TENANT READY (FIXED)
-- Execute this in Supabase SQL Editor
-- ===================================================================

-- Create payment table for tracking all payments
CREATE TABLE IF NOT EXISTS public.payment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('bank_transfer', 'check', 'cash', 'credit_card', 'paypal', 'other')),
    reference_number VARCHAR(100), -- Check number, transaction ID, etc.
    
    -- Client relationship (optional - for non-invoice payments)
    client_id UUID REFERENCES public.client(id),
    
    -- Payment description
    description TEXT,
    notes TEXT,
    
    -- Category for non-invoice payments
    category VARCHAR(50) DEFAULT 'invoice_payment' CHECK (category IN ('invoice_payment', 'retainer', 'deposit', 'other')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment allocation table (links payments to invoices)
CREATE TABLE IF NOT EXISTS public.payment_allocation (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.payment(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(payment_id, invoice_id)
);

-- Add payment status to invoice table (if not exists)
ALTER TABLE public.invoice 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_tenant_id ON public.payment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_client_id ON public.payment(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_date ON public.payment(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_user_id ON public.payment(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocation_invoice ON public.payment_allocation(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocation_payment ON public.payment_allocation(payment_id);

-- Add foreign key constraint for client_id to ensure multi-tenant integrity
-- This ensures payment client belongs to same tenant as payment
CREATE OR REPLACE FUNCTION check_payment_client_tenant() 
RETURNS TRIGGER AS $$
BEGIN
    -- If client_id is provided, ensure it belongs to the same tenant
    IF NEW.client_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.client 
            WHERE id = NEW.client_id AND tenant_id = NEW.tenant_id
        ) THEN
            RAISE EXCEPTION 'Client must belong to the same tenant as the payment';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_payment_client_tenant_trigger
    BEFORE INSERT OR UPDATE ON public.payment
    FOR EACH ROW
    EXECUTE FUNCTION check_payment_client_tenant();

-- Create a function to update invoice payment status and amounts
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(10,2);
    v_invoice_total DECIMAL(10,2);
    v_new_status VARCHAR(20);
    v_invoice_id UUID;
BEGIN
    -- Get the invoice ID from the trigger context
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate total paid for the invoice
    SELECT COALESCE(SUM(pa.allocated_amount), 0)
    INTO v_total_paid
    FROM public.payment_allocation pa
    WHERE pa.invoice_id = v_invoice_id;
    
    -- Get invoice total
    SELECT total_amount
    INTO v_invoice_total
    FROM public.invoice
    WHERE id = v_invoice_id;
    
    -- Determine payment status
    IF v_total_paid = 0 THEN
        v_new_status := 'unpaid';
    ELSIF v_total_paid >= v_invoice_total THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'partial';
    END IF;
    
    -- Update invoice
    UPDATE public.invoice
    SET 
        amount_paid = v_total_paid,
        balance_due = total_amount - v_total_paid,
        payment_status = v_new_status,
        status = CASE 
            WHEN v_new_status = 'paid' THEN 'paid'
            WHEN status = 'draft' THEN 'draft'
            ELSE status
        END
    WHERE id = v_invoice_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update invoice payment status
DROP TRIGGER IF EXISTS update_invoice_on_payment_allocation ON public.payment_allocation;
CREATE TRIGGER update_invoice_on_payment_allocation
AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocation
FOR EACH ROW
EXECUTE FUNCTION update_invoice_payment_status();

-- Create RLS policies for payment table
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view payments for their tenant" ON public.payment;
DROP POLICY IF EXISTS "Users can create payments for their tenant" ON public.payment;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payment;
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payment;

-- Create new RLS policies using the standard multi-tenant pattern
CREATE POLICY "Users can view payments for their tenant" ON public.payment
    FOR SELECT USING (
        tenant_id IN (
            SELECT membership.tenant_id FROM public.membership 
            WHERE membership.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create payments for their tenant" ON public.payment
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT membership.tenant_id FROM public.membership 
            WHERE membership.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update payments for their tenant" ON public.payment
    FOR UPDATE USING (
        tenant_id IN (
            SELECT membership.tenant_id FROM public.membership 
            WHERE membership.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete payments for their tenant" ON public.payment
    FOR DELETE USING (
        tenant_id IN (
            SELECT membership.tenant_id FROM public.membership 
            WHERE membership.user_id = auth.uid()
        )
    );

-- Create RLS policies for payment_allocation table
ALTER TABLE public.payment_allocation ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view payment allocations" ON public.payment_allocation;
DROP POLICY IF EXISTS "Users can manage payment allocations" ON public.payment_allocation;

-- Create new RLS policies
CREATE POLICY "Users can view payment allocations for their tenant" ON public.payment_allocation
    FOR SELECT USING (
        payment_id IN (
            SELECT p.id FROM public.payment p
            JOIN public.membership m ON p.tenant_id = m.tenant_id
            WHERE m.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage payment allocations for their tenant" ON public.payment_allocation
    FOR ALL USING (
        payment_id IN (
            SELECT p.id FROM public.payment p
            JOIN public.membership m ON p.tenant_id = m.tenant_id
            WHERE m.user_id = auth.uid()
        )
    );

-- Add helpful view for payment summary with SIMPLE column structure
DROP VIEW IF EXISTS payment_summary;
CREATE VIEW payment_summary AS
SELECT 
    p.id,
    p.tenant_id,
    p.payment_date,
    p.amount,
    p.payment_method,
    p.reference_number,
    p.client_id,
    c.name as client_name,
    c.email as client_email,
    c.company_name as client_company,
    p.description,
    p.category,
    p.created_at,
    COALESCE(
        STRING_AGG(
            CONCAT(i.invoice_number, ' ($', pa.allocated_amount, ')'),
            ', ' ORDER BY i.invoice_number
        ),
        'Unallocated'
    ) as allocated_to
FROM public.payment p
LEFT JOIN public.client c ON p.client_id = c.id
LEFT JOIN public.payment_allocation pa ON p.id = pa.payment_id
LEFT JOIN public.invoice i ON pa.invoice_id = i.id
GROUP BY p.id, p.tenant_id, p.payment_date, p.amount, p.payment_method, 
         p.reference_number, p.client_id, c.name, c.email, c.company_name, p.description, p.category, p.created_at;

-- Update existing invoices payment status (for existing data)
UPDATE public.invoice 
SET payment_status = CASE 
    WHEN COALESCE(amount_paid, 0) = 0 THEN 'unpaid'
    WHEN COALESCE(amount_paid, 0) >= total_amount THEN 'paid'
    ELSE 'partial'
END
WHERE payment_status IS NULL;