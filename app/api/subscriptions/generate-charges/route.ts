import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";

const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

export const dynamic = 'force-dynamic';

function createBuildSafeSupabaseClient() {
  if (isBuildTime) {
    return {
      rpc: () => ({ data: null, error: null }),
      from: () => ({
        select: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
        single: () => ({ data: null, error: null }),
      })
    };
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

// POST /api/subscriptions/generate-charges - Generate upcoming charges for active subscriptions
export async function POST(req: NextRequest) {
  try {
    if (isBuildTime) {
      return NextResponse.json({ data: null, error: null });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createBuildSafeSupabaseClient();

    // Get user's tenant
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "No tenant access found" }, { status: 403 });
    }

    // Check permissions (only admin/owner can generate charges)
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { days_ahead = 30 } = body;

    // Validate days_ahead parameter
    if (days_ahead < 1 || days_ahead > 365) {
      return NextResponse.json(
        { error: "days_ahead must be between 1 and 365" },
        { status: 400 }
      );
    }

    // Call the database function to generate upcoming charges
    const { data: result, error: generateError } = await supabase
      .rpc('generate_upcoming_charges', { days_ahead });

    if (generateError) {
      console.error('Error generating subscription charges:', generateError);
      return NextResponse.json(
        { error: "Failed to generate subscription charges" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        generated_count: result,
        days_ahead
      },
      message: `Successfully generated ${result} upcoming subscription charges for the next ${days_ahead} days`,
    });

  } catch (error) {
    console.error("Subscription charge generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate subscription charges" },
      { status: 500 }
    );
  }
}