import { NextRequest, NextResponse } from 'next/server';
import { subscriptionExpenseProcessor } from '@/lib/services/subscription-expense-processor';
import { headers } from 'next/headers';

// Deployment safety check
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

export async function GET(request: NextRequest) {
  try {
    // Build-time safety check
    if (isBuildTime) {
      return NextResponse.json({
        success: true,
        message: 'Build-time mock response - subscription processing disabled during build',
        results: {
          totalProcessed: 0,
          successCount: 0,
          errorCount: 0,
          skippedCount: 0,
          totalAmount: 0,
          processingTimeMs: 0,
          errors: []
        },
        timestamp: new Date().toISOString(),
        buildTime: true
      });
    }

    // Verify this is a legitimate Vercel Cron job request
    const authHeader = headers().get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'fallback-secret';
    
    if (process.env.NODE_ENV === 'production') {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[CRON] Unauthorized subscription processing attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    console.log('[CRON] Starting automated subscription expense processing...');
    
    // Process all subscriptions across all tenants
    const results = await subscriptionExpenseProcessor.processAllSubscriptions();
    
    // Log comprehensive results for monitoring
    const logMessage = `[CRON] Subscription Processing Complete - Processed: ${results.totalProcessed}, Success: ${results.successCount}, Errors: ${results.errorCount}, Skipped: ${results.skippedCount}, Total Amount: $${results.totalAmount.toFixed(2)}, Duration: ${results.processingTimeMs}ms`;
    console.log(logMessage);
    
    // Log any errors for investigation
    if (results.errors.length > 0) {
      console.error('[CRON] Subscription processing errors:', results.errors);
    }
    
    // Return detailed response for monitoring systems
    return NextResponse.json({
      success: true,
      message: logMessage,
      results: {
        totalProcessed: results.totalProcessed,
        successCount: results.successCount,
        errorCount: results.errorCount,
        skippedCount: results.skippedCount,
        totalAmount: results.totalAmount,
        processingTimeMs: results.processingTimeMs,
        errors: results.errors.map(error => ({
          subscriptionId: error.subscriptionId,
          tenantId: error.tenantId,
          error: error.error
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CRON] Fatal error in subscription processing:', error);
    
    // Return error response for monitoring
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred during subscription processing',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Ensure dynamic rendering for this endpoint
export const dynamic = 'force-dynamic';