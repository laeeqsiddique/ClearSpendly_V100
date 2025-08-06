import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paypalService } from '@/lib/paypal-service';
import { stripeService } from '@/lib/stripe-service';

export const dynamic = 'force-dynamic';

// GET - List enabled payment providers for tenant
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Only owners and admins can manage payment providers
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get payment providers for this tenant
    const { data: providers, error: providersError } = await supabase
      .from('payment_provider')
      .select(`
        id,
        provider_type,
        is_enabled,
        is_default,
        verification_status,
        setup_completed_at,
        last_verified_at,
        paypal_client_id,
        provider_config,
        created_at,
        updated_at
      `)
      .eq('tenant_id', membership.tenant_id)
      .order('provider_type');

    if (providersError) {
      console.error('Error fetching payment providers:', providersError);
      return NextResponse.json({ error: 'Failed to fetch payment providers' }, { status: 500 });
    }

    // Format response to hide sensitive data
    const formattedProviders = (providers || []).map(provider => ({
      id: provider.id,
      provider_type: provider.provider_type,
      is_enabled: provider.is_enabled,
      is_default: provider.is_default,
      verification_status: provider.verification_status,
      setup_completed_at: provider.setup_completed_at,
      last_verified_at: provider.last_verified_at,
      has_credentials: provider.provider_type === 'paypal' ? !!provider.paypal_client_id : true,
      config: {
        environment: provider.provider_config?.environment || 'sandbox'
      },
      created_at: provider.created_at,
      updated_at: provider.updated_at
    }));

    return NextResponse.json({
      success: true,
      providers: formattedProviders
    });

  } catch (error) {
    console.error('Error in payment providers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Setup or update a payment provider
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { provider_type, paypal_client_id, is_enabled = true, is_default = false } = body;

    if (!provider_type || !['stripe', 'paypal'].includes(provider_type)) {
      return NextResponse.json({ 
        error: 'Invalid provider_type. Must be "stripe" or "paypal"' 
      }, { status: 400 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Only owners and admins can manage payment providers
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate PayPal setup
    if (provider_type === 'paypal') {
      if (!paypal_client_id) {
        return NextResponse.json({ 
          error: 'PayPal Client ID is required for PayPal setup' 
        }, { status: 400 });
      }

      // Test PayPal configuration if enabling
      if (is_enabled) {
        const testResult = await paypalService.testConfiguration();
        if (!testResult.success) {
          return NextResponse.json({ 
            error: `PayPal configuration test failed: ${testResult.error}` 
          }, { status: 400 });
        }
      }
    }

    // Validate Stripe setup
    if (provider_type === 'stripe' && is_enabled) {
      const testResult = await stripeService.testStripeConfiguration();
      if (!testResult.success) {
        return NextResponse.json({ 
          error: `Stripe configuration test failed: ${testResult.error}` 
        }, { status: 400 });
      }
    }

    // Prepare provider data
    const providerData: any = {
      tenant_id: membership.tenant_id,
      provider_type,
      is_enabled,
      is_default,
      verification_status: is_enabled ? 'verified' : 'pending',
      setup_completed_at: is_enabled ? new Date().toISOString() : null,
      last_verified_at: is_enabled ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    if (provider_type === 'paypal') {
      providerData.paypal_client_id = paypal_client_id;
      providerData.provider_config = {
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paypal?tenant=${membership.tenant_id}`,
        environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
      };
    }

    // If setting as default, unset other defaults
    if (is_default) {
      const { error: unsetDefaultError } = await supabase
        .from('payment_provider')
        .update({ is_default: false })
        .eq('tenant_id', membership.tenant_id)
        .neq('provider_type', provider_type);

      if (unsetDefaultError) {
        console.error('Error unsetting default providers:', unsetDefaultError);
      }
    }

    // Upsert provider configuration
    const { data: provider, error: upsertError } = await supabase
      .from('payment_provider')
      .upsert(providerData, {
        onConflict: 'tenant_id,provider_type'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting payment provider:', upsertError);
      return NextResponse.json({ 
        error: 'Failed to save payment provider configuration' 
      }, { status: 500 });
    }

    // Setup PayPal integration if needed
    if (provider_type === 'paypal' && is_enabled) {
      const setupResult = await paypalService.setupTenantIntegration(
        membership.tenant_id, 
        paypal_client_id
      );

      if (!setupResult.success) {
        console.error('PayPal setup failed:', setupResult.error);
        // Disable the provider if setup failed
        await supabase
          .from('payment_provider')
          .update({ 
            is_enabled: false, 
            verification_status: 'failed',
            provider_config: {
              ...providerData.provider_config,
              setup_error: setupResult.error
            }
          })
          .eq('id', provider.id);

        return NextResponse.json({ 
          error: `PayPal setup failed: ${setupResult.error}` 
        }, { status: 500 });
      }
    }

    // Format response
    const formattedProvider = {
      id: provider.id,
      provider_type: provider.provider_type,
      is_enabled: provider.is_enabled,
      is_default: provider.is_default,
      verification_status: provider.verification_status,
      setup_completed_at: provider.setup_completed_at,
      last_verified_at: provider.last_verified_at,
      has_credentials: provider_type === 'paypal' ? !!provider.paypal_client_id : true,
      config: {
        environment: provider.provider_config?.environment || 'sandbox',
        webhook_url: provider.provider_config?.webhook_url
      },
      created_at: provider.created_at,
      updated_at: provider.updated_at
    };

    return NextResponse.json({
      success: true,
      provider: formattedProvider,
      message: `${provider_type} provider ${is_enabled ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    console.error('Error in payment providers POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Disable a payment provider
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { provider_type } = body;

    if (!provider_type || !['stripe', 'paypal'].includes(provider_type)) {
      return NextResponse.json({ 
        error: 'Invalid provider_type. Must be "stripe" or "paypal"' 
      }, { status: 400 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Only owners and admins can manage payment providers
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Disable the provider
    const { error: updateError } = await supabase
      .from('payment_provider')
      .update({ 
        is_enabled: false,
        is_default: false,
        verification_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', membership.tenant_id)
      .eq('provider_type', provider_type);

    if (updateError) {
      console.error('Error disabling payment provider:', updateError);
      return NextResponse.json({ 
        error: 'Failed to disable payment provider' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${provider_type} provider disabled successfully`
    });

  } catch (error) {
    console.error('Error in payment providers DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}