import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";
import { withPermission } from "@/lib/api-middleware";
import { serverStorage } from "@/lib/storage/supabase-storage";

export const dynamic = 'force-dynamic';

// Function to save receipt data to database with proper file storage
async function saveReceiptToDatabase(receiptData: any, imageFile?: File | Blob, imageDataUrl?: string): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the current tenant ID for the authenticated user
    const tenantId = await getTenantIdWithFallback();
    
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

    // Create receipt record first to get the ID
    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .insert({
        tenant_id: tenantId,
        vendor_id: vendorId,
        receipt_date: receiptData.date,
        currency_code: receiptData.currency || 'USD',
        total_amount: receiptData.totalAmount,
        tax_amount: receiptData.tax || 0,
        ocr_confidence: (receiptData.confidence || 75) / 100,
        status: 'processed'
      })
      .select('id')
      .single();
    
    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      throw receiptError;
    }

    // Upload image to Supabase Storage if provided
    let storageResult = null;
    if (imageFile) {
      try {
        // Get subscription tier from context (default to free)
        const subscriptionTier = 'free'; // This should be fetched from user/tenant data
        
        storageResult = await serverStorage.uploadReceiptImage(
          imageFile,
          receipt.id,
          tenantId,
          subscriptionTier
        );
        
        console.log('✅ Receipt image uploaded to Supabase Storage:', storageResult.path);
      } catch (storageError) {
        console.error('❌ Failed to upload receipt image:', storageError);
        // Don't fail the entire receipt save if image upload fails
        // The receipt data is still valuable without the image
      }
    } else if (imageDataUrl) {
      try {
        // Convert data URL to file
        const file = serverStorage.constructor.dataUrlToFile(imageDataUrl, `receipt_${receipt.id}.jpg`);
        
        const subscriptionTier = 'free';
        storageResult = await serverStorage.uploadReceiptImage(
          file,
          receipt.id,
          tenantId,
          subscriptionTier
        );
        
        console.log('✅ Receipt image from data URL uploaded:', storageResult.path);
      } catch (storageError) {
        console.error('❌ Failed to upload receipt image from data URL:', storageError);
      }
    }

    // Update receipt with storage information if upload was successful
    if (storageResult) {
      const { error: updateError } = await supabase
        .from('receipt')
        .update({
          storage_path: storageResult.path,
          storage_url: storageResult.publicUrl,
          file_metadata: storageResult.metadata,
          // Keep the old field for backward compatibility
          original_file_url: storageResult.publicUrl
        })
        .eq('id', receipt.id);

      if (updateError) {
        console.error('Error updating receipt with storage info:', updateError);
        // Don't throw error here, receipt is already saved
      }
    }

    // Create receipt line items
    if (receiptData.lineItems && receiptData.lineItems.length > 0) {
      const lineItemsToInsert = receiptData.lineItems.map((item: any) => ({
        receipt_id: receipt.id,
        sku: null,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: item.totalPrice || (item.quantity * item.unitPrice) || 0,
        category: item.category || 'Other',
        tax_deductible: true
      }));

      const { error: lineItemsError } = await supabase
        .from('receipt_item')
        .insert(lineItemsToInsert);
      
      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError);
        throw lineItemsError;
      }
    }

    console.log('✅ Receipt saved to database:', receipt.id);
    return receipt.id;
  } catch (error) {
    console.error('❌ Database save error:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  return withPermission('receipts:create')(req, async (request, context) => {
    try {
      const body = await request.json();
      const { receiptData, imageUrl, imageData } = body;

      if (!receiptData) {
        return NextResponse.json({ error: "No receipt data provided" }, { status: 400 });
      }

      // Prepare image for storage
      let imageFile: File | undefined = undefined;
      let imageDataUrl: string | undefined = undefined;

      if (imageUrl && imageUrl.startsWith('blob:')) {
        // Handle blob URLs by converting to file
        try {
          imageFile = await serverStorage.constructor.blobUrlToFile(imageUrl, `receipt_${Date.now()}.jpg`);
        } catch (error) {
          console.warn('Failed to convert blob URL to file:', error);
          imageDataUrl = imageData; // Fallback to data URL if available
        }
      } else if (imageData && imageData.startsWith('data:')) {
        // Handle data URLs
        imageDataUrl = imageData;
      } else if (imageUrl && !imageUrl.startsWith('blob:')) {
        // Handle other URL types (shouldn't happen in normal flow)
        imageDataUrl = imageUrl;
      }

      // Save receipt to database with proper file storage
      const receiptId = await saveReceiptToDatabase(receiptData, imageFile, imageDataUrl);

      return NextResponse.json({
        success: true,
        receiptId,
        message: "Receipt saved successfully with persistent storage"
      });

    } catch (error: any) {
      console.error("Receipt save error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to save receipt" },
        { status: 500 }
      );
    }
  });
}