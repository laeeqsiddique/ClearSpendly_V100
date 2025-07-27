// Enhanced OCR Processor with AI Integration (Browser Only)
import { OCRProcessor, ExtractedReceiptData } from '../ocr-processor';
import { AIReceiptParser } from './receipt-parser';
import { getAIConfig, isAIEnabled } from './config';
import { AIAgentConfig, ParsedReceiptData } from './types';

export class EnhancedOCRProcessor extends OCRProcessor {
  private aiParser: AIReceiptParser | null = null;
  private aiConfig: AIAgentConfig | null = null;

  constructor(enableAI: boolean = true) {
    super();
    
    // Only initialize AI in browser environment
    if (typeof window !== 'undefined' && enableAI && isAIEnabled()) {
      try {
        this.aiConfig = getAIConfig();
        this.aiParser = new AIReceiptParser(this.aiConfig);
        console.log('🤖 AI enhancement enabled with', this.aiConfig.modelName);
      } catch (error) {
        console.warn('⚠️ AI enhancement initialization failed:', error);
        this.aiParser = null;
      }
    } else if (typeof window === 'undefined') {
      console.log('🌐 Server-side environment detected, AI enhancement disabled for this context');
    }
  }

  async processImage(imageFile: File): Promise<ExtractedReceiptData> {
    console.log('🔍 ENHANCED OCR PROCESSOR: Starting image processing...');
    console.log('🌐 Environment check:', typeof window !== 'undefined' ? 'Browser' : 'Server');
    console.log('🤖 AI Parser enabled:', this.aiParser !== null);
    console.log('⚙️ AI Config:', this.aiConfig?.modelName || 'Not configured');
    console.log('📁 File info:', { 
      name: imageFile.name, 
      size: imageFile.size, 
      type: imageFile.type 
    });
    
    // Step 1: Get raw OCR text and basic parsing
    const startTime = Date.now();
    console.log('📝 ENHANCED OCR: Starting base OCR processing...');
    const rawOCRResult = await super.processImage(imageFile);
    const ocrTime = Date.now() - startTime;
    
    console.log(`📝 ENHANCED OCR: Base OCR completed in ${ocrTime}ms`);
    console.log(`📊 ENHANCED OCR: Base OCR confidence: ${rawOCRResult.confidence}%`);
    console.log('📄 ENHANCED OCR: Base OCR result preview:', {
      vendor: rawOCRResult.vendor,
      totalAmount: rawOCRResult.totalAmount,
      lineItemsCount: rawOCRResult.lineItems?.length || 0
    });

    // Step 2: Try AI enhancement if available
    if (this.aiParser && rawOCRResult.confidence < 95) {
      try {
        console.log('🤖 ENHANCED OCR: AI Parser available, starting AI enhancement...');
        console.log(`🎯 ENHANCED OCR: Confidence threshold check: ${rawOCRResult.confidence}% < 95% = ${rawOCRResult.confidence < 95}`);
        
        // Create text representation from OCR result for AI processing
        console.log('📝 ENHANCED OCR: Creating text representation from OCR result for AI...');
        const rawText = this.createTextFromOCRResult(rawOCRResult);
        console.log('📝 ENHANCED OCR: Text created for AI, length:', rawText.length);
        console.log('📝 ENHANCED OCR: Text preview:', rawText.substring(0, 200) + '...');
        
        console.log('🤖 ENHANCED OCR: Checking AI connection before processing...');
        const connectionOk = await this.aiParser.getProviderStatus();
        if (connectionOk.status !== 'healthy') {
          throw new Error(`AI provider not ready: ${connectionOk.status}`);
        }
        
        console.log('🤖 ENHANCED OCR: Sending to AI parser...');
        const aiStartTime = Date.now();
        const aiResult = await this.aiParser.parseReceiptText(rawText);
        const aiProcessingTime = Date.now() - aiStartTime;
        console.log(`🤖 ENHANCED OCR: AI processing took ${aiProcessingTime}ms`);
        
        if (aiResult.success && aiResult.data) {
          console.log(`✨ ENHANCED OCR: AI enhancement completed in ${aiResult.processingTime}ms`);
          console.log(`🎯 ENHANCED OCR: AI confidence: ${aiResult.data.confidence}%`);
          console.log('🤖 ENHANCED OCR: AI result preview:', {
            vendor: aiResult.data.vendor,
            totalAmount: aiResult.data.totalAmount,
            lineItemsCount: aiResult.data.lineItems?.length || 0
          });
          
          // Merge AI results with OCR results
          console.log('🔄 ENHANCED OCR: Merging AI results with OCR results...');
          const mergedResult = this.mergeResults(rawOCRResult, aiResult.data);
          
          console.log('✅ ENHANCED OCR: Using AI-enhanced data');
          return mergedResult;
        } else {
          console.log('⚠️ ENHANCED OCR: AI enhancement failed, using base OCR:', aiResult.error);
        }
      } catch (error) {
        console.error('❌ ENHANCED OCR: AI enhancement error:', error);
      }
    } else {
      if (!this.aiParser) {
        console.log('🚫 ENHANCED OCR: AI Parser not available');
      } else {
        console.log(`🚫 ENHANCED OCR: Confidence too high (${rawOCRResult.confidence}% >= 95%), skipping AI enhancement`);
      }
    }

    // Step 3: Return base OCR results
    console.log('📄 Using base OCR results');
    return rawOCRResult;
  }

  private async extractRawText(imageFile: File): Promise<string> {
    try {
      console.log('📝 ENHANCED OCR: Extracting raw text - getting existing OCR text...');
      
      // Instead of running OCR again, let's use the text that was already extracted
      // We can get this from the parent OCR processor's last run
      if (!this.worker) {
        await this.initialize();
      }

      // Try to use a simpler approach - just get the text from a fresh OCR run
      console.log('📝 ENHANCED OCR: Creating blob URL for re-processing...');
      const imageUrl = URL.createObjectURL(imageFile);

      try {
        console.log('📝 ENHANCED OCR: Running Tesseract recognition for raw text...');
        const { data } = await this.worker!.recognize(imageUrl);
        console.log('📝 ENHANCED OCR: Raw text extraction successful, length:', data.text.length);
        return data.text;
      } finally {
        URL.revokeObjectURL(imageUrl);
      }
    } catch (error) {
      console.warn('⚠️ ENHANCED OCR: Failed to extract raw text, using fallback approach:', error);
      
      // Fallback: Create a simple text representation from the base OCR result
      // This is not ideal but better than failing completely
      return `Receipt processing failed to extract raw text. Using basic fallback text representation.
File: ${imageFile.name}
Size: ${imageFile.size} bytes
Type: ${imageFile.type}

Please note: Raw text extraction failed, AI enhancement may be limited.`;
    }
  }

  private createTextFromOCRResult(ocrResult: ExtractedReceiptData): string {
    // Create a text representation from the structured OCR result
    // This gives the AI something to work with even if raw text extraction fails
    
    const lines = [];
    
    if (ocrResult.vendor) {
      lines.push(ocrResult.vendor);
    }
    
    if (ocrResult.date) {
      lines.push(ocrResult.date);
    }
    
    lines.push(''); // Empty line
    
    // Add line items
    if (ocrResult.lineItems && ocrResult.lineItems.length > 0) {
      ocrResult.lineItems.forEach(item => {
        const line = `${item.description}${item.quantity > 1 ? ` ${item.quantity}x` : ''} $${item.totalPrice.toFixed(2)}`;
        lines.push(line);
      });
      lines.push(''); // Empty line
    }
    
    // Add totals
    if (ocrResult.subtotal) {
      lines.push(`SUBTOTAL $${ocrResult.subtotal.toFixed(2)}`);
    }
    if (ocrResult.tax) {
      lines.push(`TAX $${ocrResult.tax.toFixed(2)}`);
    }
    if (ocrResult.totalAmount) {
      lines.push(`TOTAL $${ocrResult.totalAmount.toFixed(2)}`);
    }
    
    const result = lines.join('\n');
    console.log('📝 ENHANCED OCR: Created text from OCR result:', result.substring(0, 150) + '...');
    return result;
  }

  private mergeResults(
    ocrResult: ExtractedReceiptData, 
    aiResult: ParsedReceiptData
  ): ExtractedReceiptData {
    // Use AI data as primary, fall back to OCR for missing fields
    const merged: ExtractedReceiptData = {
      vendor: aiResult.vendor || ocrResult.vendor,
      date: aiResult.date || ocrResult.date,
      totalAmount: aiResult.totalAmount || ocrResult.totalAmount,
      subtotal: aiResult.subtotal || ocrResult.subtotal,
      tax: aiResult.tax || ocrResult.tax,
      currency: aiResult.currency || ocrResult.currency,
      lineItems: this.mergeLineItems(ocrResult.lineItems, aiResult.lineItems),
      category: ocrResult.category, // Keep existing category logic
      confidence: this.calculateMergedConfidence(ocrResult.confidence, aiResult.confidence),
      notes: this.mergeNotes(ocrResult.notes, aiResult.parsingNotes)
    };

    return merged;
  }

  private mergeLineItems(
    ocrItems: ExtractedReceiptData['lineItems'],
    aiItems: ParsedReceiptData['lineItems']
  ): ExtractedReceiptData['lineItems'] {
    // Prefer AI line items if they exist and look reasonable
    if (aiItems && aiItems.length > 0) {
      return aiItems.map((item, index) => ({
        id: `ai-item-${index}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: 'general' // Default category, could be enhanced
      }));
    }
    
    return ocrItems;
  }

  private calculateMergedConfidence(ocrConfidence: number, aiConfidence: number): number {
    // Use weighted average, favoring AI if it's confident
    const ocrWeight = 0.3;
    const aiWeight = 0.7;
    
    return Math.round((ocrConfidence * ocrWeight) + (aiConfidence * aiWeight));
  }

  private mergeNotes(ocrNotes: string, aiNotes: string): string {
    const notes = [];
    
    if (ocrNotes) notes.push(`OCR: ${ocrNotes}`);
    if (aiNotes) notes.push(`AI: ${aiNotes}`);
    
    return notes.join(' | ');
  }

  async getAIStatus() {
    if (!this.aiParser) {
      return { enabled: false, status: 'disabled' };
    }

    try {
      const status = await this.aiParser.getProviderStatus();
      return {
        enabled: true,
        status: status.status,
        modelLoaded: status.modelLoaded,
        responseTime: status.responseTime,
        model: this.aiConfig?.modelName
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
    return this.aiParser !== null;
  }
}