import { NextRequest, NextResponse } from 'next/server';
import { polarSubscriptionService } from '@/lib/services/polar-subscription-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get plans from Polar and database
    const plans = await polarSubscriptionService.getPlans();
    
    return NextResponse.json({
      success: true,
      plans,
      count: plans.length
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription plans',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Sync plans from Polar to database
    await polarSubscriptionService.syncPlansFromPolar();
    
    return NextResponse.json({
      success: true,
      message: 'Plans synced successfully'
    });
  } catch (error) {
    console.error('Error syncing subscription plans:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync subscription plans',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}