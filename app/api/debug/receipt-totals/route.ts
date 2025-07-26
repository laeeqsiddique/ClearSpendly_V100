import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback();

    // Get all receipts with their totals
    const { data: receipts, error: receiptError } = await supabase
      .from('receipt')
      .select('id, receipt_date, total_amount, vendor(name)')
      .eq('tenant_id', tenantId)
      .order('receipt_date', { ascending: false });

    const receiptTotal = receipts?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;

    // Get all receipt items with their totals
    const { data: items, error: itemError } = await supabase
      .from('receipt_item')
      .select(`
        id,
        total_price,
        receipt!inner(
          id,
          receipt_date,
          tenant_id
        )
      `)
      .eq('receipt.tenant_id', tenantId);

    const itemTotal = items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

    // Check for receipts without items
    const receiptIds = new Set(receipts?.map(r => r.id) || []);
    const itemReceiptIds = new Set(items?.map(i => i.receipt.id) || []);
    const receiptsWithoutItems = Array.from(receiptIds).filter(id => !itemReceiptIds.has(id));

    // Get details of receipts without items
    const receiptsWithoutItemsDetails = receipts?.filter(r => receiptsWithoutItems.includes(r.id)) || [];
    const totalWithoutItems = receiptsWithoutItemsDetails.reduce((sum, r) => sum + (r.total_amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        receiptCount: receipts?.length || 0,
        receiptTotal: Math.round(receiptTotal * 100) / 100,
        itemCount: items?.length || 0,
        itemTotal: Math.round(itemTotal * 100) / 100,
        difference: Math.round((receiptTotal - itemTotal) * 100) / 100,
        receiptsWithoutItems: {
          count: receiptsWithoutItems.length,
          total: Math.round(totalWithoutItems * 100) / 100,
          details: receiptsWithoutItemsDetails.map(r => ({
            id: r.id,
            date: r.receipt_date,
            amount: r.total_amount,
            vendor: r.vendor?.name || 'Unknown'
          }))
        }
      }
    });
  } catch (error) {
    console.error("Debug receipt totals error:", error);
    return NextResponse.json(
      { error: "Failed to debug receipt totals", details: error },
      { status: 500 }
    );
  }
}