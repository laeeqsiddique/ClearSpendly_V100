import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("Setting up tenant for user:", user.email, user.id);

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

    return NextResponse.json({
      success: true,
      message: "Tenant setup completed successfully",
      data: {
        user: userRecord,
        tenant: newTenant,
        membership: newMembership,
        role: "owner",
      },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}