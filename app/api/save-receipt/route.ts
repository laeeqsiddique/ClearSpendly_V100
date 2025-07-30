import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";
import { withUserAttribution, requireUserId } from "@/lib/user-context";
import { withPermission } from "@/lib/api-middleware";

// Simple Levenshtein distance calculation for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  const n = str1.length;
  const m = str2.length;

  if (n === 0) return m;
  if (m === 0) return n;

  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[m][n];
}

// Calculate similarity score (0-1, where 1 is identical)
function calculateSimilarity(str1: string, str2: string): number {
  const normalizedStr1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedStr2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (normalizedStr1 === normalizedStr2) return 1;
  
  const maxLength = Math.max(normalizedStr1.length, normalizedStr2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
  return (maxLength - distance) / maxLength;
}

export async function POST(req: NextRequest) {
  return withPermission('receipts:create')(req, async (request, context) => {
    try {
      const receiptData = await request.json();
    console.log('Received receipt data:', receiptData);

    // Validate required fields
    if (!receiptData.vendor || !receiptData.totalAmount) {
      console.error('Missing required fields:', { vendor: receiptData.vendor, totalAmount: receiptData.totalAmount });
      return NextResponse.json(
        { error: "Missing required fields: vendor and totalAmount" },
        { status: 400 }
      );
    }

    // Check if this is a force save (ignoring warnings)
    const forceSave = receiptData.forceSave === true;
    const tags = receiptData.tags || []; // Extract tags array
    const isUpdate = receiptData.isUpdate === true;
    const dbReceiptId = receiptData.dbReceiptId;

    // If this is an update and we have a dbReceiptId, redirect to the PATCH endpoint
    if (isUpdate && dbReceiptId) {
      console.log('Redirecting to update existing receipt:', dbReceiptId);
      
      // Create the update payload for the PATCH endpoint
      const updatePayload = {
        vendor: receiptData.vendor,
        receipt_date: receiptData.date,
        total_amount: receiptData.totalAmount,
        tax_amount: receiptData.tax || 0,
        notes: receiptData.notes || '',
        tags: tags,
        lineItems: receiptData.lineItems?.map((item: any) => ({
          id: item.id, // This might not exist for new items
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          tags: item.tag ? [item.tag] : []
        })) || []
      };

      // Call the existing PATCH endpoint internally
      const updateUrl = new URL(`/api/receipts/${dbReceiptId}`, request.url);
      const updateRequest = new Request(updateUrl, {
        method: 'PATCH',
        headers: request.headers,
        body: JSON.stringify(updatePayload)
      });

      // Import and call the PATCH handler
      const { PATCH } = await import('@/app/api/receipts/[id]/route');
      return await PATCH(updateRequest, { params: Promise.resolve({ id: dbReceiptId }) });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the tenant ID from the authentication context
    const tenantId = context.membership.tenant_id;
    
    // Check if vendor exists, create if not
    let vendorId;
    const normalizedName = receiptData.vendor.toLowerCase().trim().replace(/\s+/g, ' ');
    const { data: existingVendor } = await supabase
      .from('vendor')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('tenant_id', tenantId)
      .single();
    
    if (existingVendor) {
      vendorId = existingVendor.id;
    } else {
      // If no exact match and not forcing save, check for similar vendors
      if (!forceSave) {
        const { data: allVendors } = await supabase
          .from('vendor')
          .select('id, name, category')
          .eq('tenant_id', tenantId);

        const similarVendors = (allVendors || [])
          .map(vendor => ({
            ...vendor,
            similarity: calculateSimilarity(receiptData.vendor, vendor.name)
          }))
          .filter(vendor => vendor.similarity > 0.6 && vendor.similarity < 1) // Similar but not identical
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3);

        if (similarVendors.length > 0) {
          return NextResponse.json({
            success: false,
            warning: 'similar_vendors',
            message: 'Found similar vendors that might be duplicates',
            similarVendors: similarVendors.map(v => ({
              id: v.id,
              name: v.name,
              category: v.category,
              similarity: Math.round(v.similarity * 100)
            })),
            newVendor: receiptData.vendor
          });
        }
      }
      const { data: newVendor, error: vendorError } = await supabase
        .from('vendor')
        .insert({
          tenant_id: tenantId,
          name: receiptData.vendor,
          normalized_name: normalizedName,
          category: receiptData.category || 'Other'
        })
        .select('id')
        .single();
      
      if (vendorError) {
        console.error('Error creating vendor:', vendorError);
        throw vendorError;
      }
      vendorId = newVendor.id;
    }

    // Get current user ID for attribution
    const currentUserId = await requireUserId();
    
    // Use a transaction to ensure all-or-nothing save
    const { data: transactionResult, error: transactionError } = await supabase.rpc('save_receipt_with_items', {
      p_tenant_id: tenantId,
      p_vendor_id: vendorId,
      p_receipt_date: receiptData.date,
      p_currency: receiptData.currency || 'USD',
      p_total_amount: receiptData.totalAmount,
      p_tax_amount: receiptData.tax || 0,
      p_original_file_url: receiptData.imageUrl || 'placeholder',
      p_ocr_confidence: (receiptData.confidence || 75) / 100,
      p_notes: receiptData.notes || '',
      p_created_by: currentUserId,
      p_line_items: receiptData.lineItems && receiptData.lineItems.length > 0 
        ? JSON.stringify(receiptData.lineItems.map((item: any, index: number) => ({
            line_number: index + 1,
            description: item.description,
            quantity: item.quantity || 1,
            unit_price: item.unitPrice || 0,
            total_price: item.totalPrice || (item.quantity * item.unitPrice) || 0,
            category: item.category || 'Other',
            sku: null
          })))
        : null // Handle receipts without line items
    });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      
      // Fallback to manual transaction if the stored procedure doesn't exist
      console.log('Falling back to manual transaction...');
      
      // Create receipt record with user attribution
      const receiptData_withAttribution = await withUserAttribution({
        tenant_id: tenantId,
        vendor_id: vendorId,
        receipt_date: receiptData.date,
        currency: receiptData.currency || 'USD',
        total_amount: receiptData.totalAmount,
        tax_amount: receiptData.tax || 0,
        original_file_url: receiptData.imageUrl || 'placeholder',
        ocr_confidence: (receiptData.confidence || 75) / 100,
        ocr_status: 'processed',
        notes: receiptData.notes || ''
      });
      
      const { data: receipt, error: receiptError } = await supabase
        .from('receipt')
        .insert(receiptData_withAttribution)
        .select('id')
        .single();
      
      if (receiptError) {
        console.error('Error creating receipt:', receiptError);
        throw receiptError;
      }

      // Create receipt line items (only if they exist)
      if (receiptData.lineItems && receiptData.lineItems.length > 0) {
        const lineItemsToInsert = receiptData.lineItems.map((item: any, index: number) => ({
          tenant_id: tenantId,
          receipt_id: receipt.id,
          line_number: index + 1,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || 0,
          total_price: item.totalPrice || (item.quantity * item.unitPrice) || 0,
          sku: null
        }));

        const { data: lineItems, error: lineItemsError } = await supabase
          .from('receipt_item')
          .insert(lineItemsToInsert)
          .select('id');
        
        if (lineItemsError) {
          console.error('Error creating line items:', lineItemsError);
          // Try to cleanup the receipt if line items failed
          await supabase.from('receipt').delete().eq('id', receipt.id);
          throw lineItemsError;
        }

        // Save line item tags if provided (now single tag per item)
        const lineItemTags: any[] = [];
        receiptData.lineItems.forEach((item: any, index: number) => {
          if (item.tag) {
            const lineItemId = lineItems[index].id;
            lineItemTags.push({
              receipt_item_id: lineItemId,
              tag_id: item.tag,
              tenant_id: tenantId
            });
          }
        });

        if (lineItemTags.length > 0) {
          const { error: itemTagsError } = await supabase
            .from('receipt_item_tag')
            .insert(lineItemTags);
          
          if (itemTagsError) {
            console.error('Error creating line item tags:', itemTagsError);
            // Continue without failing - tags are optional
          }
        }
      }

      // Save tags if provided
      if (tags.length > 0) {
        const receiptTags = tags.map((tagId: string) => ({
          receipt_id: receipt.id,
          tag_id: tagId,
          tenant_id: tenantId
        }));

        const { error: tagsError } = await supabase
          .from('receipt_tag')
          .insert(receiptTags);

        if (tagsError) {
          console.error('Error saving receipt tags:', tagsError);
          // Don't fail the entire operation for tag errors, just log
        }
      }

      console.log('✅ Receipt saved successfully (manual transaction):', receipt.id);
      
      return NextResponse.json({
        success: true,
        data: {
          receiptId: receipt.id,
          message: 'Receipt saved successfully'
        }
      });
    } else {
      // Save tags if provided (for stored procedure path)
      if (tags.length > 0) {
        const receiptTags = tags.map((tagId: string) => ({
          receipt_id: transactionResult,
          tag_id: tagId,
          tenant_id: tenantId
        }));

        const { error: tagsError } = await supabase
          .from('receipt_tag')
          .insert(receiptTags);

        if (tagsError) {
          console.error('Error saving receipt tags:', tagsError);
          // Don't fail the entire operation for tag errors, just log
        }
      }

      console.log('✅ Receipt saved successfully (stored procedure):', transactionResult);
      
      return NextResponse.json({
        success: true,
        data: {
          receiptId: transactionResult,
          message: 'Receipt saved successfully'
        }
      });
    }
  } catch (error) {
    console.error("Save receipt error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    });
      return NextResponse.json(
        { 
          error: "Failed to save receipt",
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  });
}