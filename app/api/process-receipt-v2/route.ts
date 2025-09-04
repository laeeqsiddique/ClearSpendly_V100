import { NextRequest, NextResponse } from "next/server";
import { getOCRService } from "@/lib/ocr/ocr-service";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";
import { withPermission } from "@/lib/api-middleware";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function saveReceiptToDatabase(receiptData: any, imageUrl?: string): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const tenantId = await getTenantIdWithFallback();
    
    // Handle vendor creation/lookup
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
      
      if (vendorError) throw vendorError;
      vendorId = newVendor.id;
    }

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .insert({
        tenant_id: tenantId,
        vendor_id: vendorId,
        receipt_date: receiptData.date,
        currency_code: receiptData.currency || 'USD',
        total_amount: receiptData.totalAmount,
        tax_amount: receiptData.tax || 0,
        original_file_url: imageUrl || null,
        ocr_confidence: (receiptData.confidence || 75) / 100,
        status: 'processed'
      })
      .select('id')
      .single();
    
    if (receiptError) throw receiptError;

    // Create line items
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
      
      if (lineItemsError) throw lineItemsError;
    }

    return receipt.id;
  } catch (error) {
    console.error('Database save error:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  return withPermission('receipts:create')(req, async (request) => {
    try {
      const startTime = Date.now();
      const { imageUrl, imageData, fileType, saveToDatabase = false } = await request.json();

      if (!imageUrl && !imageData) {
        return NextResponse.json({ error: "No image provided" }, { status: 400 });
      }

      // Use the unified OCR service with extended timeout for PDF processing
      const ocrService = getOCRService({
        primaryProvider: process.env.OCR_PRIMARY_PROVIDER as any || 'mistral',
        enableCaching: true,
        costThreshold: 0.01,
        accuracyThreshold: 70,
        timeout: 120000 // 2 minutes for complex PDFs
      });

      // Process the receipt
      const finalImageData = imageData || imageUrl;
      console.log(`🔄 Processing receipt with OCR service...`);
      console.log(`📄 Input type: ${finalImageData ? (finalImageData.startsWith('http') ? 'URL' : 'base64 data') : 'unknown'}`);
      
      const ocrStartTime = Date.now();
      const result = await ocrService.processReceipt(finalImageData);
      const ocrEndTime = Date.now();
      
      console.log(`⏱️ OCR processing completed in ${(ocrEndTime - ocrStartTime) / 1000}s`);

      if (!result.success) {
        return NextResponse.json(
          { 
            error: result.error || "OCR processing failed",
            provider: result.provider 
          },
          { status: 500 }
        );
      }

      // Save to database if requested
      let receiptId = null;
      if (saveToDatabase && result.data) {
        try {
          receiptId = await saveReceiptToDatabase(result.data, imageUrl);
          console.log(`✅ Receipt saved to database: ${receiptId}`);
        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
        }
      }

      const totalTime = Date.now() - startTime;

      // Return comprehensive response
      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: {
          provider: result.provider,
          processingTime: result.processingTime,
          totalTime,
          cost: result.cost,
          confidence: result.confidence,
          receiptId
        },
        providers: ocrService.getProviderStats()
      });

    } catch (error) {
      console.error('Process receipt error:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to process receipt',
          stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        },
        { status: 500 }
      );
    }
  });
}

// Health check endpoint
export async function GET() {
  try {
    const ocrService = getOCRService();
    const providers = ocrService.getProviderStats();
    
    return NextResponse.json({
      status: 'healthy',
      providers,
      availableProviders: providers.filter(p => p.available).map(p => p.name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: (error as Error).message },
      { status: 500 }
    );
  }
}