import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { withUserAttribution } from "@/lib/user-context";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required. Please log in to access categories." }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get user's tenant through membership
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "No tenant access found" }, { status: 403 });
    }

    const tenantId = membership.tenant_id;

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
      .eq('tenant_id', tenantId)
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
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required. Please log in to create categories." }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get user's tenant through membership
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "No tenant access found" }, { status: 403 });
    }

    const tenantId = membership.tenant_id;
    const body = await req.json();

    const { name, description, color, required, multiple, sort_order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Create category with user attribution
    const categoryData = await withUserAttribution({
      name,
      description: description || null,
      color: color || '#6366f1',
      required: required || false,
      multiple: multiple !== false, // Default to true
      sort_order: sort_order || 0,
      tenant_id: tenantId
    });
    
    const { data: category, error } = await supabase
      .from('tag_category')
      .insert(categoryData)
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