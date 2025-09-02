import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { featureAccessService } from '@/lib/services/feature-access-service';

export const dynamic = 'force-dynamic';

/**
 * Get comprehensive access information for a tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    const feature = searchParams.get('feature');
    const usage_type = searchParams.get('usage_type');

    if (!tenant_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing tenant_id parameter'
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify authentication
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
      .eq('tenant_id', tenant_id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Handle specific feature check
    if (feature) {
      const featureAccess = await featureAccessService.checkFeatureAccess(tenant_id, feature);
      return NextResponse.json({
        success: true,
        feature: feature,
        access: featureAccess
      });
    }

    // Handle specific usage check
    if (usage_type) {
      const usageCheck = await featureAccessService.checkUsageAccess(tenant_id, usage_type, 0);
      return NextResponse.json({
        success: true,
        usage_type: usage_type,
        usage: usageCheck
      });
    }

    // Get comprehensive access summary
    const summary = await featureAccessService.getTenantAccessSummary(tenant_id);
    
    return NextResponse.json({
      success: true,
      tenant_id,
      access_summary: summary
    });

  } catch (error) {
    console.error('Error getting access information:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get access information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Record usage for a tenant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, usage_type, amount = 1, feature_check } = body;

    if (!tenant_id || !usage_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['tenant_id', 'usage_type']
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify authentication
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
      .eq('tenant_id', tenant_id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check feature access if requested
    let featureAccess = null;
    if (feature_check) {
      featureAccess = await featureAccessService.checkFeatureAccess(tenant_id, feature_check);
      
      if (!featureAccess.hasAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'Feature access denied',
            reason: featureAccess.reason,
            feature_access: featureAccess
          },
          { status: 403 }
        );
      }
    }

    // Record usage
    const usageResult = await featureAccessService.recordUsage(tenant_id, usage_type, amount);

    if (!usageResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usage recording failed',
          reason: usageResult.error,
          usage: usageResult.usage
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Recorded ${amount} ${usage_type} usage`,
      usage: usageResult.usage,
      feature_access: featureAccess,
      warning: usageResult.usage?.percentage >= 80 ? 
        `You've used ${usageResult.usage.percentage.toFixed(1)}% of your ${usage_type} quota` : undefined
    });

  } catch (error) {
    console.error('Error recording usage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record usage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}