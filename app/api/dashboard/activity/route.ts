import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const tenantId = await getTenantIdWithFallback(req);

    // Build query with date filters
    let query = supabase
      .from('receipt')
      .select(`
        id,
        total_amount,
        receipt_date,
        ocr_confidence,
        ocr_status,
        created_at,
        vendor!inner(name)
      `)
      .eq('tenant_id', tenantId);
    
    if (startDate) {
      query = query.gte('receipt_date', startDate);
    }
    if (endDate) {
      query = query.lte('receipt_date', endDate);
    }
    
    const { data: receipts, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }

    // Get receipt items for the recent receipts to determine categories
    const receiptIds = receipts?.map(r => r.id) || [];
    const { data: receiptItems } = await supabase
      .from('receipt_item')
      .select('receipt_id, category')
      .in('receipt_id', receiptIds);

    // Create a map of receipt_id to primary category
    const receiptCategories = (receiptItems || []).reduce((acc, item) => {
      if (!acc[item.receipt_id]) {
        acc[item.receipt_id] = item.category || 'Other';
      }
      return acc;
    }, {} as Record<string, string>);

    // Transform receipts into activity format
    const activities = (receipts || []).map(receipt => ({
      id: receipt.id,
      type: 'upload' as const,
      title: 'Receipt processed',
      description: `${receipt.vendor.name} receipt processed and categorized`,
      timestamp: new Date(receipt.created_at),
      amount: receipt.total_amount,
      vendor: receipt.vendor.name,
      category: receiptCategories[receipt.id] || 'Other',
      status: receipt.ocr_status === 'processed' ? 'completed' as const : 'pending' as const,
      metadata: {
        confidence: Math.round((receipt.ocr_confidence || 0.75) * 100), // Convert back to percentage
        processingTime: 2.5, // Mock processing time
        ocrMethod: 'browser' as const
      }
    }));

    return NextResponse.json({ success: true, data: activities });
  } catch (error) {
    console.error("Recent activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activity" },
      { status: 500 }
    );
  }
}