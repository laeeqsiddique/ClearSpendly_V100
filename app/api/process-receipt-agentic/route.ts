// New Agentic OCR API Endpoint
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from "@/lib/api-tenant";
import { withPermission } from "@/lib/api-middleware";
import { getAgenticOrchestrator, AgenticOCRResult } from "@/lib/ocr/agentic/orchestrator";
import { VENDOR_TYPES, VendorType } from "@/lib/ocr/agentic/types";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deployment safety check
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.RAILWAY_ENVIRONMENT && !process.env.VERCEL;

async function saveReceiptToDatabase(receiptData: any, imageUrl?: string, agenticResult?: AgenticOCRResult): Promise<string> {
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

    // Create receipt record with agentic metadata
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
        status: 'processed',
        // Store agentic processing metadata
        processing_metadata: agenticResult ? {
          agentic: true,
          vendor_type: agenticResult.metadata.vendorType,
          agents_used: agenticResult.metadata.agentsUsed,
          processing_time: agenticResult.pipeline.totalProcessingTime,
          total_cost: agenticResult.pipeline.totalCost,
          quality_score: agenticResult.quality.overallConfidence,
          improvement_over_baseline: agenticResult.quality.improvementOverBaseline,
          fallbacks_triggered: agenticResult.metadata.fallbacksTriggered
        } : null
      })
      .select('id')
      .single();
    
    if (receiptError) throw receiptError;

    // Create line items with vendor-specific data
    if (receiptData.lineItems && receiptData.lineItems.length > 0) {
      const lineItemsToInsert = receiptData.lineItems.map((item: any) => ({
        receipt_id: receipt.id,
        sku: item.sku || null,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: item.totalPrice || (item.quantity * item.unitPrice) || 0,
        category: item.category || 'Other',
        tax_deductible: true,
        // Store vendor-specific metadata
        item_metadata: item.vendorSpecificData ? {
          vendor_specific: item.vendorSpecificData
        } : null
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
  // Build-time safety
  if (isBuildTime) {
    return NextResponse.json({
      success: false,
      error: 'Agentic OCR not available during build',
      fallback: 'Use /api/process-receipt-v2 instead'
    }, { status: 503 });
  }

  return withPermission('receipts:create')(req, async (request) => {
    try {
      const startTime = Date.now();
      const { 
        imageUrl, 
        imageData, 
        fileType, 
        saveToDatabase = false,
        options = {} 
      } = await request.json();

      if (!imageUrl && !imageData) {
        return NextResponse.json({ error: "No image provided" }, { status: 400 });
      }

      // Initialize agentic orchestrator
      const orchestrator = getAgenticOrchestrator({
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        enableVendorDetection: true,
        enableSpecializedParsing: true,
        enableFallbacks: true,
        qualityThreshold: 0.7,
        costBudget: parseFloat(process.env.AGENTIC_OCR_MAX_COST || '0.05') // 5 cents default
      });

      // Process with agentic architecture
      const finalImageData = imageData || imageUrl;
      console.log(`🤖 Processing receipt with agentic OCR...`);
      console.log(`📄 Input type: ${finalImageData ? (finalImageData.startsWith('http') ? 'URL' : 'base64 data') : 'unknown'}`);
      
      const agenticStartTime = Date.now();
      const agenticResult = await orchestrator.processReceipt(finalImageData, {
        skipBaseline: options.skipBaseline || false,
        forceVendor: options.forceVendor as VendorType,
        maxCost: options.maxCost || parseFloat(process.env.AGENTIC_OCR_MAX_COST || '0.05')
      });
      const agenticEndTime = Date.now();
      
      console.log(`⏱️ Agentic OCR processing completed in ${(agenticEndTime - agenticStartTime) / 1000}s`);
      console.log(`💰 Total cost: $${agenticResult.pipeline.totalCost.toFixed(4)}`);
      console.log(`📊 Quality: ${agenticResult.quality.overallConfidence.toFixed(1)}%`);

      if (!agenticResult.success) {
        return NextResponse.json(
          { 
            error: agenticResult.error || "Agentic OCR processing failed",
            pipeline: agenticResult.pipeline,
            metadata: agenticResult.metadata
          },
          { status: 500 }
        );
      }

      // Save to database if requested
      let receiptId = null;
      if (saveToDatabase && agenticResult.data) {
        try {
          receiptId = await saveReceiptToDatabase(agenticResult.data, imageUrl, agenticResult);
          console.log(`✅ Receipt saved to database with agentic metadata: ${receiptId}`);
        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
        }
      }

      const totalTime = Date.now() - startTime;

      // Return comprehensive agentic response
      return NextResponse.json({
        success: true,
        data: agenticResult.data,
        
        // Enhanced metadata with agentic insights
        metadata: {
          // Original metadata
          provider: agenticResult.metadata.agentsUsed.join(' + '),
          processingTime: agenticResult.pipeline.totalProcessingTime,
          totalTime,
          cost: agenticResult.pipeline.totalCost,
          confidence: agenticResult.quality.overallConfidence,
          receiptId,
          
          // Agentic-specific metadata
          agentic: true,
          vendorType: agenticResult.metadata.vendorType,
          agentsUsed: agenticResult.metadata.agentsUsed,
          fallbacksTriggered: agenticResult.metadata.fallbacksTriggered,
          
          // Quality breakdown
          quality: {
            overall: agenticResult.quality.overallConfidence,
            vendorDetection: agenticResult.quality.vendorDetectionConfidence,
            parsing: agenticResult.quality.parsingQuality,
            improvementOverBaseline: agenticResult.quality.improvementOverBaseline
          },
          
          // Cost breakdown
          costBreakdown: agenticResult.metadata.costBreakdown,
          
          // Pipeline details
          pipeline: {
            stage1: {
              agent: agenticResult.pipeline.stage1_vendor_detection.agentName,
              success: agenticResult.pipeline.stage1_vendor_detection.success,
              confidence: agenticResult.pipeline.stage1_vendor_detection.confidence,
              processingTime: agenticResult.pipeline.stage1_vendor_detection.processingTime,
              cost: agenticResult.pipeline.stage1_vendor_detection.cost || 0
            },
            stage2: {
              agent: agenticResult.pipeline.stage2_parsing.agentName,
              success: agenticResult.pipeline.stage2_parsing.success,
              confidence: agenticResult.pipeline.stage2_parsing.confidence,
              processingTime: agenticResult.pipeline.stage2_parsing.processingTime,
              cost: agenticResult.pipeline.stage2_parsing.cost || 0
            }
          }
        }
      });

    } catch (error) {
      console.error('Agentic OCR error:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to process receipt with agentic OCR',
          stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
          fallback: 'Consider using /api/process-receipt-v2 for standard processing'
        },
        { status: 500 }
      );
    }
  });
}

// Health check endpoint for agentic system
export async function GET() {
  // Build-time safety
  if (isBuildTime) {
    return NextResponse.json({
      status: 'build_time',
      message: 'Agentic OCR not available during build'
    });
  }

  try {
    const orchestrator = getAgenticOrchestrator();
    const agentStatus = await orchestrator.getAgentStatus();
    
    // Estimate costs for different scenarios
    const costEstimate = await orchestrator.estimateCost('sample_image_data');
    
    return NextResponse.json({
      status: 'healthy',
      agents: agentStatus,
      costEstimates: {
        perReceipt: costEstimate,
        dailyBudgetRecommended: '$1.50', // ~30 receipts at typical cost
        monthlyBudgetRecommended: '$45.00'
      },
      capabilities: {
        vendorTypes: Object.values(VENDOR_TYPES),
        specializedParsing: [
          VENDOR_TYPES.WALMART,
          VENDOR_TYPES.HOME_DEPOT,
          VENDOR_TYPES.TARGET
        ],
        fallbackMethods: ['generic_enhanced', 'baseline_ocr']
      },
      performance: {
        expectedAccuracy: '92-96%',
        averageProcessingTime: '15-45 seconds',
        improvementOverBaseline: '8-15%'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: (error as Error).message,
        fallbackAvailable: true
      },
      { status: 500 }
    );
  }
}

// Configuration endpoint (POST)
export async function PATCH(req: NextRequest) {
  if (isBuildTime) {
    return NextResponse.json({
      error: 'Configuration not available during build'
    }, { status: 503 });
  }

  return withPermission('admin:config')(req, async (request) => {
    try {
      const { config } = await request.json();
      
      const orchestrator = getAgenticOrchestrator();
      orchestrator.updateConfig(config);
      
      const updatedStatus = await orchestrator.getAgentStatus();
      
      return NextResponse.json({
        success: true,
        message: 'Agentic OCR configuration updated',
        newConfig: updatedStatus.config
      });
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 }
      );
    }
  });
}