import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const tagId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the current tenant ID for the authenticated user
    const tenantId = await getTenantIdWithFallback();

    // Get the tag with category info
    const { data, error } = await supabase
      .from('tag')
      .select(`
        id,
        name,
        description,
        color,
        usage_count,
        created_at,
        category:tag_category!inner(
          id,
          name,
          color,
          required,
          multiple
        )
      `)
      .eq('id', tagId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching tag:', error);
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Tag fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tag" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, description, categoryId, color } = await req.json();
    const tagId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the current tenant ID for the authenticated user
    const tenantId = await getTenantIdWithFallback();

    // Update the tag
    const { data, error } = await supabase
      .from('tag')
      .update({
        name,
        description: description || null,
        category_id: categoryId,
        color: color || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', tagId)
      .eq('tenant_id', tenantId)
      .select(`
        id,
        name,
        description,
        color,
        usage_count,
        created_at,
        category:tag_category!inner(
          id,
          name,
          color,
          required,
          multiple
        )
      `)
      .single();

    if (error) {
      console.error('Error updating tag:', error);
      return NextResponse.json(
        { error: 'Failed to update tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Tag update error:", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tagId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the current tenant ID for the authenticated user
    const tenantId = await getTenantIdWithFallback();

    // Check if tag is being used
    const { data: usageData, error: usageError } = await supabase
      .from('tag')
      .select('usage_count, name')
      .eq('id', tagId)
      .eq('tenant_id', tenantId)
      .single();

    if (usageError) {
      console.error('Error checking tag usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to check tag usage' },
        { status: 500 }
      );
    }

    // Delete the tag (this will cascade to receipt_tag and receipt_item_tag tables)
    const { error } = await supabase
      .from('tag')
      .delete()
      .eq('id', tagId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting tag:', error);
      return NextResponse.json(
        { error: 'Failed to delete tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Tag "${usageData.name}" deleted successfully` 
    });
  } catch (error) {
    console.error("Tag deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}