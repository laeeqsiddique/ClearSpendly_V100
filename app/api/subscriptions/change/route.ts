import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/subscription-service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const changeSubscriptionSchema = z.object({
  newPlanId: z.string().uuid(),
});

// POST /api/subscriptions/change
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner') // Only owners can change subscriptions
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Only tenant owners can change subscriptions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { newPlanId } = changeSubscriptionSchema.parse(body);

    const result = await subscriptionService.changeSubscription(membership.tenant_id, newPlanId);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error changing subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}