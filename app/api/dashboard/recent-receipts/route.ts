import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback(req);

    // Fetch recent receipts with vendor information
    const { data: receipts, error } = await supabase
      .from('receipt')
      .select(`
        id,
        receipt_date,
        total_amount,
        tax_amount,
        status,
        created_at,
        vendor:vendor_id (
          id,
          name,
          category
        ),
        receipt_items:receipt_item (
          id
        )
      `)
      .eq('tenant_id', tenantId)
      .order('receipt_date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
    }

    // Transform the data for the frontend
    const transformedReceipts = receipts?.map(receipt => ({
      id: receipt.id,
      vendor: receipt.vendor?.name || 'Unknown Vendor',
      date: receipt.receipt_date,
      amount: receipt.total_amount,
      category: receipt.vendor?.category || 'Other',
      status: receipt.status || 'processed',
      items: receipt.receipt_items?.length || 0
    })) || [];

    // Calculate totals
    const totalAmount = transformedReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const totalReceipts = transformedReceipts.length;
    const uniqueVendors = new Set(transformedReceipts.map(r => r.vendor)).size;

    return NextResponse.json({
      receipts: transformedReceipts,
      stats: {
        totalAmount,
        totalReceipts,
        uniqueVendors
      }
    });
  } catch (error) {
    console.error('Dashboard receipts error:', error);
    return NextResponse.json(
      { error: 'Failed to load receipts' },
      { status: 500 }
    );
  }
}