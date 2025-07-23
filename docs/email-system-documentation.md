# Email Template Customization System Documentation

## Overview

The Email Template Customization System is a comprehensive email branding and template management solution that allows organizations using ClearSpendly to fully customize their email communications with professional, branded templates.

## Features

### 1. Professional Email Templates

The system provides three specialized email templates:

- **Invoice Templates**: For sending professional invoice notifications
- **Payment Reminder Templates**: For friendly payment reminders
- **Payment Received Templates**: For payment confirmation emails

Each template features:
- Modern, professional design with gradient headers
- Card-based layouts for better readability
- Mobile-responsive design
- Consistent branding across all communications

### 2. Visual Template Editor

Real-time template customization interface includes:
- **Live Preview**: Desktop and mobile views with real-time updates
- **Color Customization**: 
  - Primary color (gradient start)
  - Secondary color (gradient end)
  - Accent color (buttons and highlights)
  - Text color
  - Background color
- **Logo Upload**: Custom logo integration with size controls
- **Content Customization**:
  - Subject line templates with variable processing
  - Greeting messages
  - Footer message personalization

### 3. Variable System

Dynamic content insertion using merge tags:
- `{{invoice_number}}` - Invoice number
- `{{business_name}}` - Your business name
- `{{client_name}}` - Client name
- `{{client_email}}` - Client email
- `{{amount}}` - Invoice total amount
- `{{due_date}}` - Invoice due date
- `{{days_overdue}}` - Days overdue (for reminders)
- And many more...

### 4. Email Template Dashboard

Four-tab management interface:

#### Overview Tab
- Template performance metrics
- Recent email activity
- Quick template selection
- Template status indicators

#### Design Tab
- Visual template editor
- Live preview functionality
- Color picker controls
- Logo upload interface

#### Settings Tab
- Business branding configuration
- Company information management
- Contact details
- Logo and asset management

#### Analytics Tab
- Email send statistics
- Template performance metrics
- Delivery success rates
- Monthly/yearly volume reporting

## Technical Implementation

### Database Schema

The system uses three main tables:

1. **email_templates**: Stores template configurations
   - Template identification and metadata
   - Branding configuration (colors, logos)
   - Content customization fields
   - Template structure settings

2. **email_template_variables**: Dynamic content variables
   - Variable definitions and types
   - Validation rules
   - Display names and descriptions

3. **email_send_log**: Email sending audit trail
   - Send status tracking
   - Template snapshots
   - Delivery information

### Security Features

- **Row-Level Security (RLS)**: Tenant isolation
- **Role-Based Access**: Owner/admin permissions required
- **Audit Trail**: Complete email sending history
- **Template Versioning**: Snapshot system for compliance

### API Endpoints

- `GET /api/email-templates` - List templates
- `POST /api/email-templates` - Create template
- `GET /api/email-templates/[id]` - Get specific template
- `PUT /api/email-templates/[id]` - Update template
- `DELETE /api/email-templates/[id]` - Delete template
- `POST /api/email-templates/test-send` - Send test email

### Integration

#### Resend Email Service
- Professional email delivery
- Custom "from" addresses
- Delivery tracking
- Error handling and logging

#### Template Generation Engine
- Dynamic content processing
- HTML and text email generation
- Mobile-responsive rendering
- Cross-platform compatibility

## User Experience

### Template Management Workflow

1. **Access Dashboard**: Navigate to Email Templates section
2. **Select Template Type**: Choose Invoice, Reminder, or Confirmation
3. **Customize Design**: Use visual editor with live preview
4. **Configure Branding**: Upload logo and set company information
5. **Test Template**: Send test emails to verify appearance
6. **Activate Template**: Set as active for automated sending

### Key UX Features

- **Real-time Preview**: See changes instantly
- **Mobile Preview**: Verify mobile appearance
- **Test Sending**: Validate before activation
- **Template Switching**: Easy activation/deactivation
- **Backup/Restore**: Template export/import capabilities

## Business Value

### Brand Consistency
- Unified brand experience across all email communications
- Professional appearance enhances business credibility
- Customizable branding for different business types

### User Experience
- Intuitive drag-and-drop interface
- No technical knowledge required
- Real-time visual feedback
- Mobile-optimized editing

### Operational Efficiency
- Automated email sending with custom templates
- Template reuse across different communications
- Centralized email management
- Analytics for performance optimization

## Migration Instructions

For existing ClearSpendly installations:

1. **Database Migration**: Run the email templates migration
   ```sql
   -- Execute: supabase/migrations/20250722000001_create_email_templates.sql
   ```

2. **Default Templates**: System automatically creates default templates for existing tenants

3. **Navigation Update**: Email Templates menu item added to sidebar

4. **Email Service**: Configure Resend API key for email sending

## Future Enhancements

- **Advanced Analytics**: Email open rates, click tracking
- **A/B Testing**: Template performance comparison
- **Template Marketplace**: Shared template library
- **Automated Sequences**: Multi-email workflows
- **Integration APIs**: Third-party email service support
- **Advanced Personalization**: Dynamic content blocks

## Support

For technical support or questions about the email template system:
- Documentation: `/docs/email-system-documentation.md`
- API Reference: `/api/email-templates/*`
- Database Schema: `supabase/migrations/20250722000001_create_email_templates.sql`
- Template Generator: `lib/email-template-generator.ts`