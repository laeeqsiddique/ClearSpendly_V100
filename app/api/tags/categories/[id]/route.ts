import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, description, color, required, multiple } = await req.json();
    const categoryId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';

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
      .eq('tenant_id', defaultTenantId)
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const categoryId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';

    // Check if category exists and is not a system category
    const { data: categoryData, error: categoryError } = await supabase
      .from('tag_category')
      .select('name, system')
      .eq('id', categoryId)
      .eq('tenant_id', defaultTenantId)
      .single();

    if (categoryError) {
      console.error('Error checking category:', categoryError);
      return NextResponse.json(
        { error: 'Failed to check category' },
        { status: 500 }
      );
    }

    // Prevent deletion of system categories
    if (categoryData.system) {
      return NextResponse.json(
        { error: 'System categories cannot be deleted' },
        { status: 403 }
      );
    }

    // Check for associated tags
    const { data: tagsData, error: tagsError } = await supabase
      .from('tag')
      .select('id')
      .eq('category_id', categoryId)
      .eq('tenant_id', defaultTenantId);

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
      .eq('tenant_id', defaultTenantId);

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