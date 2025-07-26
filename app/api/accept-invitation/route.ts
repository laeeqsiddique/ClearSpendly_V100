import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find invitation by token in membership table
    const { data: invitation, error: inviteError } = await supabase
      .from("membership")
      .select("id, invited_email, role, tenant_id, invitation_status, invitation_expires_at, invited_by")
      .eq("invitation_token", token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (invitation.invitation_expires_at && new Date(invitation.invitation_expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("membership")
        .update({ invitation_status: 'expired' })
        .eq("id", invitation.id);

      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Check if invitation is still pending
    if (invitation.invitation_status !== 'pending') {
      return NextResponse.json(
        { error: "This invitation is no longer valid" },
        { status: 400 }
      );
    }

    // Get inviter details for display
    const { data: inviterData } = await supabase
      .from("user")
      .select("full_name, email")
      .eq("id", invitation.invited_by)
      .single();

    const inviterName = inviterData?.full_name || inviterData?.email || "Team Member";

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.invited_email,
        role: invitation.role,
        inviter_name: inviterName,
        expires_at: invitation.invitation_expires_at
      }
    });

  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, user_id } = await request.json();

    if (!token || !user_id) {
      return NextResponse.json(
        { error: "Token and user_id are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find invitation by token in membership table
    const { data: invitation, error: inviteError } = await supabase
      .from("membership")
      .select("id, invited_email, role, tenant_id, invitation_status, invitation_expires_at")
      .eq("invitation_token", token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (invitation.invitation_expires_at && new Date(invitation.invitation_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Check if invitation is still pending
    if (invitation.invitation_status !== 'pending') {
      return NextResponse.json(
        { error: "This invitation is no longer valid" },
        { status: 400 }
      );
    }

    // Update the invitation record to mark as accepted
    const { error: updateError } = await supabase
      .from("membership")
      .update({
        invitation_status: 'accepted',
        accepted_at: new Date().toISOString(),
        invitation_token: null, // Clear the token
        invitation_expires_at: null // Clear the expiry
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Error accepting invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to accept invitation" },
        { status: 500 }
      );
    }

    // TODO: Here you might want to create or update the actual user record
    // and set up their tenant association
    
    return NextResponse.json({
      message: "Invitation accepted successfully",
      tenant_id: invitation.tenant_id,
      role: invitation.role
    });

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}