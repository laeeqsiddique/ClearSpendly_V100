import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';

    // Use provided date range or default to current month
    const now = new Date();
    const currentPeriodStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const currentPeriodEnd = endDate ? new Date(endDate) : new Date();
    
    // Calculate comparison period (same duration, preceding the current period)
    const periodDuration = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1); // Day before current period
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDuration);

    // Get receipts for the selected period
    const { data: currentPeriodReceipts, error: currentError } = await supabase
      .from('receipt')
      .select('total_amount, vendor_id, receipt_date')
      .eq('tenant_id', defaultTenantId)
      .gte('receipt_date', currentPeriodStart.toISOString().split('T')[0])
      .lte('receipt_date', currentPeriodEnd.toISOString().split('T')[0]);

    if (currentError) {
      console.error('Error fetching current month receipts:', currentError);
      throw currentError;
    }

    // Get previous period receipts for comparison
    const { data: previousPeriodReceipts, error: previousError } = await supabase
      .from('receipt')
      .select('total_amount')
      .eq('tenant_id', defaultTenantId)
      .gte('receipt_date', previousPeriodStart.toISOString().split('T')[0])
      .lte('receipt_date', previousPeriodEnd.toISOString().split('T')[0]);

    if (previousError) {
      console.error('Error fetching previous month receipts:', previousError);
      throw previousError;
    }

    // Get receipt items for category breakdown
    const { data: receiptItems, error: itemsError } = await supabase
      .from('receipt_item')
      .select(`
        category,
        total_price,
        receipt!inner(receipt_date, tenant_id)
      `)
      .eq('receipt.tenant_id', defaultTenantId)
      .gte('receipt.receipt_date', currentPeriodStart.toISOString().split('T')[0])
      .lte('receipt.receipt_date', currentPeriodEnd.toISOString().split('T')[0]);

    if (itemsError) {
      console.error('Error fetching receipt items:', itemsError);
      throw itemsError;
    }

    // Calculate statistics
    const currentPeriodTotal = currentPeriodReceipts?.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0) || 0;
    const previousPeriodTotal = previousPeriodReceipts?.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0) || 0;
    
    const totalSpendingChange = previousPeriodTotal > 0 
      ? ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100 
      : 0;

    // Count unique vendors
    const uniqueVendorIds = new Set(currentPeriodReceipts?.map(r => r.vendor_id) || []);
    const uniqueVendors = uniqueVendorIds.size;
    
    // Get previous period vendor count for comparison
    const { data: previousPeriodVendors } = await supabase
      .from('receipt')
      .select('vendor_id')
      .eq('tenant_id', defaultTenantId)
      .gte('receipt_date', previousPeriodStart.toISOString().split('T')[0])
      .lte('receipt_date', previousPeriodEnd.toISOString().split('T')[0]);
    
    const previousUniqueVendors = new Set(previousPeriodVendors?.map(r => r.vendor_id) || []).size;
    const uniqueVendorsChange = previousUniqueVendors > 0 
      ? ((uniqueVendors - previousUniqueVendors) / previousUniqueVendors) * 100 
      : 0;

    // Count receipts processed
    const receiptsProcessed = currentPeriodReceipts?.length || 0;
    const previousReceiptsProcessed = previousPeriodReceipts?.length || 0;
    const receiptsProcessedChange = previousReceiptsProcessed > 0 
      ? ((receiptsProcessed - previousReceiptsProcessed) / previousReceiptsProcessed) * 100 
      : 0;

    // Category breakdown
    const categoryTotals = (receiptItems || []).reduce((acc, item) => {
      const category = item.category || 'Other';
      acc[category] = (acc[category] || 0) + (item.total_price || 0);
      return acc;
    }, {} as Record<string, number>);

    // Map to our expected categories
    const categorizedExpenses = {
      business: (categoryTotals['Professional Services'] || 0) + (categoryTotals['Equipment & Software'] || 0),
      personal: (categoryTotals['Other'] || 0) + (categoryTotals['Non-Categorized'] || 0),
      office: categoryTotals['Office Supplies'] || 0,
      travel: categoryTotals['Travel & Transportation'] || 0,
      meals: categoryTotals['Meals & Entertainment'] || 0,
    };

    const stats = {
      totalSpending: Math.round(currentPeriodTotal * 100) / 100,
      totalSpendingChange: Math.round(totalSpendingChange * 100) / 100,
      receiptsProcessed,
      receiptsProcessedChange: Math.round(receiptsProcessedChange * 100) / 100,
      uniqueVendors,
      uniqueVendorsChange: Math.round(uniqueVendorsChange * 100) / 100,
      priceAlerts: 0, // TODO: Implement price alerts
      categorizedExpenses: {
        business: Math.round(categorizedExpenses.business * 100) / 100,
        personal: Math.round(categorizedExpenses.personal * 100) / 100,
        office: Math.round(categorizedExpenses.office * 100) / 100,
        travel: Math.round(categorizedExpenses.travel * 100) / 100,
        meals: Math.round(categorizedExpenses.meals * 100) / 100,
      },
      monthlyTrend: totalSpendingChange > 5 ? 'up' : totalSpendingChange < -5 ? 'down' : 'stable'
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}