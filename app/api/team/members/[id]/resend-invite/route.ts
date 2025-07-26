import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/user-context";
import { teamInvitationService } from "@/lib/team-invitation-service";
import { nanoid } from "nanoid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userContext = await requireUserContext();
    const supabase = await createClient();
    
    const { id: membershipId } = await params;

    // Check if current user can resend invites (owner or admin)
    if (!['owner', 'admin'].includes(userContext.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to resend invitations" },
        { status: 403 }
      );
    }

    // Get target membership
    const { data: targetMembership, error: membershipError } = await supabase
      .from("membership")
      .select(`
        id, 
        role, 
        tenant_id, 
        invitation_status, 
        invited_at,
        invited_email,
        user:user_id (
          email,
          full_name
        )
      `)
      .eq("id", membershipId)
      .single();

    if (membershipError || !targetMembership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Verify membership is in same tenant
    if (targetMembership.tenant_id !== userContext.tenantId) {
      return NextResponse.json(
        { error: "Member not found in your team" },
        { status: 404 }
      );
    }

    // Check if invitation is pending
    if (targetMembership.invitation_status !== 'pending') {
      return NextResponse.json(
        { error: "Can only resend pending invitations" },
        { status: 400 }
      );
    }

    // Generate new invitation token and expiry
    const invitationToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Update invitation timestamp and token
    const { data: updatedMembership, error: updateError } = await supabase
      .from("membership")
      .update({ 
        invited_at: new Date().toISOString(),
        invited_by: userContext.userId,
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", membershipId)
      .select(`
        id,
        role,
        invited_at,
        invitation_expires_at,
        invited_email,
        user:user_id (
          email,
          full_name
        )
      `)
      .single();

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to resend invitation" },
        { status: 500 }
      );
    }

    // Get inviter details for email
    const { data: inviterData, error: inviterError } = await supabase
      .from("user")
      .select("full_name, email")
      .eq("id", userContext.userId)
      .single();

    const inviterName = inviterData?.full_name || inviterData?.email || "Team Member";
    const inviterEmail = inviterData?.email || "";

    // Construct invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/accept-invitation?token=${invitationToken}`;

    // Determine email address and name for the invitation
    const inviteeEmail = updatedMembership.user?.email || updatedMembership.invited_email || "";
    const inviteeName = updatedMembership.user?.full_name || 
                       updatedMembership.user?.email?.split('@')[0] || 
                       updatedMembership.invited_email?.split('@')[0] || 
                       "Team Member";

    // Send invitation email
    const emailResult = await teamInvitationService.sendTeamInvitation({
      inviterName,
      inviterEmail,
      inviteeName,
      inviteeEmail,
      role: updatedMembership.role,
      companyName: "Your Team", // TODO: Get actual company name from tenant
      invitationToken,
      invitationUrl,
      expiresAt: expiresAt.toISOString()
    });

    if (!emailResult.success) {
      console.error("Failed to resend invitation email:", emailResult.error);
      // Don't fail the invitation update, just log the error
    }

    return NextResponse.json({
      message: emailResult.success ? "Invitation resent successfully" : "Invitation updated but email failed to send",
      invitation: {
        id: updatedMembership.id,
        email: inviteeEmail,
        role: updatedMembership.role,
        invited_at: updatedMembership.invited_at,
        expires_at: updatedMembership.invitation_expires_at,
        email_sent: emailResult.success
      }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}