import { OCRProcessor, ExtractedReceiptData, LineItem } from '@/lib/ocr-processor';
import { OpenAIReceiptParser } from './openai-parser';
import { ParsedReceipt, EnhancedReceiptData } from './types';
import { calculateConfidence } from './utils';

// Conditional import for client-side only
let createWorker: any = null;
if (typeof window !== 'undefined') {
  import('tesseract.js').then(module => {
    createWorker = module.createWorker;
  }).catch(err => console.warn('Tesseract.js not available:', err));
}

export class SimplifiedOCRProcessor extends OCRProcessor {
  private aiParser: OpenAIReceiptParser | null = null;
  private enableAI: boolean;
  private confidenceThreshold: number;

  constructor() {
    super();
    
    // Enable AI if explicitly set or if we can detect server-side availability
    this.enableAI = process.env.NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT === 'true' || 
                    process.env.ENABLE_AI_ENHANCEMENT === 'true' ||
                    // Auto-enable if we have any indication AI is configured
                    true; // Always try server-side endpoint
    
    this.confidenceThreshold = parseInt(
      process.env.NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD || 
      process.env.AI_CONFIDENCE_THRESHOLD || 
      '80' // Lower threshold to use AI more often
    );
    
    // No longer initialize OpenAI client-side - use server endpoint instead
    console.log('✅ AI enhancement enabled using server-side endpoint');
    console.log('🎯 AI confidence threshold:', this.confidenceThreshold);
  }

  async processImage(file: File): Promise<ExtractedReceiptData> {
    try {
      console.log('🔍 Starting enhanced OCR processing...');
      
      // Use standard OCR processing (keep it simple and fast)
      const ocrResult = await super.processImage(file);
      
      if (!this.enableAI) {
        console.log('ℹ️ AI enhancement disabled, returning OCR result');
        return ocrResult;
      }
      
      if (ocrResult.confidence >= this.confidenceThreshold) {
        console.log(`✅ OCR confidence (${ocrResult.confidence}%) meets threshold, skipping AI enhancement`);
        return ocrResult;
      }

      console.log(`⚡ OCR confidence (${ocrResult.confidence}%) below threshold, applying AI enhancement...`);
      
      try {
        // Call server-side AI enhancement endpoint
        const response = await fetch('/api/ai/enhance-ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ocrData: {
              vendor: ocrResult.vendor,
              date: ocrResult.date,
              total: ocrResult.totalAmount,
              items: ocrResult.lineItems,
              confidence: ocrResult.confidence
            },
            imageText: ocrResult.rawText || ''
          })
        });

        if (!response.ok) {
          throw new Error(`AI enhancement failed: ${response.status}`);
        }

        const aiResult = await response.json();
        
        if (aiResult.enhanced && aiResult.data) {
          console.log('✅ AI enhancement successful');
          
          // Convert AI result back to ExtractedReceiptData format
          const enhancedResult: ExtractedReceiptData = {
            vendor: aiResult.data.vendor || ocrResult.vendor,
            date: aiResult.data.date || ocrResult.date,
            totalAmount: aiResult.data.total !== undefined ? aiResult.data.total : ocrResult.totalAmount,
            subtotal: aiResult.data.subtotal !== undefined ? aiResult.data.subtotal : ocrResult.subtotal,
            tax: aiResult.data.tax !== undefined ? aiResult.data.tax : ocrResult.tax,
            currency: ocrResult.currency,
            lineItems: aiResult.data.items?.map((item: any) => ({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
              description: item.name || '',
              quantity: item.quantity || 1,
              unitPrice: item.price || 0,
              totalPrice: item.price || 0,
              category: 'Other'
            })) || ocrResult.lineItems,
            category: ocrResult.category,
            confidence: Math.max(ocrResult.confidence, aiResult.aiConfidence || 85),
            notes: ocrResult.notes,
            rawText: ocrResult.rawText,
            processing_time: ocrResult.processing_time
          };
          
          return enhancedResult;
        } else {
          console.warn('⚠️ AI enhancement returned no improvement, using OCR result');
          return ocrResult;
        }
        
      } catch (aiError) {
        console.warn('⚠️ AI enhancement failed, returning OCR result:', aiError);
        return ocrResult;
      }
    } catch (error) {
      console.error('❌ Enhanced OCR processing failed:', error);
      throw error;
    }
  }

  private async extractRawText(file: File): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      let processFile: File | string = file;
      
      if (file.type === 'application/pdf') {
        processFile = await this.convertPdfToImage(file);
      }

      let imageUrl: string;
      if (typeof processFile === 'string') {
        imageUrl = processFile;
      } else {
        imageUrl = URL.createObjectURL(processFile);
      }

      try {
        const { data } = await this.worker.recognize(imageUrl);
        return data.text;
      } finally {
        if (typeof processFile !== 'string') {
          URL.revokeObjectURL(imageUrl);
        }
      }
    } catch (error) {
      console.error('❌ Raw text extraction failed:', error);
      throw error;
    }
  }

  private mergeResults(ocrResult: ExtractedReceiptData, aiResult: ParsedReceipt): ExtractedReceiptData {
    console.log('🔄 Merging OCR and AI results...');
    
    const useAIVendor = aiResult.vendor !== 'Unknown Vendor' && aiResult.vendor.length > 2;
    const useAIDate = aiResult.date && aiResult.date !== new Date().toISOString().split('T')[0];
    const useAIAmounts = aiResult.total > 0;
    const useAIItems = aiResult.items && aiResult.items.length > 0;

    const vendor = useAIVendor ? aiResult.vendor : ocrResult.vendor;
    const date = useAIDate ? aiResult.date : ocrResult.date;
    const totalAmount = useAIAmounts ? aiResult.total : ocrResult.totalAmount;
    const subtotal = aiResult.subtotal || ocrResult.subtotal;
    const tax = aiResult.tax || ocrResult.tax;

    let lineItems: LineItem[] = ocrResult.lineItems;
    if (useAIItems) {
      lineItems = aiResult.items.map(item => ({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
        description: item.desc,
        quantity: item.quantity || 1,
        unitPrice: item.unit_price || item.price,
        totalPrice: item.price,
        category: this.categorizeItem(item.desc)
      }));
    }

    const dataCompleteness = this.calculateDataCompleteness(vendor, totalAmount, lineItems);
    const confidence = calculateConfidence(ocrResult.confidence, dataCompleteness, true);

    const mergedResult: ExtractedReceiptData = {
      vendor,
      date,
      totalAmount,
      subtotal,
      tax,
      currency: aiResult.currency || ocrResult.currency,
      lineItems,
      category: this.categorizeReceipt(vendor, lineItems),
      confidence,
      notes: ocrResult.notes,
      processingMethod: 'ai-enhanced' as any
    };

    console.log('✅ Merge complete:', {
      vendor: { ocr: ocrResult.vendor, ai: aiResult.vendor, final: vendor },
      total: { ocr: ocrResult.totalAmount, ai: aiResult.total, final: totalAmount },
      items: { ocr: ocrResult.lineItems.length, ai: aiResult.items.length, final: lineItems.length },
      confidence: { ocr: ocrResult.confidence, final: confidence }
    });

    return mergedResult;
  }

  private calculateDataCompleteness(vendor: string, total: number, items: LineItem[]): number {
    let completeness = 100;
    
    if (vendor === 'Unknown Vendor') completeness -= 20;
    if (total === 0) completeness -= 30;
    if (items.length === 0) completeness -= 25;
    
    return Math.max(completeness, 30);
  }

  private createStructuredText(ocrResult: ExtractedReceiptData): string {
    const lines = [];
    
    // Add vendor
    lines.push(`Vendor: ${ocrResult.vendor || 'Unknown'}`);
    
    // Add date
    lines.push(`Date: ${ocrResult.date || 'Unknown'}`);
    
    // Add line items
    if (ocrResult.lineItems && ocrResult.lineItems.length > 0) {
      lines.push('\nItems:');
      ocrResult.lineItems.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.description} - Qty: ${item.quantity} @ $${item.unitPrice.toFixed(2)} = $${item.totalPrice.toFixed(2)}`);
      });
    } else {
      lines.push('\nItems: None detected');
    }
    
    // Add totals
    lines.push('\nTotals:');
    lines.push(`Subtotal: $${ocrResult.subtotal.toFixed(2)}`);
    lines.push(`Tax: $${ocrResult.tax.toFixed(2)}`);
    lines.push(`Total: $${ocrResult.totalAmount.toFixed(2)}`);
    
    // Add metadata
    lines.push(`\nOCR Confidence: ${ocrResult.confidence}%`);
    lines.push(`Category: ${ocrResult.category}`);
    
    return lines.join('\n');
  }

  async getAIStatus(): Promise<any> {
    if (!this.aiParser) {
      return { enabled: false, status: 'disabled' };
    }

    try {
      const connected = await this.aiParser.testConnection();
      return {
        enabled: true,
        status: connected ? 'healthy' : 'error',
        model: process.env.NEXT_PUBLIC_AI_MODEL || 'gpt-4o-mini'
      };
    } catch (error) {
      return {
        enabled: true,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  isAIEnabled(): boolean {
    return this.aiParser !== null && this.enableAI;
  }
}