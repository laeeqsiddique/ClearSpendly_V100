import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { featureGateService } from '@/lib/feature-gating/feature-gate-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const featureKey = searchParams.get('feature');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenant_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify tenant access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has access to this tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this tenant' },
        { status: 403 }
      );
    }

    // Check specific feature or all features
    if (featureKey) {
      const featureResult = await featureGateService.checkFeature(tenantId, featureKey);
      return NextResponse.json({
        success: true,
        feature: featureKey,
        result: featureResult
      });
    } else {
      // Get all features for tenant
      const features = await featureGateService.getTenantFeatures(tenantId);
      return NextResponse.json({
        success: true,
        tenant_id: tenantId,
        features
      });
    }

  } catch (error) {
    console.error('Error checking features:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check features',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, feature_key, enabled, config, reason, expires_at, priority } = body;

    if (!tenant_id || !feature_key || typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['tenant_id', 'feature_key', 'enabled']
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify tenant admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is owner or admin of this tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .in('role', ['owner', 'admin'])
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only tenant owners and admins can manage features.' },
        { status: 403 }
      );
    }

    // Set feature override
    await featureGateService.setFeatureOverride(
      tenant_id,
      feature_key,
      enabled,
      {
        config,
        reason,
        expiresAt: expires_at ? new Date(expires_at) : undefined,
        priority,
        setBy: user.id
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Feature override set successfully',
      feature_key,
      enabled
    });

  } catch (error) {
    console.error('Error setting feature override:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set feature override',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const featureKey = searchParams.get('feature_key');

    if (!tenantId || !featureKey) {
      return NextResponse.json(
        { success: false, error: 'tenant_id and feature_key parameters are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify tenant admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is owner or admin of this tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .in('role', ['owner', 'admin'])
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only tenant owners and admins can manage features.' },
        { status: 403 }
      );
    }

    // Remove feature override
    await featureGateService.removeFeatureOverride(tenantId, featureKey);

    return NextResponse.json({
      success: true,
      message: 'Feature override removed successfully',
      feature_key: featureKey
    });

  } catch (error) {
    console.error('Error removing feature override:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove feature override',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}