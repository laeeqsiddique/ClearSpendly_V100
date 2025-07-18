import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';

    const { data: categories, error } = await supabase
      .from('tag_category')
      .select(`
        id,
        name,
        description,
        color,
        required,
        multiple,
        sort_order,
        created_at,
        updated_at
      `)
      .eq('tenant_id', defaultTenantId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching tag categories:', error);
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      data: categories || [] 
    });
  } catch (error) {
    console.error("Tag categories fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tag categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const defaultTenantId = '00000000-0000-0000-0000-000000000001';
    const body = await req.json();

    const { name, description, color, required, multiple, sort_order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const { data: category, error } = await supabase
      .from('tag_category')
      .insert({
        name,
        description: description || null,
        color: color || '#6366f1',
        required: required || false,
        multiple: multiple !== false, // Default to true
        sort_order: sort_order || 0,
        tenant_id: defaultTenantId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tag category:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      data: category 
    });
  } catch (error) {
    console.error("Tag category creation error:", error);
    return NextResponse.json(
      { error: "Failed to create tag category" },
      { status: 500 }
    );
  }
}