import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback();
    const { id: receiptId } = await params;

    const { data: receiptTags, error } = await supabase
      .from('receipt_tag')
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
      .eq('receipt_id', receiptId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching receipt tags:', error);
      throw error;
    }

    const tags = (receiptTags || []).map(rt => ({
      id: rt.tag.id,
      name: rt.tag.name,
      description: rt.tag.description,
      color: rt.tag.color || rt.tag.category.color,
      category: {
        id: rt.tag.category.id,
        name: rt.tag.category.name,
        required: rt.tag.category.required
      }
    }));

    return NextResponse.json({ 
      success: true, 
      data: tags 
    });
  } catch (error) {
    console.error("Receipt tags fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt tags" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback();
    const { id: receiptId } = await params;
    const body = await req.json();
    const { tagIds } = body;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: "tagIds must be an array" },
        { status: 400 }
      );
    }

    // Verify receipt exists and belongs to tenant
    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .select('id')
      .eq('id', receiptId)
      .eq('tenant_id', tenantId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    // Remove existing tags
    const { error: deleteError } = await supabase
      .from('receipt_tag')
      .delete()
      .eq('receipt_id', receiptId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      console.error('Error removing existing receipt tags:', deleteError);
      throw deleteError;
    }

    // Add new tags if any
    if (tagIds.length > 0) {
      const receiptTags = tagIds.map(tagId => ({
        receipt_id: receiptId,
        tag_id: tagId,
        tenant_id: tenantId
      }));

      const { error: insertError } = await supabase
        .from('receipt_tag')
        .insert(receiptTags);

      if (insertError) {
        console.error('Error adding receipt tags:', insertError);
        throw insertError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Receipt tags updated successfully" 
    });
  } catch (error) {
    console.error("Receipt tags update error:", error);
    return NextResponse.json(
      { error: "Failed to update receipt tags" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback();
    const { id: receiptId } = await params;

    const { error } = await supabase
      .from('receipt_tag')
      .delete()
      .eq('receipt_id', receiptId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error removing receipt tags:', error);
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: "All receipt tags removed successfully" 
    });
  } catch (error) {
    console.error("Receipt tags removal error:", error);
    return NextResponse.json(
      { error: "Failed to remove receipt tags" },
      { status: 500 }
    );
  }
}