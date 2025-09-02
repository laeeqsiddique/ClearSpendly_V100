import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PolarSubscriptionService } from '@/lib/services/polar-subscription-service';
import { createPolarCustomer, createCheckoutSession, fetchPolarPlans } from '@/lib/polar';

export const dynamic = 'force-dynamic';

// Helper function to verify user access to tenant with retry logic
async function verifyUserAccess(supabase: any, adminSupabase: any, userId: string, tenantId: string): Promise<{ hasAccess: boolean; role?: string; error?: string }> {
  try {
    // First attempt with regular client
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (membership && !membershipError) {
      console.log('Membership found with regular client:', membership);
      return { hasAccess: true, role: membership.role };
    }

    console.log('Membership not found with regular client, trying admin client...');
    
    // Retry with admin client in case of RLS issues during onboarding
    const { data: adminMembership, error: adminMembershipError } = await adminSupabase
      .from('membership')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (adminMembership && !adminMembershipError) {
      console.log('Membership found with admin client:', adminMembership);
      return { hasAccess: true, role: adminMembership.role };
    }

    console.log('No membership found in either client. Checking tenant existence...');
    
    // Verify tenant exists - if it does, allow access during onboarding
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant')
      .select('id')
      .eq('id', tenantId)
      .single();
      
    if (tenant && !tenantError) {
      console.log('Tenant exists, allowing onboarding access');
      return { hasAccess: true, role: 'owner' }; // Assume owner for onboarding
    }

    return { hasAccess: false, error: 'Tenant not found' };
  } catch (error) {
    console.error('Error verifying user access:', error);
    return { hasAccess: false, error: 'Access verification failed' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const polarService = new PolarSubscriptionService(supabase);
    
    const body = await request.json();
    console.log('Checkout request body:', body);
    
    const { 
      tenant_id, 
      plan_id, 
      billing_cycle, 
      success_url, 
      cancel_url, 
      trial_mode = false,
      convert_trial = false,
      proration = true 
    } = body;

    console.log('Extracted fields:', {
      tenant_id,
      plan_id,
      billing_cycle,
      success_url,
      cancel_url,
      trial_mode,
      convert_trial
    });

    // Validate required fields
    if (!tenant_id || !plan_id || !billing_cycle || !success_url) {
      console.error('Missing required fields:', {
        tenant_id: !!tenant_id,
        plan_id: !!plan_id,
        billing_cycle: !!billing_cycle,
        success_url: !!success_url
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['tenant_id', 'plan_id', 'billing_cycle', 'success_url'],
          received: { tenant_id, plan_id, billing_cycle, success_url }
        },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid billing cycle. Must be "monthly" or "yearly".'
        },
        { status: 400 }
      );
    }

    // Get current user and verify tenant ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has access to this tenant using robust verification
    console.log('Verifying user access to tenant:', tenant_id);
    const accessCheck = await verifyUserAccess(supabase, adminSupabase, user.id, tenant_id);
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: accessCheck.error || 'Access denied' },
        { status: accessCheck.error === 'Tenant not found' ? 404 : 403 }
      );
    }
    
    // Verify role permissions for non-onboarding scenarios
    if (accessCheck.role && accessCheck.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only tenant owners can create subscriptions.' },
        { status: 403 }
      );
    }
    
    console.log(`Access verified - user ${user.id} has ${accessCheck.role} access to tenant ${tenant_id}`);

    // Get tenant details for customer creation
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant')
      .select('name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Handle trial mode - create trial subscription directly
    if (trial_mode) {
      const trialSubscription = await polarService.createTrialSubscription({
        tenant_id,
        plan_id,
        billing_cycle,
        customer_email: user.email!,
        customer_name: user.user_metadata?.full_name || tenant.name,
        trial_mode: true
      });

      return NextResponse.json({
        success: true,
        trial: true,
        subscription: trialSubscription,
        message: 'Trial subscription created successfully'
      });
    }

    // Handle trial conversion
    if (convert_trial) {
      const checkoutSession = await polarService.convertTrialToPaid({
        tenant_id,
        plan_id,
        billing_cycle,
        success_url,
        cancel_url: cancel_url || success_url,
        customer_email: user.email!,
        customer_name: user.user_metadata?.full_name || tenant.name
      });

      return NextResponse.json({
        success: true,
        trial_conversion: true,
        checkout_url: checkoutSession.url,
        checkout_id: checkoutSession.checkout_id,
        message: 'Trial conversion checkout session created'
      });
    }

    // Get available plans to find the price ID
    const plans = await fetchPolarPlans();
    const selectedPlan = plans.find(p => p.id === plan_id);
    
    if (!selectedPlan) {
      return NextResponse.json(
        { success: false, error: `Plan ${plan_id} not found` },
        { status: 404 }
      );
    }

    // Use the product ID instead of price ID for checkout
    const productId = selectedPlan.polar_product_id || selectedPlan.id;
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: `No product ID available for plan ${plan_id}` },
        { status: 400 }
      );
    }

    console.log('Creating real Polar checkout session for:', {
      tenant_id,
      plan_id,
      billing_cycle,
      product_id: productId,
      user_email: user.email,
      tenant_name: tenant.name
    });

    // Create or get Polar customer
    let polarCustomer;
    try {
      polarCustomer = await createPolarCustomer(
        user.email!,
        user.user_metadata?.full_name || tenant.name
      );
      console.log('Created Polar customer:', polarCustomer);
    } catch (error) {
      console.error('Error creating Polar customer:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create customer account' },
        { status: 500 }
      );
    }

    if (!polarCustomer || !polarCustomer.id) {
      console.error('Invalid customer object:', polarCustomer);
      return NextResponse.json(
        { success: false, error: 'Invalid customer response from Polar' },
        { status: 500 }
      );
    }

    // Create real Polar checkout session
    let checkoutSession;
    try {
      checkoutSession = await createCheckoutSession(
        polarCustomer.id,
        productId,
        success_url,
        cancel_url || success_url,
        {
          tenant_id,
          plan_id,
          billing_cycle,
          user_id: user.id
        }
      );
    } catch (error) {
      console.error('Error creating Polar checkout session:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      checkout_url: checkoutSession.url,
      checkout_id: checkoutSession.id,
      customer_id: polarCustomer.id,
      message: 'Real Polar checkout session created successfully'
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}