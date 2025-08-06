import { NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/subscription-service';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/subscriptions/plans
export async function GET() {
  try {
    const plans = await subscriptionService.getAvailablePlans();
    
    return NextResponse.json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}