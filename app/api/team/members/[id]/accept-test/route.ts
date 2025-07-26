import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, context) => {
    try {
      const supabase = await createClient();
      const membershipId = params.id;

      // Get the membership to update
      const { data: membership, error: membershipError } = await supabase
        .from("membership")
        .select("id, invitation_status, tenant_id, invited_email")
        .eq("id", membershipId)
        .eq("tenant_id", context.membership.tenant_id)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: "Membership not found" },
          { status: 404 }
        );
      }

      if (membership.invitation_status !== 'pending') {
        return NextResponse.json(
          { error: "Invitation is not pending" },
          { status: 400 }
        );
      }

      // For testing: Create a fake user record for this email to satisfy constraints
      const fakeUserId = `test-user-${membershipId}`;
      
      // First create a fake user record (if it doesn't exist)
      const { error: userError } = await supabase
        .from("user")
        .upsert({
          id: fakeUserId,
          email: membership.invited_email,
          full_name: membership.invited_email?.split('@')[0] || 'Test User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'email',
          ignoreDuplicates: true 
        });

      if (userError && userError.code !== '23505') { // Ignore duplicate key error
        console.error("Error creating test user:", userError);
      }

      // Update membership with user_id and accept status
      const { error: updateError } = await supabase
        .from("membership")
        .update({
          user_id: fakeUserId,
          invitation_status: 'accepted',
          accepted_at: new Date().toISOString(),
          invited_email: null // Clear this since we now have a user_id
        })
        .eq("id", membershipId);

      if (updateError) {
        console.error("Error accepting test invitation:", updateError);
        return NextResponse.json(
          { error: "Failed to accept invitation" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Test invitation accepted successfully",
        email: membership.invited_email
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}