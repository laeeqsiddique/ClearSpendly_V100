import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("Setting up tenant for user:", user.email);

    // Step 1: Check/create user record
    let { data: userRecord, error: userError } = await supabase
      .from("user")
      .select("id, email")
      .eq("id", user.id)
      .single();

    if (userError && userError.code === "PGRST116") {
      // User doesn't exist, create it
      const { data: newUser, error: createUserError } = await supabase
        .from("user")
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.email!.split("@")[0],
        })
        .select()
        .single();

      if (createUserError) {
        return NextResponse.json(
          { error: "Failed to create user record: " + createUserError.message },
          { status: 500 }
        );
      }

      userRecord = newUser;
    }

    // Step 2: Check/create tenant
    let { data: tenant, error: tenantError } = await supabase
      .from("tenant")
      .select("id, name, slug")
      .limit(1)
      .single();

    if (tenantError && tenantError.code === "PGRST116") {
      // No tenant exists, create one
      const { data: newTenant, error: createTenantError } = await supabase
        .from("tenant")
        .insert({
          name: "My Company",
          slug: "my-company",
          settings: {},
        })
        .select()
        .single();

      if (createTenantError) {
        return NextResponse.json(
          { error: "Failed to create tenant: " + createTenantError.message },
          { status: 500 }
        );
      }

      tenant = newTenant;
    }

    // Step 3: Check/create membership
    const { data: membership, error: membershipError } = await supabase
      .from("membership")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant.id)
      .single();

    if (membershipError && membershipError.code === "PGRST116") {
      // No membership exists, create one
      const { data: newMembership, error: createMembershipError } = await supabase
        .from("membership")
        .insert({
          user_id: user.id,
          tenant_id: tenant.id,
          role: "owner",
          invitation_status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createMembershipError) {
        return NextResponse.json(
          { error: "Failed to create membership: " + createMembershipError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tenant setup completed successfully",
      data: {
        user: userRecord,
        tenant: tenant,
        role: "owner",
      },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}