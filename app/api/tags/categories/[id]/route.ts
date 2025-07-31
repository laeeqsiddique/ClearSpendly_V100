import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { name, description, color, required, multiple } = await req.json();
    const { id: categoryId } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the current tenant ID for the authenticated user
    const tenantId = await getTenantIdWithFallback();

    // Update the category
    const { data, error } = await supabase
      .from('tag_category')
      .update({
        name,
        description: description || null,
        color,
        required,
        multiple,
        updated_at: new Date().toISOString()
      })
      .eq('id', categoryId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating tag category:', error);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Category update error:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: categoryId } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the current tenant ID for the authenticated user
    const tenantId = await getTenantIdWithFallback();

    // Check if category exists
    const { data: categoryData, error: categoryError } = await supabase
      .from('tag_category')
      .select('name')
      .eq('id', categoryId)
      .eq('tenant_id', tenantId)
      .single();

    if (categoryError) {
      console.error('Error checking category:', categoryError);
      return NextResponse.json(
        { error: 'Failed to check category' },
        { status: 500 }
      );
    }

    // Check for associated tags
    const { data: tagsData, error: tagsError } = await supabase
      .from('tag')
      .select('id')
      .eq('category_id', categoryId)
      .eq('tenant_id', tenantId);

    if (tagsError) {
      console.error('Error checking category tags:', tagsError);
      return NextResponse.json(
        { error: 'Failed to check category tags' },
        { status: 500 }
      );
    }

    // Delete the category (this will cascade to tags and their associations)
    const { error } = await supabase
      .from('tag_category')
      .delete()
      .eq('id', categoryId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting tag category:', error);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Category "${categoryData.name}" and ${tagsData.length} associated tags deleted successfully` 
    });
  } catch (error) {
    console.error("Category deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}