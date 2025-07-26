import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withPermission } from "@/lib/api-middleware";
import { withUserAttribution } from "@/lib/user-context";

export async function GET(req: NextRequest) {
  return withPermission('tags:view')(req, async (request, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const categoryId = searchParams.get('categoryId');
      const search = searchParams.get('search') || '';
      const limit = parseInt(searchParams.get('limit') || '50');

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const tenantId = context.membership.tenant_id;

    let query = supabase
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
      .eq('tenant_id', tenantId);

    // Filter by category if specified
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Search by name if specified
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: tags, error } = await query
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      data: tags || [] 
    });
  } catch (error) {
    console.error("Tags fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
  });
}

export async function POST(req: NextRequest) {
  return withPermission('tags:create')(req, async (request, context) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const tenantId = context.membership.tenant_id;
      const body = await request.json();

      const { name, description, categoryId, color } = body;

      if (!name || !categoryId) {
        return NextResponse.json(
          { error: "Tag name and category are required" },
          { status: 400 }
        );
      }

      // Verify the category exists and belongs to the tenant
      const { data: category, error: categoryError } = await supabase
        .from('tag_category')
        .select('id, color')
        .eq('id', categoryId)
        .eq('tenant_id', tenantId)
        .single();

      if (categoryError || !category) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }

      // Create tag with user attribution using the context user
      const tagData = {
        name: name.trim(),
        description: description?.trim() || null,
        category_id: categoryId,
        color: color || category.color, // Use category color as default
        tenant_id: tenantId,
        created_by: context.user.id,
        updated_by: context.user.id
      };
      
      const { data: tag, error } = await supabase
        .from('tag')
        .insert(tagData)
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
        console.error('Error creating tag:', error);
        if (error.code === '23505') { // Unique constraint violation
          return NextResponse.json(
            { error: "A tag with this name already exists in this category" },
            { status: 409 }
          );
        }
        throw error;
      }

      return NextResponse.json({ 
        success: true, 
        data: tag 
      });
  } catch (error) {
    console.error("Tag creation error:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
  });
}