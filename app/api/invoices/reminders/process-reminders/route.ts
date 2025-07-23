import { NextRequest, NextResponse } from 'next/server';
import { reminderService } from '@/lib/reminder-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - this endpoint should only be accessible by:
    // 1. Authenticated users with admin/owner role
    // 2. Cron job with proper API key
    
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Check if it's a cron job request
    if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
      console.log('Processing reminders via cron job');
    } else {
      // Check for authenticated user
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Check if user has admin/owner role
      const { data: membership, error: membershipError } = await supabase
        .from('membership')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }
    
    // Process overdue invoices
    console.log('Starting automated payment reminder processing...');
    const results = await reminderService.processOverdueInvoices();
    
    console.log('Reminder processing complete:', results);
    
    return NextResponse.json({
      success: true,
      results: {
        processed: results.processed,
        sent: results.sent,
        skipped: results.skipped,
        errors: results.errors
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in process-reminders API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check reminder status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get summary of overdue invoices
    const summary = await reminderService.getOverdueInvoicesSummary();
    const config = reminderService.getConfig();
    
    return NextResponse.json({
      success: true,
      summary,
      config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting reminder status:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}