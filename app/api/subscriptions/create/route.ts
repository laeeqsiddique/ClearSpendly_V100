import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService, CreateSubscriptionOptions } from '@/lib/subscription-service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.enum(['monthly', 'yearly']),
  provider: z.enum(['stripe', 'paypal']),
  paymentMethodId: z.string().optional(),
  trialDays: z.number().min(0).max(30).optional(),
});

// POST /api/subscriptions/create
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

    // Get user details
    const { data: userData, error: userDataError } = await supabase
      .from('user')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User data not found' },
        { status: 404 }
      );
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner') // Only owners can create subscriptions
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Only tenant owners can create subscriptions' },
        { status: 403 }
      );
    }

    // Check if tenant already has an active subscription
    const existingSubscription = await subscriptionService.getTenantSubscription(membership.tenant_id);
    if (existingSubscription && existingSubscription.status !== 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Tenant already has an active subscription' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = createSubscriptionSchema.parse(body);

    const options: CreateSubscriptionOptions = {
      tenantId: membership.tenant_id,
      planId: validatedData.planId,
      billingCycle: validatedData.billingCycle,
      provider: validatedData.provider,
      customerEmail: userData.email,
      customerName: userData.full_name || userData.email,
      paymentMethodId: validatedData.paymentMethodId,
      trialDays: validatedData.trialDays,
    };

    let result;
    
    if (validatedData.provider === 'stripe') {
      result = await subscriptionService.createStripeSubscription(options);
    } else {
      result = await subscriptionService.createPayPalSubscription(options);
    }

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

    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}