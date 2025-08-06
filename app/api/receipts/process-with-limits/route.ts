import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withSubscriptionContext, requireSubscription } from '@/lib/middleware/subscription-middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const processReceiptSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string(),
  fileSize: z.number().min(1),
  mimeType: z.string(),
  // Optional metadata
  vendorName: z.string().optional(),
  expectedAmount: z.number().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// POST /api/receipts/process-with-limits
// This endpoint demonstrates usage tracking and feature gating
export const POST = withSubscriptionContext(
  requireSubscription({
    usage: { type: 'receipts_per_month', amount: 1 },
    feature: 'ocr_processing'
  })(async function (request: NextRequest) {
    try {
      const context = (request as any).subscriptionContext;
      const { tenantId, userId, featureGate } = context;

      // Parse request body
      const body = await request.json();
      const validatedData = processReceiptSchema.parse(body);

      const supabase = createClient();

      // Check OCR processing level
      const ocrLevel = await featureGate.getFeatureLevel('ocr_processing');
      
      // Get storage usage and check limits
      const storageUsage = await featureGate.checkUsage('storage_mb');
      const fileSizeMB = validatedData.fileSize / (1024 * 1024);
      
      if (!storageUsage.isUnlimited && (storageUsage.current + fileSizeMB) > storageUsage.limit) {
        return NextResponse.json({
          success: false,
          error: `This file would exceed your storage limit of ${storageUsage.limit} MB`,
          upgradeRequired: true,
          currentUsage: storageUsage.current,
          limit: storageUsage.limit
        }, { status: 403 });
      }

      // Create receipt record
      const { data: receipt, error: receiptError } = await supabase
        .from('receipt')
        .insert({
          tenant_id: tenantId,
          original_file_url: validatedData.fileUrl,
          original_file_name: validatedData.fileName,
          file_size_bytes: validatedData.fileSize,
          mime_type: validatedData.mimeType,
          receipt_date: new Date().toISOString().split('T')[0],
          total_amount: validatedData.expectedAmount || 0,
          ocr_status: 'pending',
          category: validatedData.category,
          tags: validatedData.tags || [],
          source: 'api_upload',
          source_metadata: {
            api_version: 'v1',
            processing_level: ocrLevel,
            upload_timestamp: new Date().toISOString()
          },
          created_by: userId
        })
        .select()
        .single();

      if (receiptError) {
        console.error('Error creating receipt record:', receiptError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create receipt record'
        }, { status: 500 });
      }

      // Update storage usage
      await featureGate.incrementUsage('storage_mb', fileSizeMB);

      // Process OCR based on subscription level
      let ocrResult = null;
      try {
        switch (ocrLevel) {
          case 'basic':
            ocrResult = await processBasicOCR(validatedData.fileUrl);
            break;
          case 'enhanced':
            ocrResult = await processEnhancedOCR(validatedData.fileUrl);
            break;
          case 'premium':
            ocrResult = await processPremiumOCR(validatedData.fileUrl);
            break;
          default:
            throw new Error('OCR processing not available');
        }

        // Update receipt with OCR results
        if (ocrResult) {
          await supabase
            .from('receipt')
            .update({
              ocr_status: 'completed',
              ocr_processed_at: new Date().toISOString(),
              ocr_confidence: ocrResult.confidence,
              ocr_provider: ocrResult.provider,
              ocr_raw_data: ocrResult.rawData,
              // Extract key information
              total_amount: ocrResult.totalAmount || receipt.total_amount,
              tax_amount: ocrResult.taxAmount || 0,
              subtotal_amount: ocrResult.subtotalAmount || 0,
              receipt_date: ocrResult.date || receipt.receipt_date,
              vendor_id: ocrResult.vendorId || null
            })
            .eq('id', receipt.id);

          // Create receipt items if extracted
          if (ocrResult.items && ocrResult.items.length > 0) {
            const receiptItems = ocrResult.items.map((item: any, index: number) => ({
              tenant_id: tenantId,
              receipt_id: receipt.id,
              line_number: index + 1,
              description: item.description,
              normalized_description: item.description.toLowerCase().trim(),
              quantity: item.quantity || 1,
              unit_price: item.unitPrice || 0,
              total_price: item.totalPrice || 0,
              tax_amount: item.taxAmount || 0,
              category: item.category || validatedData.category,
              metadata: {
                confidence: item.confidence || 0,
                extracted_by: ocrResult.provider
              }
            }));

            await supabase
              .from('receipt_item')
              .insert(receiptItems);
          }
        }

      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
        
        // Update receipt with error status
        await supabase
          .from('receipt')
          .update({
            ocr_status: 'failed',
            ocr_processed_at: new Date().toISOString(),
            source_metadata: {
              ...receipt.source_metadata,
              ocr_error: ocrError instanceof Error ? ocrError.message : 'OCR processing failed'
            }
          })
          .eq('id', receipt.id);
      }

      // Get updated receipt with OCR results
      const { data: finalReceipt, error: fetchError } = await supabase
        .from('receipt')
        .select(`
          *,
          vendor:vendor_id(*),
          receipt_item(*)
        `)
        .eq('id', receipt.id)
        .single();

      if (fetchError) {
        console.error('Error fetching final receipt:', fetchError);
      }

      // Get updated usage information
      const updatedUsage = await featureGate.getAllUsage();

      return NextResponse.json({
        success: true,
        data: {
          receipt: finalReceipt || receipt,
          ocrResult: ocrResult ? {
            provider: ocrResult.provider,
            confidence: ocrResult.confidence,
            itemsExtracted: ocrResult.items?.length || 0
          } : null,
          usage: updatedUsage,
          processingLevel: ocrLevel
        },
        message: `Receipt processed successfully with ${ocrLevel} OCR`
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        }, { status: 400 });
      }

      console.error('Error processing receipt:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }, { status: 500 });
    }
  })
);

// Mock OCR processing functions - replace with actual implementations
async function processBasicOCR(fileUrl: string) {
  // Simulate basic OCR processing
  return {
    provider: 'tesseract',
    confidence: 0.75,
    totalAmount: 29.99,
    taxAmount: 2.40,
    subtotalAmount: 27.59,
    date: new Date().toISOString().split('T')[0],
    vendorId: null,
    rawData: {
      extractedText: 'Sample extracted text...',
      processingTime: 2.5,
      method: 'basic'
    },
    items: [
      {
        description: 'Sample item',
        quantity: 1,
        unitPrice: 27.59,
        totalPrice: 27.59,
        confidence: 0.8
      }
    ]
  };
}

async function processEnhancedOCR(fileUrl: string) {
  // Simulate enhanced OCR with better accuracy and item extraction
  return {
    provider: 'google-vision',
    confidence: 0.89,
    totalAmount: 29.99,
    taxAmount: 2.40,
    subtotalAmount: 27.59,
    date: new Date().toISOString().split('T')[0],
    vendorId: null,
    rawData: {
      extractedText: 'Enhanced extracted text...',
      processingTime: 4.2,
      method: 'enhanced',
      structuredData: {
        vendor: 'Sample Store',
        address: '123 Main St',
        phone: '555-1234'
      }
    },
    items: [
      {
        description: 'Premium item 1',
        quantity: 2,
        unitPrice: 12.99,
        totalPrice: 25.98,
        taxAmount: 2.08,
        confidence: 0.92,
        category: 'office_supplies'
      },
      {
        description: 'Service fee',
        quantity: 1,
        unitPrice: 1.61,
        totalPrice: 1.61,
        taxAmount: 0.32,
        confidence: 0.85,
        category: 'services'
      }
    ]
  };
}

async function processPremiumOCR(fileUrl: string) {
  // Simulate premium OCR with highest accuracy and advanced features
  return {
    provider: 'aws-textract',
    confidence: 0.96,
    totalAmount: 29.99,
    taxAmount: 2.40,
    subtotalAmount: 27.59,
    date: new Date().toISOString().split('T')[0],
    vendorId: null,
    rawData: {
      extractedText: 'Premium extracted text...',
      processingTime: 6.8,
      method: 'premium',
      structuredData: {
        vendor: 'Sample Premium Store',
        address: '123 Main St, City, State 12345',
        phone: '555-1234',
        email: 'store@example.com',
        website: 'example.com'
      },
      confidence_scores: {
        vendor: 0.98,
        total: 0.97,
        items: 0.94,
        tax: 0.96
      }
    },
    items: [
      {
        description: 'Premium Office Chair',
        quantity: 1,
        unitPrice: 199.99,
        totalPrice: 199.99,
        taxAmount: 16.00,
        confidence: 0.97,
        category: 'office_furniture',
        sku: 'CHAIR-001',
        barcode: '1234567890123'
      },
      {
        description: 'Delivery Fee',
        quantity: 1,
        unitPrice: 15.00,
        totalPrice: 15.00,
        taxAmount: 1.20,
        confidence: 0.95,
        category: 'shipping'
      }
    ]
  };
}