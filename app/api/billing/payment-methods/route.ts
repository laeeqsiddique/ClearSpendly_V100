import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get tenant ID from user metadata or membership
    const { data: membership } = await supabase
      .from('tenant_membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Mock payment methods - in a real implementation, this would fetch from Stripe/PayPal
    const mockPaymentMethods = [
      {
        id: 'pm_1',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        exp_month: 12,
        exp_year: 2025,
        is_default: true,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'pm_2',
        type: 'card',
        last4: '0005',
        brand: 'mastercard',
        exp_month: 8,
        exp_year: 2026,
        is_default: false,
        created_at: '2024-02-01T00:00:00Z'
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockPaymentMethods
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, card, billing_address } = body;

    if (!type || !billing_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In a real implementation, this would:
    // 1. Create payment method with Stripe/PayPal
    // 2. Store encrypted payment method details
    // 3. Associate with customer/tenant

    // Mock successful creation
    const newPaymentMethod = {
      id: `pm_${Date.now()}`,
      type,
      last4: card?.number?.slice(-4) || '****',
      brand: 'visa', // Would be determined by card number
      exp_month: card?.exp_month,
      exp_year: card?.exp_year,
      is_default: false,
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: newPaymentMethod,
      message: 'Payment method added successfully'
    });

  } catch (error) {
    console.error('Error adding payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}