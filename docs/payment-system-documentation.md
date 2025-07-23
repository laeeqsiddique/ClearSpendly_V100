# ClearSpendly Payment System Documentation

## Overview

The ClearSpendly payment system is a comprehensive solution for tracking payments and managing invoice-to-payment allocations. It supports partial payments, multiple payment methods, and provides complete audit trails for all financial transactions.

## Architecture

### Core Components

1. **Payment Recording** - Capture payment details with metadata
2. **Payment Allocation** - Link payments to specific invoices
3. **Status Management** - Automatic invoice status updates
4. **Reporting & Analytics** - Payment dashboard with insights

### Database Design

The payment system consists of three main tables:

- `payment` - Stores payment records
- `payment_allocation` - Links payments to invoices
- `invoice` - Updated automatically with payment status

## Features

### 1. Payment Management

#### Recording Payments
- Multiple payment methods supported (bank transfer, check, cash, credit card, PayPal, other)
- Payment date and amount tracking
- Reference numbers for audit trails
- Client association for payment attribution
- Description and notes for additional context

#### Payment Methods
- **Bank Transfer** - Wire transfers and ACH payments
- **Check** - Physical and electronic checks
- **Cash** - Cash payments with receipt tracking
- **Credit Card** - Card payments through various processors
- **PayPal** - PayPal and similar online payments
- **Other** - Custom payment methods

### 2. Payment Allocation System

#### Smart Allocation
- Automatic allocation to specific invoices
- Partial payment support with remaining balance calculation
- Multiple invoices can be paid by a single payment
- Single invoice can receive multiple payments

#### Allocation Rules
- Payments can be allocated to multiple invoices
- Total allocated amount cannot exceed payment amount
- Cannot over-allocate payments to invoices
- Database constraints prevent allocation errors

### 3. Invoice Integration

#### Automatic Status Updates
- **Unpaid** - No payments allocated
- **Partial** - Some payment received, balance remaining
- **Paid** - Full payment received

#### Status Triggers
Database triggers automatically update invoice status when:
- New payment allocated
- Payment amount modified
- Payment allocation removed
- Payment deleted

### 4. Payment Dashboard

#### Real-time Statistics
- Total payments received
- Pending payment amounts
- Average payment values
- Client payment patterns

#### Payment Analytics
- Payment method breakdown
- Monthly/yearly trends
- Client-specific metrics
- Outstanding balance tracking

## Implementation Details

### Database Schema

#### Payment Table
```sql
CREATE TABLE payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL,
  reference_number VARCHAR(255),
  description TEXT,
  notes TEXT,
  category VARCHAR(50) DEFAULT 'revenue',
  client_id UUID REFERENCES client(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Payment Allocation Table
```sql
CREATE TABLE payment_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id, invoice_id)
);
```

### Business Logic

#### Payment Allocation Algorithm

1. **Validation Phase**
   - Verify payment exists and user has access
   - Check invoice exists and belongs to same tenant
   - Validate allocation amount is positive
   - Ensure total allocations don't exceed payment amount

2. **Over-allocation Check**
   - Calculate current invoice balance
   - Sum existing allocations for the invoice
   - Verify new allocation doesn't exceed remaining balance
   - Reject allocation if over-allocation detected

3. **Status Update Phase**
   - Calculate new total paid amount for invoice
   - Determine appropriate payment status (unpaid/partial/paid)
   - Update invoice status if fully paid
   - Trigger any necessary notifications

#### Database Triggers

##### Payment Status Update Trigger
```sql
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(10,2);
    v_invoice_total DECIMAL(10,2);
    v_new_payment_status VARCHAR(20);
    v_new_invoice_status VARCHAR(20);
    v_invoice_id UUID;
BEGIN
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate total paid for the invoice
    SELECT COALESCE(SUM(pa.allocated_amount), 0)
    INTO v_total_paid
    FROM payment_allocation pa
    WHERE pa.invoice_id = v_invoice_id;
    
    -- Get invoice total amount
    SELECT total_amount
    INTO v_invoice_total
    FROM invoice
    WHERE id = v_invoice_id;
    
    -- Determine payment status
    IF v_total_paid = 0 THEN
        v_new_payment_status := 'unpaid';
    ELSIF v_total_paid >= v_invoice_total THEN
        v_new_payment_status := 'paid';
        v_new_invoice_status := 'paid';
    ELSE
        v_new_payment_status := 'partial';
    END IF;
    
    -- Update invoice with calculated values
    UPDATE invoice
    SET 
        amount_paid = v_total_paid,
        payment_status = v_new_payment_status,
        status = COALESCE(v_new_invoice_status, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_invoice_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

##### Over-allocation Prevention Trigger
```sql
CREATE OR REPLACE FUNCTION check_payment_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_total DECIMAL(10,2);
    v_existing_paid DECIMAL(10,2);
    v_remaining_balance DECIMAL(10,2);
BEGIN
    -- Get invoice total and existing payments
    SELECT total_amount INTO v_invoice_total
    FROM invoice WHERE id = NEW.invoice_id;
    
    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_existing_paid
    FROM payment_allocation
    WHERE invoice_id = NEW.invoice_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    v_remaining_balance := v_invoice_total - v_existing_paid;
    
    -- Prevent over-allocation
    IF NEW.allocated_amount > v_remaining_balance THEN
        RAISE EXCEPTION 'Payment allocation exceeds remaining balance';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## User Interface Components

### Payment Recording Form
- **Payment Details**: Date, amount, method, reference number
- **Client Selection**: Dropdown with client search
- **Invoice Allocation**: Smart allocation interface
- **Description & Notes**: Additional context fields

### Payment Dashboard
- **Summary Cards**: Key metrics at a glance
- **Payment List**: Searchable and filterable payment table
- **Action Menu**: Edit, view, and manage payments
- **Analytics Charts**: Visual payment trends

### Payment History Timeline
- **Document Flow**: Visual timeline of invoice-to-payment journey
- **Payment Progress**: Progress bars showing payment completion
- **Status Updates**: Historical status changes
- **Allocation Details**: Breakdown of payment allocations

## API Endpoints

### Payment Management

#### Record Payment
```typescript
POST /api/payments/record
{
  payment_date: string,
  amount: number,
  payment_method: string,
  reference_number?: string,
  client_id?: string,
  description?: string,
  notes?: string,
  invoice_allocations: Array<{
    invoice_id: string,
    allocated_amount: number
  }>
}
```

#### Update Payment
```typescript
PUT /api/payments/:id
{
  payment_date: string,
  amount: number,
  payment_method: string,
  reference_number?: string,
  client_id?: string,
  description?: string,
  notes?: string
}
```

#### Get Payment Details
```typescript
GET /api/payments/:id
Response: {
  id: string,
  payment_date: string,
  amount: number,
  payment_method: string,
  reference_number?: string,
  client?: ClientInfo,
  description?: string,
  notes?: string,
  allocations: Array<AllocationInfo>
}
```

### Payment Analytics

#### Dashboard Statistics
```typescript
GET /api/payments/stats
Response: {
  total_received: number,
  total_pending: number,
  total_clients_paid: number,
  average_payment: number,
  payment_method_breakdown: Record<string, number>,
  monthly_trends: Array<MonthlyData>
}
```

## Error Handling

### Common Errors

1. **Over-allocation Error**
   - Occurs when trying to allocate more than remaining balance
   - Prevented by database trigger
   - User-friendly error message displayed

2. **Insufficient Payment Amount**
   - When allocation exceeds total payment amount
   - Validation prevents submission
   - Clear error message with suggestions

3. **Invalid Payment Method**
   - When unsupported payment method selected
   - Frontend validation with dropdown constraints
   - Fallback to "other" category

### Error Recovery

- **Validation Errors**: Clear field-level error messages
- **Database Errors**: User-friendly error translations
- **Network Errors**: Retry mechanisms with exponential backoff
- **State Recovery**: Form data persistence across errors

## Security Considerations

### Data Protection
- All payment data encrypted at rest
- Sensitive fields (reference numbers) protected
- Audit trail for all payment modifications
- Row-level security enforces tenant isolation

### Access Control
- Payment creation requires member-level access
- Payment editing restricted to owners/admins
- Payment deletion requires elevated permissions
- Client-specific payment visibility

### Audit Trail
- All payment operations logged
- User attribution for all changes
- Timestamp tracking for modifications
- Immutable allocation history

## Testing Strategy

### Unit Tests
- Payment allocation logic
- Status calculation functions
- Validation rules
- Error handling

### Integration Tests
- Database trigger functionality
- API endpoint behavior
- Multi-tenant isolation
- Payment-invoice synchronization

### End-to-End Tests
- Complete payment workflows
- Error recovery scenarios
- Multi-user payment scenarios
- Performance under load

## Performance Considerations

### Database Optimization
- Strategic indexing on payment queries
- Efficient joins for allocation lookups
- Trigger optimization for bulk operations
- Query result caching for dashboard

### Frontend Performance
- Lazy loading for large payment lists
- Debounced search and filters
- Optimistic UI updates
- Progressive data loading

### Scalability
- Horizontal scaling support
- Database connection pooling
- Caching strategy for frequently accessed data
- Batch processing for bulk operations

## Monitoring & Observability

### Key Metrics
- Payment processing time
- Allocation error rates
- Database trigger execution time
- User interaction patterns

### Alerts
- Failed payment allocations
- Over-allocation attempts
- Database trigger failures
- Performance degradation

### Logging
- All payment operations logged
- Error tracking with context
- Performance monitoring
- User activity tracking

## Future Enhancements

### Planned Features
- Automatic payment matching based on reference numbers
- Bulk payment import from bank statements
- Payment reminders and notifications
- Integration with accounting software
- Mobile payment recording

### API Improvements
- Webhook support for payment events
- Batch payment processing endpoints
- Advanced filtering and sorting
- Export functionality for accounting

### Analytics Enhancements
- Predictive payment analytics
- Cash flow forecasting
- Client payment behavior analysis
- Revenue recognition tracking

## Troubleshooting

### Common Issues

1. **Payment Not Showing**
   - Verify tenant membership
   - Check payment date filters
   - Confirm client association

2. **Allocation Failures**
   - Check invoice status (not cancelled)
   - Verify remaining balance
   - Confirm payment amount

3. **Status Not Updating**
   - Verify database triggers enabled
   - Check for trigger execution errors
   - Confirm RLS policies allow updates

### Diagnostic Tools
- Payment allocation debugger
- Status calculation validator
- Trigger execution monitor
- Performance profiler

## Support & Maintenance

### Regular Maintenance
- Monthly database performance review
- Quarterly trigger optimization
- Annual security audit
- Payment data archival strategy

### Support Procedures
- Payment dispute resolution process
- Data correction workflows
- Backup and recovery procedures
- Emergency payment processing