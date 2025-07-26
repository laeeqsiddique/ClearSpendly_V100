import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get proper tenant ID
    const tenant_id = await getTenantIdWithFallback();

    // Get all receipts for this tenant
    const { data: receipts, error } = await supabase
      .from('receipt')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('receipt_date', { ascending: false })
      .limit(20);

    return NextResponse.json({
      tenant_id,
      receipts_count: receipts?.length || 0,
      receipts: receipts || [],
      error: error?.message || null
    });

  } catch (error) {
    console.error('Test receipts error:', error);
    return NextResponse.json(
      { error: "Failed to fetch receipts data" },
      { status: 500 }
    );
  }
}