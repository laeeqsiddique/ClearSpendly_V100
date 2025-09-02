import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";
import { withPermission } from "@/lib/api-middleware";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Build-time safety check
  if (process.env.NODE_ENV === 'production' && !process.env.RAILWAY_ENVIRONMENT) {
    return NextResponse.json({
      success: false,
      error: 'Route not available during build'
    }, { status: 503 });
  }

  try {
    const body = await request.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the current tenant ID
    const tenantId = await getTenantIdWithFallback();
    
    // Handle vendor creation/lookup
    let vendorId;
    const normalizedName = body.vendor.toLowerCase().trim().replace(/\s+/g, ' ');
    const { data: existingVendor } = await supabase
      .from('vendor')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('tenant_id', tenantId)
      .single();
    
    if (existingVendor) {
      vendorId = existingVendor.id;
    } else {
      const { data: newVendor, error: vendorError } = await supabase
        .from('vendor')
        .insert({
          tenant_id: tenantId,
          name: body.vendor,
          normalized_name: normalizedName,
          category: body.category || 'Other'
        })
        .select('id')
        .single();
      
      if (vendorError) throw vendorError;
      vendorId = newVendor.id;
    }

    // Create or update receipt record
    const receiptData = {
      tenant_id: tenantId,
      vendor_id: vendorId,
      receipt_date: body.date,
      currency: body.currency || 'USD',
      total_amount: parseFloat(body.totalAmount) || 0,
      tax_amount: parseFloat(body.tax) || 0,
      original_file_url: body.imageUrl || null,
      ocr_confidence: (body.confidence || 85) / 100,
      ocr_status: 'completed',
      notes: body.notes || null
    };

    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .insert(receiptData)
      .select('id')
      .single();
    
    if (receiptError) throw receiptError;

    // Handle line items
    if (body.lineItems && body.lineItems.length > 0) {
      const lineItemsToInsert = body.lineItems.map((item: any, index: number) => ({
        tenant_id: tenantId,
        receipt_id: receipt.id,
        line_number: index + 1,
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 1,
        unit_price: parseFloat(item.unitPrice) || 0,
        total_price: parseFloat(item.totalPrice) || 0,
        category: item.category || 'Other'
      }));

      const { error: lineItemsError } = await supabase
        .from('receipt_item')
        .insert(lineItemsToInsert);
      
      if (lineItemsError) throw lineItemsError;
    }

    // Handle tags
    if (body.tags && body.tags.length > 0) {
      const receiptTagsToInsert = body.tags.map((tagId: string) => ({
        receipt_id: receipt.id,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from('receipt_tag')
        .insert(receiptTagsToInsert);
      
      if (tagsError) throw tagsError;
    }

    return NextResponse.json({
      success: true,
      receiptId: receipt.id,
      message: 'Receipt saved successfully'
    });

  } catch (error) {
    console.error('Save receipt error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save receipt'
    }, { status: 500 });
  }
}