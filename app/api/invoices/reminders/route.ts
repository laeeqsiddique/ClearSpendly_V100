import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reminderService } from '@/lib/reminder-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, invoiceId, customMessage } = body;

    if (!action) {
      return NextResponse.json({ 
        error: 'Action is required (process_all or send_manual)' 
      }, { status: 400 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    switch (action) {
      case 'process_all':
        // Process all overdue invoices for automated reminders
        const results = await reminderService.processOverdueInvoices();
        
        return NextResponse.json({
          success: true,
          message: `Processed ${results.processed} invoices. Sent ${results.sent} reminders, skipped ${results.skipped}, errors: ${results.errors}`,
          results
        });

      case 'send_manual':
        // Send manual reminder for specific invoice
        if (!invoiceId) {
          return NextResponse.json({ 
            error: 'Invoice ID is required for manual reminders' 
          }, { status: 400 });
        }

        // Verify invoice belongs to user's tenant
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoice')
          .select('id, invoice_number, status')
          .eq('id', invoiceId)
          .eq('tenant_id', membership.tenant_id)
          .single();

        if (invoiceError || !invoice) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (['paid', 'cancelled'].includes(invoice.status)) {
          return NextResponse.json({ 
            error: 'Cannot send reminders for paid or cancelled invoices' 
          }, { status: 400 });
        }

        const result = await reminderService.sendManualReminder(invoiceId, customMessage);

        if (result.success) {
          return NextResponse.json({
            success: true,
            message: `Manual reminder sent for invoice ${invoice.invoice_number}`
          });
        } else {
          return NextResponse.json({ 
            error: `Failed to send reminder: ${result.error}` 
          }, { status: 500 });
        }

      case 'get_summary':
        // Get summary of overdue invoices needing reminders
        const summary = await reminderService.getOverdueInvoicesSummary();
        
        return NextResponse.json({
          success: true,
          summary
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Must be: process_all, send_manual, or get_summary' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in reminders API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Get summary of overdue invoices needing reminders
    const summary = await reminderService.getOverdueInvoicesSummary();
    const config = reminderService.getConfig();
    
    return NextResponse.json({
      success: true,
      summary,
      config
    });

  } catch (error) {
    console.error('Error in reminders API GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}