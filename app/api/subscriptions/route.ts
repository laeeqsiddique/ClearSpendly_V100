import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { SubscriptionFormData } from "@/lib/types/subscription";
import { generateSubscriptionExpenses } from "@/lib/services/subscription-expense-generator";

export const dynamic = 'force-dynamic';

// Deployment safety
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

// GET /api/subscriptions - Get all subscriptions for tenant
export async function GET(request: NextRequest) {
  // Mock response for build time
  if (isBuildTime) {
    return NextResponse.json({
      success: true,
      subscriptions: [],
      buildTime: true
    });
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key'
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

    const tenantId = membership.tenant_id;
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    
    let query = supabase
      .from('expense_subscription')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    }

    // Calculate summary statistics
    const summary = {
      total_monthly: 0,
      total_yearly: 0,
      active_count: 0,
      paused_count: 0,
      cancelled_count: 0,
      upcoming_charges: [] as any[]
    };

    subscriptions?.forEach(sub => {
      // Count by status
      if (sub.status === 'active') {
        summary.active_count++;
        
        // Calculate monthly equivalent
        let monthlyAmount = 0;
        switch (sub.frequency) {
          case 'weekly':
            monthlyAmount = sub.amount * 4.33; // Average weeks per month
            break;
          case 'monthly':
            monthlyAmount = sub.amount;
            break;
          case 'quarterly':
            monthlyAmount = sub.amount / 3;
            break;
          case 'yearly':
            monthlyAmount = sub.amount / 12;
            break;
        }
        summary.total_monthly += monthlyAmount;
        summary.total_yearly += monthlyAmount * 12;
        
        // Add to upcoming charges if within 30 days
        if (sub.next_charge_date) {
          const nextCharge = new Date(sub.next_charge_date);
          const today = new Date();
          const daysDiff = Math.ceil((nextCharge.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff <= 30) {
            summary.upcoming_charges.push({
              subscription_id: sub.id,
              service_name: sub.service_name,
              amount: sub.amount,
              charge_date: sub.next_charge_date
            });
          }
        }
      } else if (sub.status === 'paused') {
        summary.paused_count++;
      } else if (sub.status === 'cancelled') {
        summary.cancelled_count++;
      }
    });

    // Sort upcoming charges by date
    summary.upcoming_charges.sort((a, b) => 
      new Date(a.charge_date).getTime() - new Date(b.charge_date).getTime()
    );

    return NextResponse.json({ 
      subscriptions: subscriptions || [], 
      summary 
    });
  } catch (error) {
    console.error('Error in GET /api/subscriptions:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/subscriptions - Create new subscription
export async function POST(request: NextRequest) {
  // Mock response for build time
  if (isBuildTime) {
    return NextResponse.json({
      success: true,
      message: 'Build-time mock response - subscription creation disabled during build',
      buildTime: true
    });
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key'
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
    const body: SubscriptionFormData = await request.json();
    
    // Validate required fields
    if (!body.service_name || !body.amount || !body.frequency || !body.start_date) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }
    
    // Calculate next charge date
    const startDate = new Date(body.start_date);
    let nextChargeDate = new Date(startDate);
    
    switch (body.frequency) {
      case 'weekly':
        nextChargeDate.setDate(nextChargeDate.getDate() + 7);
        break;
      case 'monthly':
        nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextChargeDate.setMonth(nextChargeDate.getMonth() + 3);
        break;
      case 'yearly':
        nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
        break;
    }
    
    const { data: subscription, error } = await supabase
      .from('expense_subscription')
      .insert({
        tenant_id: tenantId,
        created_by: user.id,
        service_name: body.service_name,
        amount: body.amount,
        frequency: body.frequency,
        start_date: body.start_date,
        next_charge_date: nextChargeDate.toISOString().split('T')[0],
        notes: body.notes,
        payment_method: body.payment_method,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: "A subscription with this name already exists" 
        }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
    }

    // Generate historical expense entries for this subscription
    try {
      await generateSubscriptionExpenses(subscription, user.id, body.tag_ids);
    } catch (expenseError) {
      console.error('Error generating subscription expenses:', expenseError);
      // Don't fail the subscription creation, just log the error
      // The subscription was created successfully, expense generation is a bonus feature
    }

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/subscriptions:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}