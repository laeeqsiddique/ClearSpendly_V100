import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Get tenant branding data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant')
      .select(`
        id,
        name,
        logo_url,
        business_name,
        tagline,
        website,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        email_from_name,
        reply_to_email,
        email_signature,
        brand_primary_color,
        brand_secondary_color
      `)
      .eq('id', membership.tenant_id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant branding:', tenantError);
      return NextResponse.json({ error: 'Failed to fetch branding settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      branding: tenant
    });

  } catch (error) {
    console.error('Error in branding GET API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant with role check
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
    }

    // Check if user has permission to update branding
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      logo_url,
      business_name,
      tagline,
      website,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      email_from_name,
      reply_to_email,
      email_signature,
      brand_primary_color,
      brand_secondary_color
    } = body;

    // Update tenant branding
    const { data: tenant, error: updateError } = await supabase
      .from('tenant')
      .update({
        logo_url,
        business_name,
        tagline,
        website,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        email_from_name,
        reply_to_email,
        email_signature,
        brand_primary_color,
        brand_secondary_color,
        updated_at: new Date().toISOString()
      })
      .eq('id', membership.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tenant branding:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update branding settings' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      branding: tenant,
      message: 'Branding settings updated successfully'
    });

  } catch (error) {
    console.error('Error in branding PUT API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}