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

    // Get the tag that's being used in receipt_item_tag
    const { data: tagDetails, error: tagError } = await supabase
      .from('tag')
      .select(`
        id,
        name,
        color,
        category:tag_category!inner(
          id,
          name,
          color
        )
      `)
      .eq('id', 'cba00096-4f4f-4279-a633-36ec6566eeeb');

    console.log('Tag details:', { tagError, tagDetails });

    // Get receipt items that are tagged
    const { data: taggedReceiptItems, error: itemError } = await supabase
      .from('receipt_item_tag')
      .select(`
        id,
        receipt_item:receipt_item!inner(
          id,
          total_price,
          receipt:receipt!inner(
            id,
            receipt_date,
            tenant_id
          )
        ),
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
      .eq('tenant_id', tenantId)
      .limit(3);

    console.log('Tagged receipt items:', { itemError, itemCount: taggedReceiptItems?.length });

    return NextResponse.json({
      success: true,
      data: {
        tagDetails: { error: tagError, data: tagDetails },
        taggedItems: { error: itemError, count: taggedReceiptItems?.length, data: taggedReceiptItems }
      }
    });
  } catch (error) {
    console.error("Debug tag details error:", error);
    return NextResponse.json(
      { error: "Failed to debug tag details", details: error },
      { status: 500 }
    );
  }
}