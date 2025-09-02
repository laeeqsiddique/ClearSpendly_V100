import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = await createClient();

    // Use provided date range or default to this year
    const now = new Date();
    const currentPeriodStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
    const currentPeriodEnd = endDate ? new Date(endDate) : new Date();
    
    // Get user's tenant membership
    const { data: membership } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ 
        success: true, 
        data: {
          totalMiles: 0,
          totalDeduction: 0,
          tripsLogged: 0,
          topRoute: null,
          monthlyTrend: 'neutral',
          change: 0
        }
      });
    }

    // Query actual mileage data for the tenant
    const { data: mileageData, error } = await supabase
      .from('mileage_log')
      .select('miles, deduction_amount, from_address, to_address')
      .eq('tenant_id', membership.tenant_id)
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', currentPeriodEnd.toISOString().split('T')[0]);

    if (error) {
      console.error('Mileage query error:', error);
    }

    // Calculate stats from actual data
    const totalMiles = mileageData?.reduce((sum, trip) => sum + (trip.miles || 0), 0) || 0;
    const totalDeduction = mileageData?.reduce((sum, trip) => sum + (trip.deduction_amount || 0), 0) || 0;
    const tripsLogged = mileageData?.length || 0;

    const stats = {
      totalMiles: Math.round(totalMiles * 10) / 10,
      totalDeduction: Math.round(totalDeduction * 100) / 100,
      tripsLogged,
      topRoute: tripsLogged > 0 ? `${mileageData[0]?.from_address || 'Unknown'} to ${mileageData[0]?.to_address || 'Unknown'}` : null,
      monthlyTrend: 'neutral',
      change: 0
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Mileage stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mileage statistics" },
      { status: 500 }
    );
  }
}