import { NextRequest, NextResponse } from 'next/server';
import { reminderService } from '@/lib/reminder-service';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron job request
    const authHeader = headers().get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (process.env.NODE_ENV === 'production') {
      if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    console.log('[CRON] Starting automated payment reminder processing...');
    
    // Process all overdue invoices
    const results = await reminderService.processOverdueInvoices();
    
    console.log('[CRON] Reminder processing complete:', results);
    
    // Log results for monitoring
    const logMessage = `[CRON] Payment Reminders - Processed: ${results.processed}, Sent: ${results.sent}, Skipped: ${results.skipped}, Errors: ${results.errors}`;
    console.log(logMessage);
    
    return NextResponse.json({
      success: true,
      message: logMessage,
      results: {
        processed: results.processed,
        sent: results.sent,
        skipped: results.skipped,
        errors: results.errors
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CRON] Error in process-reminders:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}