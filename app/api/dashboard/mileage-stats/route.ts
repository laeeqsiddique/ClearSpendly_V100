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
    
    // Mock data for now - replace with actual mileage queries when table exists
    const stats = {
      totalMiles: 1247,
      totalDeduction: 697.15, // miles * IRS rate
      tripsLogged: 23,
      topRoute: "Office to Client Site",
      monthlyTrend: 'up',
      change: 15.3
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