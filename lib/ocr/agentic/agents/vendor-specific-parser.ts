// Vendor-Specific Parsing Agent - Step 2 of Agentic Pipeline
import { 
  BaseAgent, 
  AgentResult, 
  VendorParsingResult, 
  VendorType, 
  VENDOR_TYPES,
  OCRContext,
  ExtractedReceiptData,
  LineItem,
  ParseQuality,
  VendorAgentConfig,
  VendorDetectionResult 
} from '../types';
import { MistralOCRProvider } from '../../providers/mistral-provider';
import { OpenAIProvider } from '../../providers/openai-provider';

interface VendorPromptTemplate {
  vendorType: VendorType;
  systemPrompt: string;
  userPromptTemplate: string;
  examples: Array<{
    input: string;
    output: ExtractedReceiptData;
  }>;
  postProcessingRules: string[];
}

export class VendorSpecificParsingAgent implements BaseAgent {
  readonly name: string;
  readonly type = 'parsing' as const;
  readonly config: VendorAgentConfig;
  
  private llmProvider: MistralOCRProvider | OpenAIProvider;
  private vendorPrompts: Map<VendorType, VendorPromptTemplate>;
  private fallbackGenericPrompt: string;

  constructor(config: VendorAgentConfig, primaryProvider: 'mistral' | 'openai' = 'mistral') {
    this.config = {
      timeout: 30000,
      retries: 2,
      costThreshold: 0.01,
      confidenceThreshold: 0.7,
      specialized: true,
      fallbackMode: 'prompt_enhanced',
      ...config
    };
    
    this.name = `vendor-parser-${config.vendorTypes.join('-')}`;
    this.llmProvider = primaryProvider === 'mistral' 
      ? new MistralOCRProvider()
      : new OpenAIProvider();
    
    this.vendorPrompts = this.initializeVendorPrompts();
    this.fallbackGenericPrompt = this.createFallbackPrompt();
  }

  async process(input: {
    context: OCRContext;
    vendorDetection: VendorDetectionResult;
  }): Promise<AgentResult<VendorParsingResult>> {
    const startTime = Date.now();
    
    try {
      const { context, vendorDetection } = input;
      
      // Select appropriate parsing strategy
      const promptTemplate = this.selectParsingStrategy(vendorDetection.vendorType);
      
      // Generate vendor-specific prompt
      const prompt = this.buildVendorSpecificPrompt(
        context.rawText,
        promptTemplate,
        vendorDetection
      );
      
      // Process with LLM
      const llmResult = await this.llmProvider.process(prompt);
      
      if (!llmResult.success || !llmResult.data) {
        throw new Error('LLM processing failed');
      }

      // Parse and validate result
      const extractedData = this.parseAndValidateResult(llmResult.data, promptTemplate);
      const parseQuality = this.assessParseQuality(extractedData, context, vendorDetection);
      
      const result: VendorParsingResult = {
        extractedData,
        parseQuality,
        vendorSpecificFields: this.extractVendorSpecificFields(extractedData, vendorDetection.vendorType),
        warnings: parseQuality.suspiciousPatterns
      };

      return {
        success: true,
        data: result,
        confidence: parseQuality.overallScore,
        processingTime: Date.now() - startTime,
        cost: llmResult.cost || 0,
        agentName: this.name,
        metadata: {
          vendorType: vendorDetection.vendorType,
          parsingStrategy: promptTemplate ? 'vendor_specific' : 'generic_enhanced',
          llmProvider: this.llmProvider.name,
          qualityBreakdown: parseQuality
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parsing failed',
        confidence: 0,
        processingTime: Date.now() - startTime,
        agentName: this.name
      };
    }
  }

  canHandle(input: { vendorDetection: VendorDetectionResult }): boolean {
    return this.config.vendorTypes.includes(input.vendorDetection.vendorType) ||
           input.vendorDetection.fallbackToGeneric;
  }

  getCost(): number {
    return this.llmProvider.getCostPerPage();
  }

  getAccuracy(): number {
    return 0.92; // Enhanced accuracy with vendor-specific prompts
  }

  private initializeVendorPrompts(): Map<VendorType, VendorPromptTemplate> {
    const prompts = new Map<VendorType, VendorPromptTemplate>();

    // Walmart-specific prompt
    prompts.set(VENDOR_TYPES.WALMART, {
      vendorType: VENDOR_TYPES.WALMART,
      systemPrompt: `You are an expert at parsing Walmart receipts. You understand Walmart's specific format including:
- Bulk pricing patterns like "6 AT 1 FOR 0.78" (meaning 6 items at $1 each, special price $0.78 total)
- Tax codes (T = Taxable, F = Food Stamp eligible, N = Non-taxable)
- Store and terminal codes (ST#, TC#)
- UPC codes and item descriptions
- Multi-line item entries where quantities and descriptions may be split

CRITICAL PARSING RULES:
1. "X AT Y FOR Z" means X items at Y price each, but total is Z (bulk discount)
2. Items ending in T are taxable, F are food stamp eligible
3. Subtotal + Tax should equal Total (validate math)
4. Each line item should have: description, quantity, unit price, total price`,
      
      userPromptTemplate: `Parse this Walmart receipt text and extract structured data:

{raw_text}

VENDOR INDICATORS FOUND: {vendor_indicators}

Return JSON with exact structure:
{
  "vendor": "Walmart",
  "date": "YYYY-MM-DD",
  "totalAmount": 0.00,
  "subtotal": 0.00,
  "tax": 0.00,
  "currency": "USD",
  "lineItems": [
    {
      "id": "uuid",
      "description": "item description",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "category": "category",
      "sku": "upc_if_available"
    }
  ],
  "category": "Retail",
  "confidence": 85,
  "receiptNumber": "if_found",
  "paymentMethod": "if_found"
}`,
      
      examples: [
        {
          input: `WALMART SUPERCENTER
ST# 1234 TC# 56
GREAT VALUE BREAD    1.28 T
6 AT 1 FOR 0.78
BANANAS 3.2LB @ 0.58/LB  1.86 F
MILK 1GAL            3.68 F
SUBTOTAL            7.82
TAX                 0.13
TOTAL               7.95`,
          
          output: {
            vendor: "Walmart",
            date: "2024-01-15",
            totalAmount: 7.95,
            subtotal: 7.82,
            tax: 0.13,
            currency: "USD",
            lineItems: [
              {
                id: "1",
                description: "Great Value Bread",
                quantity: 6,
                unitPrice: 1.00,
                totalPrice: 0.78,
                category: "Food & Groceries"
              },
              {
                id: "2", 
                description: "Bananas",
                quantity: 3.2,
                unitPrice: 0.58,
                totalPrice: 1.86,
                category: "Food & Groceries"
              },
              {
                id: "3",
                description: "Milk 1 Gallon",
                quantity: 1,
                unitPrice: 3.68,
                totalPrice: 3.68,
                category: "Food & Groceries"
              }
            ],
            category: "Retail",
            confidence: 90
          }
        }
      ],
      postProcessingRules: [
        'Handle bulk pricing (X AT Y FOR Z) correctly',
        'Parse weight-based pricing (LB @ price)',
        'Identify tax codes (T/F/N)',
        'Validate math: subtotal + tax = total'
      ]
    });

    // Home Depot-specific prompt
    prompts.set(VENDOR_TYPES.HOME_DEPOT, {
      vendorType: VENDOR_TYPES.HOME_DEPOT,
      systemPrompt: `You are an expert at parsing Home Depot receipts. You understand:
- SKU numbers and department codes
- Contractor pricing and bulk discounts
- Tool rental vs purchase items
- Per-unit pricing (EA, SQ FT, etc.)
- Pro desk vs regular pricing`,
      
      userPromptTemplate: `Parse this Home Depot receipt:

{raw_text}

VENDOR INDICATORS: {vendor_indicators}

Extract structured data focusing on:
- SKU numbers when present
- Department classifications
- Unit measurements (EA, SQ FT, etc.)
- Any contractor or pro pricing`,
      
      examples: [],
      postProcessingRules: [
        'Extract SKU numbers',
        'Classify by department',
        'Handle per-unit pricing',
        'Identify contractor discounts'
      ]
    });

    // Add more vendor-specific prompts as needed...

    return prompts;
  }

  private createFallbackPrompt(): string {
    return `You are an expert receipt parser. Parse the following receipt text and extract structured data.

Pay special attention to:
- Complex pricing patterns and bulk discounts
- Multi-line items where description and price may be separated
- Tax calculations and line-item categorization
- Store-specific formatting quirks

{raw_text}

VENDOR CONTEXT: {vendor_context}

Return properly structured JSON with accurate line items, quantities, prices, and totals.`;
  }

  private selectParsingStrategy(vendorType: VendorType): VendorPromptTemplate | null {
    if (this.config.specialized && this.vendorPrompts.has(vendorType)) {
      return this.vendorPrompts.get(vendorType)!;
    }
    
    // If no specific prompt exists, use enhanced generic parsing
    return null;
  }

  private buildVendorSpecificPrompt(
    rawText: string,
    template: VendorPromptTemplate | null,
    vendorDetection: VendorDetectionResult
  ): string {
    if (template) {
      return template.systemPrompt + '\n\n' + 
             template.userPromptTemplate
               .replace('{raw_text}', rawText)
               .replace('{vendor_indicators}', vendorDetection.indicators.join(', '));
    } else {
      // Use enhanced generic prompt with vendor context
      return this.fallbackGenericPrompt
        .replace('{raw_text}', rawText)
        .replace('{vendor_context}', `Detected vendor: ${vendorDetection.vendorType}, Confidence: ${vendorDetection.confidence}`);
    }
  }

  private parseAndValidateResult(
    llmData: any,
    template: VendorPromptTemplate | null
  ): ExtractedReceiptData {
    // Apply vendor-specific post-processing rules
    if (template) {
      return this.applyVendorSpecificRules(llmData, template);
    }
    
    // Generic validation and parsing
    return this.applyGenericValidation(llmData);
  }

  private applyVendorSpecificRules(
    data: any,
    template: VendorPromptTemplate
  ): ExtractedReceiptData {
    let processedData = { ...data };

    switch (template.vendorType) {
      case VENDOR_TYPES.WALMART:
        processedData = this.applyWalmartRules(processedData);
        break;
      case VENDOR_TYPES.HOME_DEPOT:
        processedData = this.applyHomeDepotRules(processedData);
        break;
      // Add more vendor-specific rule applications
    }

    return this.applyGenericValidation(processedData);
  }

  private applyWalmartRules(data: any): any {
    // Handle bulk pricing patterns
    if (data.lineItems) {
      data.lineItems = data.lineItems.map((item: any) => {
        // Check for bulk pricing in description
        const bulkMatch = item.description?.match(/(\d+)\s+AT\s+[\d.]+\s+FOR\s+\$([\d.]+)/i);
        if (bulkMatch) {
          const quantity = parseInt(bulkMatch[1]);
          const totalPrice = parseFloat(bulkMatch[2]);
          
          return {
            ...item,
            quantity,
            unitPrice: totalPrice / quantity,
            totalPrice,
            vendorSpecificData: {
              bulkPricing: true,
              originalDescription: item.description
            }
          };
        }
        return item;
      });
    }

    return data;
  }

  private applyHomeDepotRules(data: any): any {
    // Extract SKU information and department codes
    if (data.lineItems) {
      data.lineItems = data.lineItems.map((item: any) => {
        const skuMatch = item.description?.match(/SKU\s*#?\s*(\d+)/i);
        if (skuMatch) {
          return {
            ...item,
            sku: skuMatch[1],
            vendorSpecificData: {
              hasSkuCode: true
            }
          };
        }
        return item;
      });
    }

    return data;
  }

  private applyGenericValidation(data: any): ExtractedReceiptData {
    // Ensure all required fields exist with defaults
    const validated: ExtractedReceiptData = {
      vendor: data.vendor || 'Unknown',
      date: this.validateDate(data.date) || new Date().toISOString().split('T')[0],
      totalAmount: this.validateNumber(data.totalAmount) || 0,
      subtotal: this.validateNumber(data.subtotal) || 0,
      tax: this.validateNumber(data.tax) || 0,
      currency: data.currency || 'USD',
      lineItems: this.validateLineItems(data.lineItems || []),
      category: data.category || 'Other',
      confidence: Math.min(100, Math.max(0, data.confidence || 75)),
      notes: data.notes,
      rawText: data.rawText,
      receiptNumber: data.receiptNumber,
      paymentMethod: data.paymentMethod
    };

    return validated;
  }

  private validateLineItems(items: any[]): LineItem[] {
    return items.map((item, index) => ({
      id: item.id || `item-${index}`,
      description: item.description || 'Unknown Item',
      quantity: this.validateNumber(item.quantity) || 1,
      unitPrice: this.validateNumber(item.unitPrice) || 0,
      totalPrice: this.validateNumber(item.totalPrice) || 0,
      category: item.category || 'Other',
      sku: item.sku,
      vendorSpecificData: item.vendorSpecificData
    }));
  }

  private validateNumber(value: any): number | null {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? null : num;
  }

  private validateDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }

  private assessParseQuality(
    data: ExtractedReceiptData,
    context: OCRContext,
    vendorDetection: VendorDetectionResult
  ): ParseQuality {
    const quality: ParseQuality = {
      overallScore: 0,
      lineItemAccuracy: 0,
      mathConsistency: 0,
      vendorFormatMatch: 0,
      missingFields: [],
      suspiciousPatterns: []
    };

    // Math consistency check
    const calculatedTotal = data.subtotal + data.tax;
    const mathDiff = Math.abs(calculatedTotal - data.totalAmount);
    quality.mathConsistency = mathDiff < 0.02 ? 100 : Math.max(0, 100 - mathDiff * 50);

    // Line item accuracy
    const validItems = data.lineItems.filter(item => 
      item.description && item.description !== 'Unknown Item' &&
      item.totalPrice > 0
    );
    quality.lineItemAccuracy = data.lineItems.length > 0 
      ? (validItems.length / data.lineItems.length) * 100 
      : 50;

    // Vendor format match based on detection confidence
    quality.vendorFormatMatch = vendorDetection.confidence * 100;

    // Check for missing critical fields
    if (!data.vendor || data.vendor === 'Unknown') quality.missingFields.push('vendor');
    if (!data.date) quality.missingFields.push('date');
    if (data.totalAmount <= 0) quality.missingFields.push('totalAmount');

    // Identify suspicious patterns
    if (mathDiff > 1) quality.suspiciousPatterns.push('Math inconsistency detected');
    if (data.lineItems.length === 0) quality.suspiciousPatterns.push('No line items found');
    if (data.confidence < 50) quality.suspiciousPatterns.push('Low parsing confidence');

    // Calculate overall score
    quality.overallScore = (
      quality.mathConsistency * 0.3 +
      quality.lineItemAccuracy * 0.4 +
      quality.vendorFormatMatch * 0.2 +
      (100 - quality.missingFields.length * 20) * 0.1
    );

    return quality;
  }

  private extractVendorSpecificFields(
    data: ExtractedReceiptData,
    vendorType: VendorType
  ): Record<string, any> {
    const vendorFields: Record<string, any> = {
      vendorType
    };

    switch (vendorType) {
      case VENDOR_TYPES.WALMART:
        vendorFields.bulkItemsCount = data.lineItems.filter(
          item => item.vendorSpecificData?.bulkPricing
        ).length;
        break;
      
      case VENDOR_TYPES.HOME_DEPOT:
        vendorFields.skuItemsCount = data.lineItems.filter(
          item => item.sku
        ).length;
        break;
    }

    return vendorFields;
  }
}

// Factory functions for different vendor configurations
export function createWalmartParser(primaryProvider: 'mistral' | 'openai' = 'mistral'): VendorSpecificParsingAgent {
  return new VendorSpecificParsingAgent({
    name: 'walmart-parser',
    priority: 1,
    timeout: 30000,
    retries: 2,
    costThreshold: 0.01,
    confidenceThreshold: 0.7,
    vendorTypes: [VENDOR_TYPES.WALMART],
    specialized: true,
    fallbackMode: 'prompt_enhanced'
  }, primaryProvider);
}

export function createHomeDepotParser(primaryProvider: 'mistral' | 'openai' = 'mistral'): VendorSpecificParsingAgent {
  return new VendorSpecificParsingAgent({
    name: 'homedepot-parser',
    priority: 1,
    timeout: 30000,
    retries: 2,
    costThreshold: 0.01,
    confidenceThreshold: 0.7,
    vendorTypes: [VENDOR_TYPES.HOME_DEPOT],
    specialized: true,
    fallbackMode: 'prompt_enhanced'
  }, primaryProvider);
}

export function createGenericParser(primaryProvider: 'mistral' | 'openai' = 'mistral'): VendorSpecificParsingAgent {
  return new VendorSpecificParsingAgent({
    name: 'generic-parser',
    priority: 10, // Lower priority
    timeout: 30000,
    retries: 2,
    costThreshold: 0.01,
    confidenceThreshold: 0.5,
    vendorTypes: [VENDOR_TYPES.GENERIC, VENDOR_TYPES.UNKNOWN],
    specialized: false,
    fallbackMode: 'prompt_enhanced'
  }, primaryProvider);
}