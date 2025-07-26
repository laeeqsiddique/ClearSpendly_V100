import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-middleware";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, context) => {
    try {
      const { email, role = 'member' } = await req.json();
      
      if (!email?.trim()) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }

      const supabase = await createClient();
      const cleanEmail = email.trim();
      
      // Create a test user ID using proper UUID format
      const testUserId = randomUUID();
      
      // For testing, we'll skip creating a user record and just create the membership
      // In production, users would be created through Supabase Auth
      console.log("Skipping user creation for test - creating membership only");

      // Create pending membership first (this satisfies the constraint)
      const { data: membership, error: membershipError } = await supabase
        .from("membership")
        .insert({
          tenant_id: context.membership.tenant_id,
          role,
          invitation_status: 'pending', // Start as pending to satisfy constraint
          invited_by: context.user.id,
          invited_email: cleanEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (membershipError) {
        console.error("Error creating test membership:", membershipError);
        return NextResponse.json(
          { error: "Failed to create test membership" },
          { status: 500 }
        );
      }

      // For testing purposes, we'll just create as pending
      // The UI will show it as pending but we can modify the detection logic
      return NextResponse.json({
        message: "Test user created as pending (use existing ✓ Test Accept button to accept)",
        member: {
          id: membership.id,
          email: cleanEmail,
          role: membership.role,
          invitation_status: 'pending'
        }
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