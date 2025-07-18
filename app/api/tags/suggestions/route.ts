import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('categoryId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 1) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // For now, use default tenant ID until auth is fully set up
    const defaultTenantId = '00000000-0000-0000-0000-000000000001';

    let dbQuery = supabase
      .from('tag')
      .select(`
        id,
        name,
        description,
        color,
        usage_count,
        category:tag_category!inner(
          id,
          name,
          color
        )
      `)
      .eq('tenant_id', defaultTenantId)
      .ilike('name', `%${query}%`);

    // Filter by category if specified
    if (categoryId) {
      dbQuery = dbQuery.eq('category_id', categoryId);
    }

    const { data: tags, error } = await dbQuery
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Database error in tag suggestions:', error);
      throw error;
    }

    // Format suggestions for autocomplete
    const suggestions = (tags || []).map(tag => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      color: tag.color || tag.category.color,
      category: {
        id: tag.category.id,
        name: tag.category.name
      },
      usageCount: tag.usage_count
    }));

    return NextResponse.json({ 
      success: true, 
      data: suggestions 
    });
  } catch (error) {
    console.error("Tag suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tag suggestions" },
      { status: 500 }
    );
  }
}