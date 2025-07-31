import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const tenantId = await getTenantIdWithFallback();

    // Check if tag_category table exists and has data
    const { data: categories, error: catError } = await supabase
      .from('tag_category')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(5);

    console.log('Tag categories:', { catError, categories });

    // Check if tag table exists and has data
    const { data: tags, error: tagError } = await supabase
      .from('tag')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(5);

    console.log('Tags:', { tagError, tags });

    // Check if receipt_item_tag table exists
    const { data: itemTags, error: itemTagError } = await supabase
      .from('receipt_item_tag')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(5);

    console.log('Receipt item tags:', { itemTagError, itemTags });

    // Check receipt_item table
    const { data: items, error: itemError } = await supabase
      .from('receipt_item')
      .select('id, receipt_id, total_price')
      .limit(5);

    console.log('Receipt items:', { itemError, itemCount: items?.length });

    return NextResponse.json({
      success: true,
      data: {
        categories: { error: catError, count: categories?.length || 0, sample: categories?.slice(0, 2) },
        tags: { error: tagError, count: tags?.length || 0, sample: tags?.slice(0, 2) },
        itemTags: { error: itemTagError, count: itemTags?.length || 0, sample: itemTags?.slice(0, 2) },
        receiptItems: { error: itemError, count: items?.length || 0 }
      }
    });
  } catch (error) {
    console.error("Debug tags error:", error);
    return NextResponse.json(
      { error: "Failed to debug tags", details: error },
      { status: 500 }
    );
  }
}