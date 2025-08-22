/**
 * Admin API endpoint to run comprehensive setup on an individual tenant
 * Useful for fixing individual tenant issues or testing
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TenantSetupService } from "@/lib/tenant-setup/tenant-setup-service";

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    const setupService = new TenantSetupService();
    
    // Parse request body
    const { tenantId, force = false } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    console.log(`Starting individual tenant setup for: ${tenantId}`);
    
    // Get tenant and owner information
    const { data: tenantData, error: tenantError } = await adminSupabase
      .from('tenant')
      .select(`
        id,
        name,
        slug,
        subscription_plan,
        membership!inner(
          user_id,
          role
        )
      `)
      .eq('id', tenantId)
      .eq('membership.role', 'owner')
      .single();
    
    if (tenantError || !tenantData) {
      console.error("Failed to fetch tenant:", tenantError);
      return NextResponse.json(
        { error: "Tenant not found or has no owner" },
        { status: 404 }
      );
    }

    const ownerId = tenantData.membership[0]?.user_id;
    if (!ownerId) {
      return NextResponse.json(
        { error: "No owner found for tenant" },
        { status: 400 }
      );
    }

    // Check if tenant already has setup completed
    if (!force) {
      const alreadySetup = await setupService.checkTenantSetupStatus(tenantId);
      
      if (alreadySetup) {
        return NextResponse.json({
          success: true,
          message: "Tenant already has setup completed",
          data: {
            tenantId,
            tenantName: tenantData.name,
            skipped: true
          }
        });
      }
    }

    // Get user email for context
    const { data: userData } = await adminSupabase
      .from('user')
      .select('email')
      .eq('id', ownerId)
      .single();

    // Create setup context
    const setupContext = {
      tenantId: tenantData.id,
      userId: ownerId,
      userEmail: userData?.email || 'unknown@example.com',
      companyName: tenantData.name,
      subscriptionPlan: tenantData.subscription_plan || 'free'
    };

    // Run setup
    const setupResult = force 
      ? await setupService.setupTenant(setupContext)
      : await setupService.addMissingComponents(tenantId, ownerId);
    
    if (setupResult.success) {
      console.log(`✓ Successfully setup tenant: ${tenantData.name}`);
    } else {
      console.error(`✗ Failed to setup tenant: ${tenantData.name}`, setupResult.errors);
    }

    return NextResponse.json({
      success: setupResult.success,
      message: setupResult.message,
      data: {
        tenantId,
        tenantName: tenantData.name,
        setupResult
      }
    });

  } catch (error) {
    console.error("Error during individual tenant setup:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error during tenant setup",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check setup status for a specific tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId parameter is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const setupService = new TenantSetupService();
    
    // Get tenant information
    const { data: tenantData, error: tenantError } = await adminSupabase
      .from('tenant')
      .select('id, name, slug, subscription_plan, created_at')
      .eq('id', tenantId)
      .single();
    
    if (tenantError || !tenantData) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Check setup status
    const setupCompleted = await setupService.checkTenantSetupStatus(tenantId);
    
    // Get setup log details if exists
    const { data: setupLog } = await adminSupabase
      .from('tenant_setup_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // Check for individual components
    const componentStatus = {
      tagCategories: false,
      emailTemplates: false,
      invoiceTemplates: false,
      userPreferences: false,
      irsRates: false,
      usageTracking: false,
      vendorCategories: false
    };

    // Check tag categories
    const { data: tagCategories } = await adminSupabase
      .from('tag_category')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    componentStatus.tagCategories = !!tagCategories?.length;

    // Check email templates
    const { data: emailTemplates } = await adminSupabase
      .from('email_templates')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    componentStatus.emailTemplates = !!emailTemplates?.length;

    // Check invoice templates
    const { data: invoiceTemplates } = await adminSupabase
      .from('invoice_template')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    componentStatus.invoiceTemplates = !!invoiceTemplates?.length;

    // Check IRS rates
    const { data: irsRates } = await adminSupabase
      .from('irs_mileage_rate')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    componentStatus.irsRates = !!irsRates?.length;

    // Check usage tracking
    const { data: usageTracking } = await adminSupabase
      .from('tenant_usage')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    componentStatus.usageTracking = !!usageTracking?.length;

    // Check vendor categories
    const { data: vendorCategories } = await adminSupabase
      .from('vendor_category')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    componentStatus.vendorCategories = !!vendorCategories?.length;

    const completedComponents = Object.values(componentStatus).filter(Boolean).length;
    const totalComponents = Object.keys(componentStatus).length;
    const completionPercentage = Math.round((completedComponents / totalComponents) * 100);

    return NextResponse.json({
      success: true,
      data: {
        tenant: tenantData,
        setupCompleted,
        setupLog,
        componentStatus,
        completionPercentage,
        summary: {
          completedComponents,
          totalComponents,
          missingComponents: Object.entries(componentStatus)
            .filter(([_, completed]) => !completed)
            .map(([component, _]) => component)
        }
      }
    });

  } catch (error) {
    console.error("Error checking tenant setup status:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to check tenant setup status",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}