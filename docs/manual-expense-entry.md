# Manual Expense Entry Feature Documentation

## Overview
Flowvya's Manual Expense Entry feature allows users to record business expenses when receipts are not available or practical to obtain. This feature ensures complete expense tracking for tax purposes while maintaining clear differentiation between receipt-based and manually entered expenses.

## Business Justification

### Problem
Many legitimate business expenses don't come with receipts:
- Parking meters and street parking
- Tips and gratuities
- Small cash purchases
- Tolls (without electronic receipts)
- Vendor purchases where receipts are lost/damaged
- Digital subscriptions without PDF receipts

### Solution
A streamlined manual entry system that:
- Captures all IRS-required information
- Maintains audit trail integrity
- Clearly differentiates from receipt-based entries
- Provides templates for common scenarios

## Feature Specifications

### Entry Types
1. **Scanned Receipt** (default) - OCR-processed receipts
2. **Manual Entry** - No receipt available
3. **Imported** (future) - Bank/credit card imports

### Required Fields
- **Date**: When expense occurred
- **Amount**: Total expense amount
- **Vendor/Description**: Who was paid or what was purchased
- **Category**: IRS Schedule C category
- **Payment Method**: How it was paid
- **Business Purpose**: Why this was a business expense
- **No Receipt Reason**: Why receipt isn't available

### Optional Fields
- **Tags**: Existing tag system integration
- **Notes**: Additional context
- **Recurring**: Mark as recurring expense
- **Alternative Proof**: Upload bank statement, email, etc.

### Visual Indicators
- **Icon**: 📝 for manual vs 🧾 for scanned
- **Badge**: "Manual Entry" label
- **Background**: Subtle blue tint (#EBF5FF)
- **Tooltip**: Shows entry reason on hover

## User Interface

### Dashboard Changes
```
Current: [Upload Receipt]
New:     [Upload Receipt] [+ Add Expense]
```

### Manual Entry Form
- Clean, single-page form
- Smart defaults (today's date, last used category)
- Common expense templates
- Real-time validation
- Save as template option

### Templates
Pre-configured for common scenarios:
1. **Parking** - Street/meter parking
2. **Tips** - Service gratuities
3. **Tolls** - Highway/bridge tolls
4. **Office Supplies** - Small purchases
5. **Business Meals** - Under $75 (IRS threshold)

## Technical Implementation

### Database Schema
```sql
-- Add to existing receipt table
ALTER TABLE receipt 
ADD COLUMN receipt_type VARCHAR(20) DEFAULT 'scanned' 
  CHECK (receipt_type IN ('scanned', 'manual', 'imported'));

ALTER TABLE receipt 
ADD COLUMN manual_entry_reason TEXT;

ALTER TABLE receipt 
ADD COLUMN alternative_proof_url TEXT;

-- Make original_file_url nullable for manual entries
ALTER TABLE receipt 
ALTER COLUMN original_file_url DROP NOT NULL;
```

### API Endpoints
- `POST /api/expenses/manual` - Create manual entry
- `GET /api/expenses/templates` - Get expense templates
- `POST /api/expenses/templates` - Save custom template

### Data Model
```typescript
interface ManualExpense {
  receipt_type: 'manual';
  date: string;
  amount: number;
  vendor: string;
  category: string;
  payment_method: string;
  business_purpose: string;
  manual_entry_reason: string;
  tags?: string[];
  notes?: string;
  recurring?: boolean;
  alternative_proof_url?: string;
}
```

## Compliance & Validation

### IRS Requirements
- Business purpose must be provided
- Amounts over $75 require additional documentation
- Manual entries are flagged in exports
- Disclaimer about maintaining supporting documents

### Validation Rules
1. **Amount**: Must be positive, warn if > $500
2. **Date**: Cannot be future, warn if > 90 days old
3. **Vendor**: Required, suggest from existing vendors
4. **Category**: Must be valid Schedule C category
5. **Reason**: Required for audit trail

### Limits
- **Free Plan**: 10 manual entries/month
- **Pro Plan**: 50 manual entries/month
- **Premium Plan**: Unlimited

## Reporting & Exports

### Dashboard Display
- Mixed with receipts in main table
- Filterable by entry type
- Special icon and styling
- Sortable by manual vs scanned

### Export Handling
- CSV includes "entry_type" column
- PDF reports show manual entries separately
- Tax reports include disclaimer about manual entries
- Audit report shows who entered and when

## Security & Audit

### Permissions
- Only receipt creators can add manual entries
- Admins can view/edit all manual entries
- Viewers can see but not create

### Audit Trail
- Track created_by user
- Log all edits with timestamp
- Reason for manual entry stored
- Cannot convert between types

## Future Enhancements

### Phase 2
- Bank import reconciliation
- Recurring expense automation
- Mobile app quick entry
- Voice-to-expense entry

### Phase 3
- AI categorization suggestions
- Duplicate detection
- Expense rules engine
- Integration with mileage tracking

## Success Metrics
- % of users using manual entry
- Average manual entries per user
- Time to complete manual entry
- Manual entry accuracy (via audits)

## Implementation Timeline
1. **Week 1**: Database schema and API
2. **Week 2**: UI components and form
3. **Week 3**: Integration and testing
4. **Week 4**: Documentation and rollout

---

*Last Updated: [Current Date]*
*Version: 1.0*