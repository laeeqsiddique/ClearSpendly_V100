import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/subscriptions/payment-history
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

    // Get payment transactions for the tenant
    const { data: transactions, error: transactionsError } = await supabase
      .from('subscription_transaction')
      .select('*')
      .eq('tenant_id', membership.tenant_id)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to last 50 transactions

    if (transactionsError) {
      console.error('Error fetching payment history:', transactionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transactions || []
    });

  } catch (error) {
    console.error('Error in payment history API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}