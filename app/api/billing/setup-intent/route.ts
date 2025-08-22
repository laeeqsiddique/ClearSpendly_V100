import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { stripeService } from '@/lib/stripe-service';

export const dynamic = 'force-dynamic';

// Deployment safety
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

// POST /api/billing/setup-intent - Create setup intent for adding payment method
export async function POST(request: NextRequest) {
  if (isBuildTime) {
    return NextResponse.json({
      success: true,
      clientSecret: 'pi_test_build_time_mock',
      buildTime: true
    });
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant access found' }, { status: 403 });
    }

    // Check permissions
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get or create Stripe customer
    let customerId: string;
    const { data: subscription } = await supabase
      .from('subscription')
      .select('provider_customer_id, provider')
      .eq('tenant_id', membership.tenant_id)
      .eq('provider', 'stripe')
      .single();

    if (subscription?.provider_customer_id) {
      customerId = subscription.provider_customer_id;
    } else {
      // Create new customer
      const customerResult = await stripeService.createCustomer({
        email: user.email!,
        name: user.user_metadata?.full_name,
        tenantId: membership.tenant_id
      });

      if (!customerResult.success || !customerResult.customer) {
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }

      customerId = customerResult.customer.id;

      // Update subscription record if exists
      if (subscription) {
        await supabase
          .from('subscription')
          .update({ provider_customer_id: customerId })
          .eq('id', subscription.id);
      }
    }

    // Create setup intent
    const result = await stripeService.createSetupIntent(customerId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      clientSecret: result.setupIntent?.client_secret
    });

  } catch (error) {
    console.error('Error in POST /api/billing/setup-intent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}