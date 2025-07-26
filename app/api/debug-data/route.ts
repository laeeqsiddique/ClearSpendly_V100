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
    const tenantId = await getTenantIdWithFallback();
    
    // Check current user and membership
    const { data: membership } = await supabase
      .from('membership')
      .select('tenant_id, user_id')
      .eq('user_id', user.id)
      .single();

    // Get all receipts in the database (any tenant)
    const { data: allReceipts } = await supabase
      .from('receipt')
      .select('id, tenant_id, total_amount, receipt_date')
      .order('receipt_date', { ascending: false })
      .limit(10);

    // Get all tenants that have receipts
    const { data: receiptsByTenant } = await supabase
      .from('receipt')
      .select('tenant_id')
      .not('tenant_id', 'is', null);

    const tenantIds = [...new Set(receiptsByTenant?.map(r => r.tenant_id))];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      membership: membership,
      allReceipts: allReceipts || [],
      tenantIds: tenantIds || [],
      currentTenantId: tenantId
    });

  } catch (error) {
    console.error('Debug data error:', error);
    return NextResponse.json(
      { error: "Failed to fetch debug data", details: error.message },
      { status: 500 }
    );
  }
}