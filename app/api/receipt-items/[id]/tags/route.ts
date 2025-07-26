import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback();
    const itemId = params.id;

    const { data: itemTags, error } = await supabase
      .from('receipt_item_tag')
      .select(`
        id,
        tag:tag!inner(
          id,
          name,
          description,
          color,
          category:tag_category!inner(
            id,
            name,
            color,
            required
          )
        )
      `)
      .eq('receipt_item_id', itemId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching item tags:', error);
      throw error;
    }

    const tags = (itemTags || []).map(it => ({
      id: it.tag.id,
      name: it.tag.name,
      description: it.tag.description,
      color: it.tag.color || it.tag.category.color,
      category: {
        id: it.tag.category.id,
        name: it.tag.category.name,
        required: it.tag.category.required
      }
    }));

    return NextResponse.json({ 
      success: true, 
      data: tags 
    });
  } catch (error) {
    console.error("Item tags fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch item tags" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback();
    const itemId = params.id;
    const body = await req.json();
    const { tagIds } = body;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: "tagIds must be an array" },
        { status: 400 }
      );
    }

    // Verify item exists and belongs to tenant
    const { data: item, error: itemError } = await supabase
      .from('receipt_item')
      .select('id')
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Receipt item not found" },
        { status: 404 }
      );
    }

    // Remove existing tags
    const { error: deleteError } = await supabase
      .from('receipt_item_tag')
      .delete()
      .eq('receipt_item_id', itemId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      console.error('Error removing existing item tags:', deleteError);
      throw deleteError;
    }

    // Add new tags if any
    if (tagIds.length > 0) {
      const itemTags = tagIds.map(tagId => ({
        receipt_item_id: itemId,
        tag_id: tagId,
        tenant_id: tenantId
      }));

      const { error: insertError } = await supabase
        .from('receipt_item_tag')
        .insert(itemTags);

      if (insertError) {
        console.error('Error adding item tags:', insertError);
        throw insertError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Item tags updated successfully" 
    });
  } catch (error) {
    console.error("Item tags update error:", error);
    return NextResponse.json(
      { error: "Failed to update item tags" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback();
    const itemId = params.id;

    const { error } = await supabase
      .from('receipt_item_tag')
      .delete()
      .eq('receipt_item_id', itemId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error removing item tags:', error);
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: "All item tags removed successfully" 
    });
  } catch (error) {
    console.error("Item tags removal error:", error);
    return NextResponse.json(
      { error: "Failed to remove item tags" },
      { status: 500 }
    );
  }
}