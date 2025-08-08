import cron from 'node-cron';
import { createClient } from '@/lib/supabase/admin';
import { subscriptionExpenseProcessor } from '@/lib/services/subscription-expense-processor';

interface SubscriptionProcessResult {
  processed: number;
  errors: number;
  date: string;
  details: Array<{
    subscriptionId: string;
    serviceName: string;
    success: boolean;
    error?: string;
  }>;
}


async function processAllDueSubscriptions(): Promise<SubscriptionProcessResult> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    console.log(`🔍 Starting daily subscription processing for ${today}...`);

    // Use the enterprise-grade processor
    const batchResult = await subscriptionExpenseProcessor.processAllSubscriptions();
    
    console.log(`🎉 Daily processing complete! Processed: ${batchResult.successCount}, Errors: ${batchResult.errorCount}`);

    // Convert enterprise result to our interface
    const result: SubscriptionProcessResult = {
      processed: batchResult.successCount,
      errors: batchResult.errorCount,
      date: today,
      details: batchResult.errors.map(error => ({
        subscriptionId: error.subscriptionId,
        serviceName: 'Unknown Service', // Enterprise processor doesn't return service name in errors
        success: false,
        error: error.error
      }))
    };

    // Add successful subscriptions to details (though we don't have individual success details from enterprise processor)
    for (let i = 0; i < batchResult.successCount; i++) {
      result.details.push({
        subscriptionId: `success-${i}`,
        serviceName: 'Processed Successfully',
        success: true
      });
    }

    return result;

  } catch (error) {
    console.error('💥 Critical error in daily subscription processing:', error);
    return {
      processed: 0,
      errors: 1,
      date: today,
      details: [{
        subscriptionId: 'SYSTEM_ERROR',
        serviceName: 'System Error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown system error'
      }]
    };
  }
}

export function startSubscriptionCron(): void {
  // Only run cron in production environment
  if (process.env.NODE_ENV !== 'production') {
    console.log('🚫 Skipping subscription cron in development environment');
    return;
  }

  console.log('🚀 Initializing subscription expense cron job...');

  // Run daily at 6:00 AM
  // Format: second minute hour day month weekday
  cron.schedule('0 6 * * *', async () => {
    console.log(`\n⏰ Daily subscription processing started at ${new Date().toISOString()}`);
    
    try {
      const result = await processAllDueSubscriptions();
      
      // Log summary
      console.log(`\n📊 DAILY SUMMARY for ${result.date}:`);
      console.log(`   ✅ Processed: ${result.processed}`);
      console.log(`   ❌ Errors: ${result.errors}`);
      console.log(`   📋 Total: ${result.details.length}`);
      
      if (result.errors > 0) {
        console.log(`\n🚨 ERROR DETAILS:`);
        result.details
          .filter(detail => !detail.success)
          .forEach(detail => {
            console.log(`   - ${detail.serviceName}: ${detail.error}`);
          });
      }

    } catch (error) {
      console.error('💥 CRITICAL: Daily subscription processing failed:', error);
    }

    console.log(`⏰ Daily subscription processing completed at ${new Date().toISOString()}\n`);
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust to your timezone
  });

  console.log('📅 Subscription cron job scheduled to run daily at 6:00 AM');
}

// Manual processing function for testing or manual trigger
export async function processSubscriptionsManually(): Promise<SubscriptionProcessResult> {
  console.log('🔧 Manual subscription processing triggered...');
  return await processAllDueSubscriptions();
}