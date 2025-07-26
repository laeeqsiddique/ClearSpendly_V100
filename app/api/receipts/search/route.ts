import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vendor = searchParams.get('vendor');
    const category = searchParams.get('category');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const tags = searchParams.get('tags'); // Comma-separated tag IDs
    const tagCategory = searchParams.get('tagCategory'); // Filter by tag category
    const myDataOnly = searchParams.get('myDataOnly') === 'true'; // User filtering for multi-user tenants
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    const supabase = await createClient();
    console.log('Receipt search using authenticated user:', user.id);

    // Build the query with tag support
    let receiptsQuery;
    
    if (tags || tagCategory) {
      // If filtering by tags, we need to join with receipt_tag table
      receiptsQuery = supabase
        .from('receipt')
        .select(`
          id,
          receipt_date,
          total_amount,
          tax_amount,
          currency,
          notes,
          ocr_confidence,
          ocr_status,
          created_at,
          created_by,
          receipt_type,
          manual_entry_reason,
          business_purpose,
          vendor!inner(
            id,
            name,
            category
          ),
          created_by_user:user!created_by(
            id,
            email,
            full_name
          ),
          receipt_tag!inner(
            tag!inner(
              id,
              name,
              category_id
            )
          )
        `);
    } else {
      // Normal query without tag joins
      receiptsQuery = supabase
        .from('receipt')
        .select(`
          id,
          receipt_date,
          total_amount,
          tax_amount,
          currency,
          notes,
          ocr_confidence,
          ocr_status,
          created_at,
          created_by,
          receipt_type,
          manual_entry_reason,
          business_purpose,
          vendor!inner(
            id,
            name,
            category
          ),
          created_by_user:user!created_by(
            id,
            email,
            full_name
          )
        `);
    }

    // Apply filters
    if (startDate) {
      receiptsQuery = receiptsQuery.gte('receipt_date', startDate);
    }
    if (endDate) {
      receiptsQuery = receiptsQuery.lte('receipt_date', endDate);
    }
    if (vendor) {
      receiptsQuery = receiptsQuery.ilike('vendor.name', `%${vendor}%`);
    }
    if (minAmount) {
      receiptsQuery = receiptsQuery.gte('total_amount', parseFloat(minAmount));
    }
    if (maxAmount) {
      receiptsQuery = receiptsQuery.lte('total_amount', parseFloat(maxAmount));
    }

    // Apply tag filters
    if (tags) {
      const tagIds = tags.split(',').filter(id => id.trim());
      if (tagIds.length > 0) {
        receiptsQuery = receiptsQuery.in('receipt_tag.tag.id', tagIds);
      }
    }
    if (tagCategory) {
      receiptsQuery = receiptsQuery.eq('receipt_tag.tag.category_id', tagCategory);
    }

    // Apply text search on vendor name or notes
    if (query) {
      receiptsQuery = receiptsQuery.or(
        `vendor.name.ilike.%${query}%,notes.ilike.%${query}%`
      );
    }

    // Apply user filtering for multi-user tenants
    if (myDataOnly) {
      receiptsQuery = receiptsQuery.eq('created_by', user.id);
    }

    const { data: receipts, error } = await receiptsQuery
      .order('receipt_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }

    // Get unique receipt IDs (dedupe in case of multiple tags per receipt)
    const uniqueReceipts = receipts?.reduce((acc, receipt) => {
      const existing = acc.find(r => r.id === receipt.id);
      if (!existing) {
        acc.push(receipt);
      }
      return acc;
    }, [] as any[]) || [];

    const receiptIds = uniqueReceipts.map(r => r.id);

    // Get line items for each receipt
    const { data: lineItems } = await supabase
      .from('receipt_item')
      .select('*')
      .in('receipt_id', receiptIds)
      .order('line_number');

    // Get all tags for the receipts
    const { data: receiptTagsData } = await supabase
      .from('receipt_tag')
      .select(`
        receipt_id,
        tag:tag!inner(
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
      .in('receipt_id', receiptIds);

    // Get all tags for line items
    const lineItemIds = (lineItems || []).map(item => item.id);
    const { data: lineItemTagsData } = await supabase
      .from('receipt_item_tag')
      .select(`
        receipt_item_id,
        tag:tag!inner(
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
      .in('receipt_item_id', lineItemIds);

    // Group line items by receipt_id
    const lineItemsByReceipt = (lineItems || []).reduce((acc, item) => {
      if (!acc[item.receipt_id]) {
        acc[item.receipt_id] = [];
      }
      acc[item.receipt_id].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    // Group tags by receipt_id
    const tagsByReceipt = (receiptTagsData || []).reduce((acc, item) => {
      if (!acc[item.receipt_id]) {
        acc[item.receipt_id] = [];
      }
      acc[item.receipt_id].push({
        id: item.tag.id,
        name: item.tag.name,
        color: item.tag.color || item.tag.category.color,
        category: {
          id: item.tag.category.id,
          name: item.tag.category.name,
          color: item.tag.category.color
        }
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Group line item tags by receipt_item_id
    const tagsByLineItem = (lineItemTagsData || []).reduce((acc, item) => {
      if (!acc[item.receipt_item_id]) {
        acc[item.receipt_item_id] = [];
      }
      acc[item.receipt_item_id].push({
        id: item.tag.id,
        name: item.tag.name,
        color: item.tag.color || item.tag.category.color,
        category: {
          id: item.tag.category.id,
          name: item.tag.category.name,
          color: item.tag.category.color
        }
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Combine receipts with their line items and tags
    const receiptsWithItems = uniqueReceipts.map(receipt => ({
      ...receipt,
      lineItems: (lineItemsByReceipt[receipt.id] || []).map(item => ({
        ...item,
        tags: tagsByLineItem[item.id] || []
      })),
      tags: tagsByReceipt[receipt.id] || [],
      confidence: Math.round((receipt.ocr_confidence || 0.75) * 100)
    }));

    return NextResponse.json({ 
      success: true, 
      data: receiptsWithItems,
      count: receiptsWithItems.length 
    });
  } catch (error) {
    console.error("Receipt search error:", error);
    return NextResponse.json(
      { error: "Failed to search receipts" },
      { status: 500 }
    );
  }
}