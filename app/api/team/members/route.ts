import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { teamInvitationService } from "@/lib/team-invitation-service";
import { nanoid } from "nanoid";
import { withPermission } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  return withPermission('team:view')(request, async (req, context) => {
    try {
      const supabase = await createClient();

      // Get all team members for this tenant through membership table
      const { data: memberships, error } = await supabase
        .from("membership")
      .select(`
        id,
        role,
        invitation_status,
        invited_at,
        accepted_at,
        invited_by,
        invited_email,
        user:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("tenant_id", context.context.membership.tenant_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching team members:", error);
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    // Transform data to match component interface
    const transformedMembers = memberships?.map(membership => {
      // Handle pending invitations without user records
      if (!membership.user && membership.invitation_status === 'pending') {
        return {
          id: membership.id,
          user: {
            id: `pending-${membership.id}`,
            email: membership.invited_email || '',
            full_name: membership.invited_email?.split('@')[0] || 'Pending User',
            avatar_url: null
          },
          role: membership.role,
          invitation_status: membership.invitation_status,
          invited_at: membership.invited_at,
          accepted_at: membership.accepted_at,
          invited_by: membership.invited_by
        };
      }

      return {
        id: membership.id,
        user: {
          id: membership.user?.id || '',
          email: membership.user?.email || membership.invited_email || '',
          full_name: membership.user?.full_name || '',
          avatar_url: membership.user?.avatar_url || null
        },
        role: membership.role,
        invitation_status: membership.invitation_status || 'accepted',
        invited_at: membership.invited_at,
        accepted_at: membership.accepted_at,
        invited_by: membership.invited_by
      };
    }) || [];

    return NextResponse.json({ members: transformedMembers });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
  });
}

export async function POST(request: NextRequest) {
  return withPermission('team:invite')(request, async (req, context) => {
    try {
      const supabase = await createClient();
    
    const { email: rawEmail, role } = await request.json();
    const email = rawEmail?.trim().replace(/[\r\n\t]/g, '');

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['viewer', 'member', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if current user has permission to invite team members
    const { hasPermission } = await import('@/lib/permissions-server');
    const canInvite = await hasPermission(context.user.id, context.membership.tenant_id, 'team:invite');
    
    if (!canInvite) {
      return NextResponse.json(
        { error: "Insufficient permissions to invite members" },
        { status: 403 }
      );
    }

    // Check if user already exists in the system
    const { data: existingUser } = await supabase
      .from("user")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      // Check if already a member of this tenant
      const { data: existingMembership } = await supabase
        .from("membership")
        .select("id, invitation_status")
        .eq("tenant_id", context.context.membership.tenant_id)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMembership) {
        if (existingMembership.invitation_status === 'pending') {
          return NextResponse.json(
            { error: "User already has a pending invitation" },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { error: "User is already a member of this team" },
            { status: 409 }
          );
        }
      }
    }

    // Generate invitation token and expiry
    const invitationToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create membership record with invitation
    // If user exists, link to them. Otherwise, store email for later
    const membershipData: any = {
      tenant_id: context.membership.tenant_id,
      role,
      invitation_status: 'pending',
      invited_at: new Date().toISOString(),
      invited_by: context.user.id,
      invitation_token: invitationToken,
      invitation_expires_at: expiresAt.toISOString(),
      invited_email: email // Store email for pending invitations
    };

    // Only set user_id if the user exists
    if (existingUser) {
      membershipData.user_id = existingUser.id;
    }

    const { data: invitation, error: inviteError } = await supabase
      .from("membership")
      .insert(membershipData)
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // Get inviter details for email
    const { data: inviterData, error: inviterError } = await supabase
      .from("user")
      .select("full_name, email")
      .eq("id", context.user.id)
      .single();

    const inviterName = (inviterData?.full_name || inviterData?.email || "Team Member").replace(/[\r\n\t]/g, ' ').trim();
    const inviterEmail = (inviterData?.email || "").replace(/[\r\n\t]/g, ' ').trim();

    // Get tenant name
    const { data: tenantData } = await supabase
      .from("tenant")
      .select("name")
      .eq("id", context.membership.tenant_id)
      .single();

    const companyName = (tenantData?.name || "Flowvya Team").replace(/[\r\n\t]/g, ' ').trim();

    // Construct invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/accept-invitation?token=${invitationToken}`;

    // Send invitation email
    const emailResult = await teamInvitationService.sendTeamInvitation({
      inviterName,
      inviterEmail,
      inviteeName: email.split('@')[0], // Use email prefix as default name
      inviteeEmail: email,
      role,
      companyName,
      invitationToken,
      invitationUrl,
      expiresAt: expiresAt.toISOString()
    });

    if (!emailResult.success) {
      console.error("Failed to send invitation email:", emailResult.error);
      // Don't fail the invitation creation, just log the error
    }

    return NextResponse.json(
      { 
        message: emailResult.success ? "Invitation sent successfully" : "Invitation created but email failed to send",
        invitation: {
          id: invitation.id,
          email: email,
          role: invitation.role,
          invited_at: invitation.invited_at,
          expires_at: invitation.invitation_expires_at,
          email_sent: emailResult.success
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
  });
}