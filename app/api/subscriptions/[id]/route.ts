import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { updateSubscriptionExpenses, deleteSubscriptionExpenses } from "@/lib/services/subscription-expense-generator";

export const dynamic = 'force-dynamic';

// PATCH /api/subscriptions/[id] - Update subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "No tenant access found" }, { status: 403 });
    }

    // Check permissions
    if (!['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const tenantId = membership.tenant_id;
    const body = await request.json();
    
    // Get the original subscription for comparison
    const { data: originalSubscription } = await supabase
      .from('expense_subscription')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    // Update subscription
    const { data: subscription, error } = await supabase
      .from('expense_subscription')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Update related expense entries
    if (originalSubscription) {
      try {
        await updateSubscriptionExpenses(subscription, originalSubscription, user.id, body.tag_ids);
      } catch (expenseError) {
        console.error('Error updating subscription expenses:', expenseError);
        // Don't fail the subscription update, just log the error
      }
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error in PATCH /api/subscriptions/[id]:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/subscriptions/[id] - Delete subscription permanently
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "No tenant access found" }, { status: 403 });
    }

    // Check permissions (admin/owner for delete)
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const tenantId = membership.tenant_id;
    
    // Delete related expense entries first
    try {
      await deleteSubscriptionExpenses(id);
    } catch (expenseError) {
      console.error('Error deleting subscription expenses:', expenseError);
      // Continue with subscription deletion even if expense cleanup fails
    }

    // Hard delete - permanently remove the subscription
    const { data: subscription, error } = await supabase
      .from('expense_subscription')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting subscription:', error);
      return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error('Error in DELETE /api/subscriptions/[id]:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}