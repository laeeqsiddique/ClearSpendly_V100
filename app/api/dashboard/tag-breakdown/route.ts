import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    console.log('Tag breakdown API called with:', { startDate, endDate });
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback(req);

    // First, check if we have any tagged items at all
    const { data: taggedItemsCheck, error: checkError } = await supabase
      .from('receipt_item_tag')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    console.log('Tagged items check:', { checkError, hasData: taggedItemsCheck?.length > 0 });

    if (checkError) {
      console.error('Error checking for tagged items:', checkError);
      throw checkError;
    }

    if (!taggedItemsCheck || taggedItemsCheck.length === 0) {
      console.log('No tagged items found, returning empty data');
      return NextResponse.json({ 
        success: true, 
        data: {
          totalAmount: 0,
          categories: [],
          monthlyComparison: {
            currentMonth: 0,
            previousMonth: 0,
            change: 0
          }
        }
      });
    }

    // Build query to get receipt items with their tags and tag categories
    let itemTagQuery = supabase
      .from('receipt_item_tag')
      .select(`
        receipt_item!inner(
          total_price,
          receipt!inner(
            id,
            receipt_date,
            tenant_id
          )
        ),
        tag!inner(
          id,
          name,
          color,
          category:tag_category!inner(
            id,
            name,
            color
          )
        )
      `)
      .eq('tenant_id', tenantId);
    
    if (startDate) {
      itemTagQuery = itemTagQuery.gte('receipt_item.receipt.receipt_date', startDate);
    }
    if (endDate) {
      itemTagQuery = itemTagQuery.lte('receipt_item.receipt.receipt_date', endDate);
    }
    
    // Build query to get receipt-level tags
    let receiptTagQuery = supabase
      .from('receipt_tag')
      .select(`
        receipt!inner(
          id,
          receipt_date,
          total_amount,
          tenant_id
        ),
        tag!inner(
          id,
          name,
          color,
          category:tag_category!inner(
            id,
            name,
            color
          )
        )
      `)
      .eq('tenant_id', tenantId);
    
    if (startDate) {
      receiptTagQuery = receiptTagQuery.gte('receipt.receipt_date', startDate);
    }
    if (endDate) {
      receiptTagQuery = receiptTagQuery.lte('receipt.receipt_date', endDate);
    }
    
    // Execute both queries
    const [{ data: taggedItems, error: itemError }, { data: receiptTags, error: receiptError }] = await Promise.all([
      itemTagQuery,
      receiptTagQuery
    ]);

    console.log('Tagged items query result:', { 
      itemError, 
      receiptError,
      itemDataLength: taggedItems?.length || 0,
      receiptDataLength: receiptTags?.length || 0,
      sampleItemData: taggedItems?.slice(0, 2),
      sampleReceiptData: receiptTags?.slice(0, 2)
    });

    if (itemError) {
      console.error('Error fetching item tag breakdown data:', itemError);
      throw itemError;
    }

    if (receiptError) {
      console.error('Error fetching receipt tag breakdown data:', receiptError);
      throw receiptError;
    }

    // Group data by tag categories and individual tags
    const categoryMap = new Map<string, {
      id: string;
      name: string;
      color: string;
      totalValue: number;
      tags: Map<string, {
        id: string;
        name: string;
        color: string;
        value: number;
        itemCount: number;
      }>;
    }>();

    // Track which receipts have line item tags to avoid double counting
    const receiptsWithItemTags = new Set<string>();

    // Process line item tags first
    (taggedItems || []).forEach((item: any) => {
      const category = item.tag.category;
      const tag = item.tag;
      const amount = item.receipt_item.total_price || 0;
      const receiptId = item.receipt_item.receipt.id;

      // Track this receipt as having line item tags
      receiptsWithItemTags.add(receiptId);

      // Initialize category if it doesn't exist
      if (!categoryMap.has(category.id)) {
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          color: category.color,
          totalValue: 0,
          tags: new Map()
        });
      }

      const categoryData = categoryMap.get(category.id)!;
      categoryData.totalValue += amount;

      // Initialize tag if it doesn't exist in this category
      if (!categoryData.tags.has(tag.id)) {
        categoryData.tags.set(tag.id, {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          value: 0,
          itemCount: 0
        });
      }

      const tagData = categoryData.tags.get(tag.id)!;
      tagData.value += amount;
      tagData.itemCount += 1;
    });

    // Process receipt-level tags
    // Only include receipt amounts for receipts that DON'T have line item tags
    // This prevents double counting
    (receiptTags || []).forEach((receiptTag: any) => {
      const category = receiptTag.tag.category;
      const tag = receiptTag.tag;
      const receiptId = receiptTag.receipt.id;
      const amount = receiptTag.receipt.total_amount || 0;

      // Skip this receipt if it already has line item tags (to avoid double counting)
      if (receiptsWithItemTags.has(receiptId)) {
        console.log(`Skipping receipt ${receiptId} to avoid double counting (has both receipt and item tags)`);
        return;
      }

      // Initialize category if it doesn't exist
      if (!categoryMap.has(category.id)) {
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          color: category.color,
          totalValue: 0,
          tags: new Map()
        });
      }

      const categoryData = categoryMap.get(category.id)!;
      categoryData.totalValue += amount;

      // Initialize tag if it doesn't exist in this category
      if (!categoryData.tags.has(tag.id)) {
        categoryData.tags.set(tag.id, {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          value: 0,
          itemCount: 0
        });
      }

      const tagData = categoryData.tags.get(tag.id)!;
      tagData.value += amount;
      tagData.itemCount += 1; // Count receipts for receipt-level tags
    });

    // Convert maps to arrays and calculate percentages
    let totalAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.totalValue, 0);
    
    const categories = Array.from(categoryMap.values()).map(category => {
      const tags = Array.from(category.tags.values()).map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        value: Math.round(tag.value * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((tag.value / totalAmount) * 100 * 100) / 100 : 0,
        itemCount: tag.itemCount,
        categoryPercentage: category.totalValue > 0 ? Math.round((tag.value / category.totalValue) * 100 * 100) / 100 : 0
      })).sort((a, b) => b.value - a.value);

      return {
        id: category.id,
        name: category.name,
        color: category.color,
        value: Math.round(category.totalValue * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((category.totalValue / totalAmount) * 100 * 100) / 100 : 0,
        tags: tags,
        tagCount: tags.length,
        trend: Math.floor(Math.random() * 21) - 10, // Mock trend for now
      };
    }).sort((a, b) => b.value - a.value);

    // Get all receipt totals for comparison with tagged totals (hybrid approach)
    let allReceiptsQuery = supabase
      .from('receipt')
      .select('total_amount, receipt_date')
      .eq('tenant_id', tenantId);
    
    if (startDate) {
      allReceiptsQuery = allReceiptsQuery.gte('receipt_date', startDate);
    }
    if (endDate) {
      allReceiptsQuery = allReceiptsQuery.lte('receipt_date', endDate);
    }
    
    const { data: allReceipts } = await allReceiptsQuery;
    const receiptTotal = (allReceipts || []).reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);
    
    // Calculate "Unaccounted" amount (all receipt total - tagged total)
    // This includes tax, fees, untagged items, and receipts that OCR missed or couldn't categorize
    const unaccountedAmount = receiptTotal - totalAmount;

    // Add "Unaccounted" category if there's a difference
    if (unaccountedAmount > 0.01) { // Only if difference is more than 1 cent
      const totalWithUnaccounted = receiptTotal; // Use receipt total as the true total
      categories.push({
        id: 'unaccounted',
        name: 'Unaccounted',
        color: '#E5E7EB', // Light gray for unaccounted
        value: Math.round(unaccountedAmount * 100) / 100,
        percentage: Math.round((unaccountedAmount / totalWithUnaccounted) * 100 * 100) / 100,
        tags: [],
        tagCount: 0,
        trend: 0,
      });

      // Recalculate percentages for all categories using total receipt amount
      categories.forEach(category => {
        if (category.id !== 'unaccounted') {
          category.percentage = Math.round((category.value / totalWithUnaccounted) * 100 * 100) / 100;
          // Also recalculate tag percentages within categories
          category.tags.forEach(tag => {
            tag.percentage = Math.round((tag.value / totalWithUnaccounted) * 100 * 100) / 100;
          });
        }
      });
      
      // Update the total amount to match receipt totals
      totalAmount = totalWithUnaccounted;
    }

    const breakdown = {
      totalAmount: Math.round(totalAmount * 100) / 100, // totalAmount already includes untagged
      categories,
      monthlyComparison: {
        currentMonth: Math.round(totalAmount * 100) / 100,
        previousMonth: Math.round(totalAmount * 0.85 * 100) / 100, // Mock previous month
        change: 15 // Mock change
      }
    };

    return NextResponse.json({ success: true, data: breakdown });
  } catch (error) {
    console.error("Tag breakdown error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tag breakdown" },
      { status: 500 }
    );
  }
}