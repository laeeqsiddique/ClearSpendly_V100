import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/subscription-service';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/subscriptions/usage - Get current usage and limits
export async function GET(request: NextRequest) {
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
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const usageTypes = ['receipts_per_month', 'invoices_per_month', 'storage_mb', 'users_max'];
    const usage: Record<string, any> = {};

    for (const usageType of usageTypes) {
      usage[usageType] = await subscriptionService.checkUsageLimit(membership.tenant_id, usageType);
    }

    return NextResponse.json({
      success: true,
      data: {
        tenantId: membership.tenant_id,
        usage
      }
    });

  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}