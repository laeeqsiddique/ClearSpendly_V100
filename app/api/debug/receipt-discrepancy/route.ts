import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const defaultTenantId = '00000000-0000-0000-0000-000000000001';

    // Get all receipts with their items
    const { data: receipts, error } = await supabase
      .from('receipt')
      .select(`
        id,
        receipt_date,
        total_amount,
        tax_amount,
        vendor(name),
        receipt_item(
          id,
          total_price
        )
      `)
      .eq('tenant_id', defaultTenantId)
      .order('receipt_date', { ascending: false });

    if (error) throw error;

    // Find receipts where item sum doesn't match receipt total
    const discrepancies = receipts?.map(receipt => {
      const itemSum = receipt.receipt_item?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
      const difference = receipt.total_amount - itemSum;
      
      return {
        id: receipt.id,
        date: receipt.receipt_date,
        vendor: receipt.vendor?.name || 'Unknown',
        receiptTotal: receipt.total_amount,
        taxAmount: receipt.tax_amount,
        itemCount: receipt.receipt_item?.length || 0,
        itemSum: Math.round(itemSum * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        hasDiscrepancy: Math.abs(difference) > 0.01
      };
    }).filter(r => r.hasDiscrepancy) || [];

    const totalDiscrepancy = discrepancies.reduce((sum, r) => sum + r.difference, 0);

    return NextResponse.json({
      success: true,
      data: {
        discrepancyCount: discrepancies.length,
        totalDiscrepancy: Math.round(totalDiscrepancy * 100) / 100,
        receiptsWithDiscrepancy: discrepancies
      }
    });
  } catch (error) {
    console.error("Debug receipt discrepancy error:", error);
    return NextResponse.json(
      { error: "Failed to debug receipt discrepancy", details: error },
      { status: 500 }
    );
  }
}