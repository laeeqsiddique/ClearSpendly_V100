import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/user-context";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userContext = await requireUserContext();
    const supabase = await createClient();
    
    const { role } = await request.json();
    const { id: membershipId } = await params;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
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

    // Check if current user can change roles (owner or admin)
    if (!['owner', 'admin'].includes(userContext.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to change member roles" },
        { status: 403 }
      );
    }

    // Get target membership
    const { data: targetMembership, error: membershipError } = await supabase
      .from("membership")
      .select("id, role, tenant_id, user:user_id(email)")
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

    // Prevent changing owner role
    if (targetMembership.role === 'owner') {
      return NextResponse.json(
        { error: "Cannot change owner role" },
        { status: 403 }
      );
    }

    // Prevent non-owners from making admins
    if (role === 'admin' && userContext.role !== 'owner') {
      return NextResponse.json(
        { error: "Only owners can assign admin roles" },
        { status: 403 }
      );
    }

    // Update membership role
    const { data: updatedMembership, error: updateError } = await supabase
      .from("membership")
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq("id", membershipId)
      .select("id, role, user:user_id(email)")
      .single();

    if (updateError) {
      console.error("Error updating member role:", updateError);
      return NextResponse.json(
        { error: "Failed to update member role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Member role updated successfully",
      member: {
        id: updatedMembership.id,
        email: updatedMembership.user.email,
        role: updatedMembership.role
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userContext = await requireUserContext();
    const supabase = await createClient();
    
    const { id: membershipId } = await params;

    // Check if current user can remove members (owner or admin)
    if (!['owner', 'admin'].includes(userContext.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to remove members" },
        { status: 403 }
      );
    }

    // Get target membership
    const { data: targetMembership, error: membershipError } = await supabase
      .from("membership")
      .select("id, role, tenant_id, user_id, invitation_status")
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

    // Prevent removing owner
    if (targetMembership.role === 'owner') {
      return NextResponse.json(
        { error: "Cannot remove team owner" },
        { status: 403 }
      );
    }

    // Prevent self-removal
    if (targetMembership.user_id === userContext.userId) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the team" },
        { status: 403 }
      );
    }

    // Remove the membership
    const { error: removeError } = await supabase
      .from("membership")
      .delete()
      .eq("id", membershipId);

    if (removeError) {
      console.error("Error removing member:", removeError);
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    const message = targetMembership.invitation_status === 'pending' 
      ? "Invitation cancelled successfully" 
      : "Member removed successfully";

    return NextResponse.json({
      message
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}