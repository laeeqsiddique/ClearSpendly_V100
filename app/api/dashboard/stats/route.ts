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

    // Get receipt items for category breakdown - simplified query
    let receiptItems: any[] = [];
    try {
      const { data, error: itemsError } = await supabase
        .from('receipt_item')
        .select('category, total_price, receipt_id')
        .not('receipt_id', 'is', null);

      if (itemsError) {
        console.log('Receipt items query failed, using empty data:', itemsError);
      } else {
        receiptItems = data || [];
      }
    } catch (error) {
      console.log('Receipt items table not available yet, using empty data');
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

    // Simplified tag breakdown - use basic queries that are more likely to work
    let tagBreakdown: any[] = [];
    let receiptTags: any[] = [];
    
    try {
      // Try to get tags, but don't fail if tables don't exist yet
      const { data: tagData } = await supabase
        .from('receipt_item_tag')
        .select('*')
        .limit(1);
      
      if (tagData !== null) {
        // Table exists, proceed with actual query
        const { data } = await supabase
          .from('receipt_item_tag')
          .select(`
            receipt_item(
              total_price,
              receipt(
                id,
                receipt_date,
                tenant_id
              )
            ),
            tag(
              id,
              name
            )
          `)
          .eq('tenant_id', defaultTenantId);
        tagBreakdown = data || [];
      }
    } catch (error) {
      console.log('Tags table not available yet, using empty data');
    }
    
    try {
      const { data: receiptTagData } = await supabase
        .from('receipt_tag')
        .select('*')
        .limit(1);
        
      if (receiptTagData !== null) {
        const { data } = await supabase
          .from('receipt_tag')
          .select(`
            receipt(
              id,
              receipt_date,
              total_amount,
              tenant_id
            ),
            tag(
              id,
              name
            )
          `)
          .eq('tenant_id', defaultTenantId);
        receiptTags = data || [];
      }
    } catch (error) {
      console.log('Receipt tags table not available yet, using empty data');
    }

    // Calculate top categories
    const categoryTotals = new Map<string, { name: string; amount: number }>();
    const receiptsWithItemTags = new Set<string>();

    // Process line item tags with safe access
    (tagBreakdown || []).forEach((item: any) => {
      try {
        const tagName = item?.tag?.name;
        const amount = item?.receipt_item?.total_price || 0;
        const receiptId = item?.receipt_item?.receipt?.id;
        
        if (tagName && receiptId) {
          receiptsWithItemTags.add(receiptId);
          
          if (!categoryTotals.has(tagName)) {
            categoryTotals.set(tagName, { name: tagName, amount: 0 });
          }
          categoryTotals.get(tagName)!.amount += amount;
        }
      } catch (error) {
        console.log('Error processing tag item:', error);
      }
    });

    // Process receipt-level tags (only for receipts without line item tags)
    (receiptTags || []).forEach((receiptTag: any) => {
      try {
        const receiptId = receiptTag?.receipt?.id;
        if (receiptId && !receiptsWithItemTags.has(receiptId)) {
          const tagName = receiptTag?.tag?.name;
          const amount = receiptTag?.receipt?.total_amount || 0;
          
          if (tagName) {
            if (!categoryTotals.has(tagName)) {
              categoryTotals.set(tagName, { name: tagName, amount: 0 });
            }
            categoryTotals.get(tagName)!.amount += amount;
          }
        }
      } catch (error) {
        console.log('Error processing receipt tag:', error);
      }
    });

    // Get top 2 categories
    const topCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 2);

    // Calculate tag coverage
    const taggedAmount = Array.from(categoryTotals.values())
      .reduce((sum, cat) => sum + cat.amount, 0);
    const tagCoverage = currentPeriodTotal > 0 
      ? Math.round((taggedAmount / currentPeriodTotal) * 100) 
      : 0;

    // Get receipts with and without tags  
    const receiptsWithTagsIds = new Set([...receiptsWithItemTags]);
    (receiptTags || []).forEach((rt: any) => receiptsWithTagsIds.add(rt.receipt.id));
    
    const receiptsFullyTagged = receiptsWithTagsIds.size;
    const receiptsNeedReview = receiptsProcessed - receiptsFullyTagged;

    // Get vendor breakdown - simplified to avoid join issues
    const vendorCounts = new Map<string, number>();
    let topVendors: Array<{ name: string; count: number }> = [];
    
    try {
      const { data: vendors } = await supabase
        .from('receipt')
        .select('vendor_id')
        .eq('tenant_id', defaultTenantId)
        .gte('receipt_date', currentPeriodStart.toISOString().split('T')[0])
        .lte('receipt_date', currentPeriodEnd.toISOString().split('T')[0]);

      if (vendors && vendors.length > 0) {
        // Count vendor occurrences
        vendors.forEach((receipt: any) => {
          const vendorId = receipt.vendor_id;
          if (vendorId) {
            vendorCounts.set(vendorId, (vendorCounts.get(vendorId) || 0) + 1);
          }
        });

        // Get vendor names for top vendors
        const topVendorIds = Array.from(vendorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([id, count]) => ({ id, count }));

        if (topVendorIds.length > 0) {
          const { data: vendorDetails } = await supabase
            .from('vendor')
            .select('id, name')
            .in('id', topVendorIds.map(v => v.id));

          topVendors = topVendorIds.map(vendor => {
            const detail = vendorDetails?.find(v => v.id === vendor.id);
            return {
              name: detail?.name || 'Unknown Vendor',
              count: vendor.count
            };
          });
        }
      }
    } catch (error) {
      console.log('Vendor query failed, using empty data:', error);
    }

    const stats = {
      totalSpending: Math.round(currentPeriodTotal * 100) / 100,
      totalSpendingChange: Math.round(totalSpendingChange * 100) / 100,
      receiptsProcessed,
      receiptsProcessedChange: Math.round(receiptsProcessedChange * 100) / 100,
      uniqueVendors,
      uniqueVendorsChange: Math.round(uniqueVendorsChange * 100) / 100,
      priceAlerts: 0, // TODO: Implement price alerts
      monthlyTrend: totalSpendingChange > 5 ? 'up' : totalSpendingChange < -5 ? 'down' : 'stable',
      // New fields for meaningful card footers
      topCategories,
      tagCoverage,
      unaccountedAmount: Math.round((currentPeriodTotal - taggedAmount) * 100) / 100,
      receiptsFullyTagged,
      receiptsNeedReview,
      topVendors,
      previousPeriodTotal: Math.round(previousPeriodTotal * 100) / 100,
      // Keep old structure for compatibility
      categorizedExpenses: {
        business: 0,
        personal: 0,
        office: 0,
        travel: 0,
        meals: 0,
      }
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