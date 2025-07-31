import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const tenantId = await getTenantIdWithFallback();

    // Get all vendors with their categories
    const { data: vendors, error } = await supabase
      .from('vendor')
      .select('id, name, category')
      .eq('tenant_id', tenantId);

    return NextResponse.json({
      success: true,
      data: {
        vendorCount: vendors?.length || 0,
        vendors: vendors?.map(v => ({
          name: v.name,
          category: v.category || 'NULL'
        }))
      }
    });
  } catch (error) {
    console.error("Debug vendor categories error:", error);
    return NextResponse.json(
      { error: "Failed to debug vendor categories", details: error },
      { status: 500 }
    );
  }
}