import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";

const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

export const dynamic = 'force-dynamic';

function createBuildSafeSupabaseClient() {
  if (isBuildTime) {
    return {
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: [], error: null }),
        update: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
        single: () => ({ data: null, error: null }),
        rpc: () => ({ data: null, error: null }),
      })
    };
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

// GET /api/subscriptions/charges - List subscription charges
export async function GET(req: NextRequest) {
  try {
    if (isBuildTime) {
      return NextResponse.json({ data: [], error: null });
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

    // Parse query parameters
    const url = new URL(req.url);
    const subscriptionId = url.searchParams.get('subscription_id');
    const status = url.searchParams.get('status');
    const fromDate = url.searchParams.get('from_date');
    const toDate = url.searchParams.get('to_date');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0;

    // Build query
    let query = supabase
      .from('subscription_charge')
      .select(`
        *,
        subscription:subscription_id (
          id,
          name,
          vendor:vendor_id (
            id,
            name
          )
        ),
        receipt:receipt_id (
          id,
          receipt_number,
          receipt_date
        )
      `)
      .eq('tenant_id', membership.tenant_id)
      .order('charge_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (subscriptionId) {
      query = query.eq('subscription_id', subscriptionId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (fromDate) {
      query = query.gte('charge_date', fromDate);
    }
    if (toDate) {
      query = query.lte('charge_date', toDate);
    }

    const { data: charges, error: chargesError } = await query;

    if (chargesError) {
      console.error('Error fetching subscription charges:', chargesError);
      return NextResponse.json(
        { error: "Failed to fetch subscription charges" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: charges,
      pagination: {
        limit,
        offset,
        count: charges?.length || 0
      }
    });

  } catch (error) {
    console.error("Subscription charges GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription charges" },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions/charges/process - Process pending charges (Admin/system endpoint)
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

    // Check permissions (only admin/owner can process charges)
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Call the database function to process charges
    const { data: result, error: processError } = await supabase
      .rpc('process_subscription_charges');

    if (processError) {
      console.error('Error processing subscription charges:', processError);
      return NextResponse.json(
        { error: "Failed to process subscription charges" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        processed_count: result
      },
      message: `Successfully processed ${result} subscription charges`,
    });

  } catch (error) {
    console.error("Subscription charge processing error:", error);
    return NextResponse.json(
      { error: "Failed to process subscription charges" },
      { status: 500 }
    );
  }
}