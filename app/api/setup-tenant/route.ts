import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TenantSetupService } from "@/lib/tenant-setup/tenant-setup-service";

export async function POST() {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const setupService = new TenantSetupService();
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("Starting comprehensive tenant setup for user:", user.email, user.id);

    // First check if user already has a membership (avoid duplicate setup)
    // Use admin client to bypass RLS
    try {
      const { data: existingMembership, error: existingMembershipError } = await adminSupabase
        .from("membership")
        .select("id, tenant_id, role")
        .eq("user_id", user.id)
        .single();

      if (existingMembership && !existingMembershipError) {
        console.log("User already has membership:", existingMembership);
        // Get the tenant details
        const { data: existingTenant } = await adminSupabase
          .from("tenant")
          .select("id, name, slug")
          .eq("id", existingMembership.tenant_id)
          .single();
        
        return NextResponse.json({
          success: true,
          message: "Tenant setup already completed",
          data: {
            tenant: existingTenant,
            role: existingMembership.role,
          },
        });
      }
    } catch (error) {
      console.log("No existing membership found, proceeding with setup");
    }

    // Step 1: Check/create user record
    // Use admin client to bypass RLS
    let { data: userRecord, error: userError } = await adminSupabase
      .from("user")
      .select("id, email")
      .eq("id", user.id)
      .single();

    if (userError && userError.code === "PGRST116") {
      console.log("Creating user record for:", user.email);
      // User doesn't exist, create it
      const { data: newUser, error: createUserError } = await adminSupabase
        .from("user")
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.email!.split("@")[0],
        })
        .select()
        .single();

      if (createUserError) {
        console.error("Failed to create user record:", createUserError);
        return NextResponse.json(
          { error: "Failed to create user record: " + createUserError.message },
          { status: 500 }
        );
      }

      userRecord = newUser;
      console.log("User record created successfully:", userRecord.id);
    } else if (userError) {
      console.error("Error fetching user record:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user record: " + userError.message },
        { status: 500 }
      );
    }

    // Step 2: Create a new tenant for this user (each user gets their own tenant)
    const userEmail = user.email!;
    const companyName = user.user_metadata?.company_name || `${userEmail.split("@")[0]}'s Company`;
    const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const uniqueSlug = baseSlug + '-' + user.id.slice(0, 8); // Ensure uniqueness
    
    console.log("Creating tenant with slug:", uniqueSlug);
    const { data: newTenant, error: createTenantError } = await adminSupabase
      .from("tenant")
      .insert({
        name: companyName,
        slug: uniqueSlug,
        settings: {},
        subscription_status: 'trial',
        subscription_plan: 'free'
      })
      .select()
      .single();

    if (createTenantError) {
      console.error("Create tenant error:", createTenantError);
      return NextResponse.json(
        { error: "Failed to create tenant: " + createTenantError.message },
        { status: 500 }
      );
    }

    console.log("Created new tenant:", newTenant.id, newTenant.name);

    // Step 3: Create membership linking user to tenant
    console.log("Creating membership for user:", user.id, "tenant:", newTenant.id);
    const { data: newMembership, error: createMembershipError } = await adminSupabase
      .from("membership")
      .insert({
        user_id: user.id,
        tenant_id: newTenant.id,
        role: "owner",
        accepted_at: new Date().toISOString(),
        status: "active",  // Explicitly set status to active
        invitation_status: "accepted"  // Also set invitation_status for consistency
      })
      .select()
      .single();

    if (createMembershipError) {
      console.error("Failed to create membership:", createMembershipError);
      return NextResponse.json(
        { error: "Failed to create membership: " + createMembershipError.message },
        { status: 500 }
      );
    }

    console.log("Membership created successfully:", newMembership.id);

    // Step 4: Run comprehensive seed data setup
    console.log("Starting comprehensive seed data setup...");
    
    const setupContext = {
      tenantId: newTenant.id,
      userId: user.id,
      userEmail: user.email!,
      companyName: companyName,
      subscriptionPlan: newTenant.subscription_plan || 'free'
    };

    const setupResult = await setupService.setupTenant(setupContext);
    
    if (!setupResult.success) {
      console.error("Comprehensive setup failed:", setupResult.errors);
      
      // Note: Basic tenant/membership is already created and won't be rolled back
      // This allows the user to still access the system even if seed data setup fails
      return NextResponse.json({
        success: true,
        message: "Basic tenant setup completed, but some seed data setup failed",
        warning: "Some default data may be missing. You can add it manually or contact support.",
        data: {
          user: userRecord,
          tenant: newTenant,
          membership: newMembership,
          role: "owner",
          setupResult: setupResult
        },
      });
    }

    const setupTime = Date.now() - startTime;
    console.log(`Comprehensive tenant setup completed successfully in ${setupTime}ms`);

    return NextResponse.json({
      success: true,
      message: "Comprehensive tenant setup completed successfully",
      data: {
        user: userRecord,
        tenant: newTenant,
        membership: newMembership,
        role: "owner",
        setupResult: setupResult,
        setupTimeMs: setupTime
      },
    });
  } catch (error) {
    const setupTime = Date.now() - startTime;
    console.error("Critical setup error after", setupTime, "ms:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error during tenant setup",
        details: error instanceof Error ? error.message : 'Unknown error',
        setupTimeMs: setupTime
      },
      { status: 500 }
    );
  }
}