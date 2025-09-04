// Fallback Management System for Agentic OCR
import { 
  AgentResult,
  VendorDetectionResult, 
  VendorParsingResult,
  ExtractedReceiptData,
  OCRContext,
  VENDOR_TYPES,
  VendorType,
  BaseAgent
} from './types';
import { getOCRService } from '../ocr-service';
import { OCRResult } from '../types';

export interface FallbackStrategy {
  name: string;
  priority: number;
  canHandle(context: FallbackContext): boolean;
  execute(context: FallbackContext): Promise<AgentResult<any>>;
  cost: number;
  expectedAccuracy: number;
}

export interface FallbackContext {
  originalContext: OCRContext;
  failedAgents: string[];
  errorMessages: string[];
  vendorDetection?: VendorDetectionResult;
  partialResults?: any[];
  costBudgetRemaining: number;
  timeElapsed: number;
}

export interface FallbackResult {
  success: boolean;
  data?: ExtractedReceiptData;
  strategy: string;
  cost: number;
  confidence: number;
  processingTime: number;
  metadata: {
    strategiesAttempted: string[];
    originalFailures: string[];
    recoveryMethod: string;
  };
}

export class FallbackManager {
  private strategies: FallbackStrategy[] = [];
  private baselineOCRService: any;
  private maxFallbackAttempts = 3;
  private maxTotalCost = 0.1; // 10 cents max for fallback attempts

  constructor() {
    this.baselineOCRService = getOCRService();
    this.initializeFallbackStrategies();
  }

  async handleFailure(context: FallbackContext): Promise<FallbackResult> {
    const startTime = Date.now();
    const strategiesAttempted: string[] = [];
    let totalCost = 0;

    console.log(`🔄 Initiating fallback recovery for failed agents: ${context.failedAgents.join(', ')}`);

    // Sort strategies by priority and filter by availability
    const availableStrategies = this.strategies
      .filter(s => s.canHandle(context))
      .filter(s => s.cost <= context.costBudgetRemaining)
      .sort((a, b) => a.priority - b.priority);

    if (availableStrategies.length === 0) {
      return {
        success: false,
        strategy: 'none_available',
        cost: 0,
        confidence: 0,
        processingTime: Date.now() - startTime,
        metadata: {
          strategiesAttempted: [],
          originalFailures: context.errorMessages,
          recoveryMethod: 'no_fallback_available'
        }
      };
    }

    // Try strategies in order of priority
    for (const strategy of availableStrategies.slice(0, this.maxFallbackAttempts)) {
      if (totalCost >= this.maxTotalCost) {
        console.warn('Fallback cost budget exceeded, stopping attempts');
        break;
      }

      try {
        console.log(`🔄 Attempting fallback strategy: ${strategy.name}`);
        
        const result = await strategy.execute({
          ...context,
          costBudgetRemaining: context.costBudgetRemaining - totalCost
        });

        strategiesAttempted.push(strategy.name);
        totalCost += result.cost || 0;

        if (result.success && this.isResultAcceptable(result)) {
          console.log(`✅ Fallback strategy ${strategy.name} succeeded`);
          
          return {
            success: true,
            data: this.extractDataFromResult(result),
            strategy: strategy.name,
            cost: totalCost,
            confidence: result.confidence,
            processingTime: Date.now() - startTime,
            metadata: {
              strategiesAttempted,
              originalFailures: context.errorMessages,
              recoveryMethod: 'strategy_success'
            }
          };
        }

      } catch (error) {
        console.warn(`Fallback strategy ${strategy.name} failed:`, error);
        strategiesAttempted.push(`${strategy.name}_failed`);
      }
    }

    // All strategies failed
    return {
      success: false,
      strategy: 'all_failed',
      cost: totalCost,
      confidence: 0,
      processingTime: Date.now() - startTime,
      metadata: {
        strategiesAttempted,
        originalFailures: context.errorMessages,
        recoveryMethod: 'all_strategies_failed'
      }
    };
  }

  private initializeFallbackStrategies(): void {
    // Strategy 1: Baseline OCR Service Fallback
    this.strategies.push({
      name: 'baseline_ocr_fallback',
      priority: 1,
      cost: 0.005, // Typical baseline cost
      expectedAccuracy: 0.8,
      
      canHandle: (context: FallbackContext) => {
        // Available if we have image data and haven't tried baseline yet
        return !!(context.originalContext.imageData || context.originalContext.imageUrl) &&
               !context.failedAgents.includes('baseline_ocr');
      },
      
      execute: async (context: FallbackContext): Promise<AgentResult<VendorParsingResult>> => {
        const startTime = Date.now();
        
        try {
          const imageData = context.originalContext.imageData || context.originalContext.imageUrl;
          const result = await this.baselineOCRService.processReceipt(imageData!);
          
          if (result.success && result.data) {
            // Convert baseline result to agentic format
            const extractedData: ExtractedReceiptData = {
              vendor: result.data.vendor,
              date: result.data.date,
              totalAmount: result.data.totalAmount,
              subtotal: result.data.subtotal,
              tax: result.data.tax,
              currency: result.data.currency,
              lineItems: result.data.lineItems || [],
              category: result.data.category,
              confidence: result.data.confidence || result.confidence,
              notes: result.data.notes,
              rawText: result.data.rawText,
              receiptNumber: result.data.receiptNumber,
              paymentMethod: result.data.paymentMethod
            };

            const vendorParsingResult: VendorParsingResult = {
              extractedData,
              parseQuality: {
                overallScore: result.confidence,
                lineItemAccuracy: 75, // Estimated
                mathConsistency: 80,   // Estimated  
                vendorFormatMatch: 60, // Generic parsing
                missingFields: [],
                suspiciousPatterns: []
              },
              vendorSpecificFields: {},
              warnings: ['Fallback to baseline OCR']
            };

            return {
              success: true,
              data: vendorParsingResult,
              confidence: result.confidence,
              processingTime: Date.now() - startTime,
              cost: result.cost,
              agentName: 'baseline_ocr_fallback'
            };
          }
          
          throw new Error(result.error || 'Baseline OCR failed');
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Baseline fallback failed',
            confidence: 0,
            processingTime: Date.now() - startTime,
            cost: 0,
            agentName: 'baseline_ocr_fallback'
          };
        }
      }
    });

    // Strategy 2: Generic LLM Parsing with Enhanced Prompts
    this.strategies.push({
      name: 'enhanced_generic_parsing',
      priority: 2,
      cost: 0.01,
      expectedAccuracy: 0.75,
      
      canHandle: (context: FallbackContext) => {
        return !!(context.originalContext.rawText) &&
               !context.failedAgents.includes('enhanced_generic_parsing');
      },
      
      execute: async (context: FallbackContext): Promise<AgentResult<VendorParsingResult>> => {
        const startTime = Date.now();
        
        try {
          // Import generic parser
          const { createGenericParser } = await import('./agents/vendor-specific-parser');
          const genericParser = createGenericParser();
          
          // Enhanced context with failure information
          const enhancedPrompt = this.buildEnhancedGenericPrompt(
            context.originalContext.rawText,
            context.errorMessages,
            context.vendorDetection
          );
          
          // Use generic parser with enhanced context
          const result = await genericParser.process({
            context: {
              ...context.originalContext,
              rawText: enhancedPrompt,
              processingHints: [
                'fallback_mode',
                'enhanced_generic_parsing',
                ...context.errorMessages.map(e => `previous_failure: ${e}`)
              ]
            },
            vendorDetection: context.vendorDetection || {
              vendorType: VENDOR_TYPES.GENERIC,
              confidence: 0.5,
              indicators: ['Fallback parsing'],
              fallbackToGeneric: true
            }
          });

          return {
            ...result,
            agentName: 'enhanced_generic_parsing_fallback',
            metadata: {
              ...result.metadata,
              fallbackContext: {
                originalFailures: context.errorMessages,
                enhancedPrompt: true
              }
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Enhanced generic parsing failed',
            confidence: 0,
            processingTime: Date.now() - startTime,
            cost: 0,
            agentName: 'enhanced_generic_parsing_fallback'
          };
        }
      }
    });

    // Strategy 3: Pattern-Based Extraction (Rule-based fallback)
    this.strategies.push({
      name: 'pattern_based_extraction',
      priority: 3,
      cost: 0, // No API cost for rule-based
      expectedAccuracy: 0.6,
      
      canHandle: (context: FallbackContext) => {
        return !!(context.originalContext.rawText) &&
               !context.failedAgents.includes('pattern_based_extraction');
      },
      
      execute: async (context: FallbackContext): Promise<AgentResult<VendorParsingResult>> => {
        const startTime = Date.now();
        
        try {
          const extractedData = this.extractUsingPatterns(context.originalContext.rawText);
          
          const vendorParsingResult: VendorParsingResult = {
            extractedData,
            parseQuality: {
              overallScore: 60,
              lineItemAccuracy: 50,
              mathConsistency: 70,
              vendorFormatMatch: 40,
              missingFields: this.identifyMissingFields(extractedData),
              suspiciousPatterns: ['Pattern-based extraction used']
            },
            vendorSpecificFields: {},
            warnings: ['Rule-based pattern extraction', 'Low accuracy expected']
          };

          return {
            success: true,
            data: vendorParsingResult,
            confidence: 60,
            processingTime: Date.now() - startTime,
            cost: 0,
            agentName: 'pattern_based_extraction_fallback'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Pattern extraction failed',
            confidence: 0,
            processingTime: Date.now() - startTime,
            cost: 0,
            agentName: 'pattern_based_extraction_fallback'
          };
        }
      }
    });

    // Strategy 4: Partial Data Recovery
    this.strategies.push({
      name: 'partial_data_recovery',
      priority: 4,
      cost: 0,
      expectedAccuracy: 0.4,
      
      canHandle: (context: FallbackContext) => {
        return !!(context.partialResults && context.partialResults.length > 0);
      },
      
      execute: async (context: FallbackContext): Promise<AgentResult<VendorParsingResult>> => {
        const startTime = Date.now();
        
        try {
          const extractedData = this.recoverPartialData(
            context.partialResults!,
            context.originalContext.rawText
          );
          
          const vendorParsingResult: VendorParsingResult = {
            extractedData,
            parseQuality: {
              overallScore: 40,
              lineItemAccuracy: 30,
              mathConsistency: 50,
              vendorFormatMatch: 30,
              missingFields: this.identifyMissingFields(extractedData),
              suspiciousPatterns: ['Partial data recovery', 'Incomplete information']
            },
            vendorSpecificFields: {},
            warnings: ['Partial data recovery used', 'Some information may be missing or inaccurate']
          };

          return {
            success: true,
            data: vendorParsingResult,
            confidence: 40,
            processingTime: Date.now() - startTime,
            cost: 0,
            agentName: 'partial_data_recovery_fallback'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Partial recovery failed',
            confidence: 0,
            processingTime: Date.now() - startTime,
            cost: 0,
            agentName: 'partial_data_recovery_fallback'
          };
        }
      }
    });
  }

  private buildEnhancedGenericPrompt(
    rawText: string,
    errorMessages: string[],
    vendorDetection?: VendorDetectionResult
  ): string {
    const failureContext = errorMessages.length > 0 
      ? `\n\nPREVIOUS PARSING FAILURES:\n${errorMessages.join('\n')}\n\nPlease be extra careful with:`
      : '';
    
    const vendorContext = vendorDetection
      ? `\n\nVENDOR DETECTION RESULT:\nDetected: ${vendorDetection.vendorType} (${vendorDetection.confidence * 100}% confidence)\nIndicators: ${vendorDetection.indicators.join(', ')}`
      : '';

    return `You are an expert receipt parser in fallback mode. Parse this receipt carefully.

${failureContext}
- Complex pricing patterns (bulk pricing, per-unit pricing)
- Multi-line item descriptions
- Tax calculations and math consistency
- Unclear vendor names or dates

${vendorContext}

RECEIPT TEXT:
${rawText}

Extract accurate structured data focusing on getting the basics right: vendor, date, total, and line items.`;
  }

  private extractUsingPatterns(rawText: string): ExtractedReceiptData {
    // Basic pattern-based extraction as last resort
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Try to find vendor (first few lines)
    let vendor = 'Unknown';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.length > 3 && line.length < 50 && !line.match(/^\d+/)) {
        vendor = line;
        break;
      }
    }

    // Find total amount
    let totalAmount = 0;
    for (const line of lines) {
      const totalMatch = line.match(/total\s*\$?(\d+\.\d{2})/i);
      if (totalMatch) {
        totalAmount = parseFloat(totalMatch[1]);
        break;
      }
    }

    // Find date (basic pattern)
    let date = new Date().toISOString().split('T')[0];
    for (const line of lines) {
      const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})|(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const foundDate = new Date(dateMatch[0]);
        if (!isNaN(foundDate.getTime())) {
          date = foundDate.toISOString().split('T')[0];
          break;
        }
      }
    }

    // Basic line items (very simple pattern)
    const lineItems = [];
    let itemCount = 0;
    for (const line of lines) {
      const itemMatch = line.match(/^(.+?)\s+\$?(\d+\.\d{2})$/);
      if (itemMatch && itemCount < 10) { // Limit to avoid false matches
        lineItems.push({
          id: `pattern-item-${itemCount}`,
          description: itemMatch[1].trim(),
          quantity: 1,
          unitPrice: parseFloat(itemMatch[2]),
          totalPrice: parseFloat(itemMatch[2]),
          category: 'Other'
        });
        itemCount++;
      }
    }

    return {
      vendor,
      date,
      totalAmount,
      subtotal: totalAmount,
      tax: 0,
      currency: 'USD',
      lineItems,
      category: 'Other',
      confidence: 40,
      notes: 'Extracted using pattern-based fallback'
    };
  }

  private recoverPartialData(partialResults: any[], rawText: string): ExtractedReceiptData {
    // Combine partial results from failed attempts
    const recovered: ExtractedReceiptData = {
      vendor: 'Unknown',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      subtotal: 0,
      tax: 0,
      currency: 'USD',
      lineItems: [],
      category: 'Other',
      confidence: 30,
      notes: 'Recovered from partial results'
    };

    // Extract what we can from partial results
    for (const partial of partialResults) {
      if (partial.vendor && partial.vendor !== 'Unknown') recovered.vendor = partial.vendor;
      if (partial.date) recovered.date = partial.date;
      if (partial.totalAmount > 0) recovered.totalAmount = partial.totalAmount;
      if (partial.lineItems && partial.lineItems.length > 0) {
        recovered.lineItems = [...recovered.lineItems, ...partial.lineItems];
      }
    }

    return recovered;
  }

  private identifyMissingFields(data: ExtractedReceiptData): string[] {
    const missing = [];
    if (!data.vendor || data.vendor === 'Unknown') missing.push('vendor');
    if (!data.date) missing.push('date');
    if (data.totalAmount <= 0) missing.push('totalAmount');
    if (data.lineItems.length === 0) missing.push('lineItems');
    return missing;
  }

  private isResultAcceptable(result: AgentResult<any>): boolean {
    // Minimum acceptance criteria for fallback results
    if (!result.success) return false;
    if (result.confidence < 30) return false; // Very low threshold for fallbacks
    
    // Check if result has basic required data
    const data = this.extractDataFromResult(result);
    return !!(data.vendor && data.totalAmount > 0);
  }

  private extractDataFromResult(result: AgentResult<any>): ExtractedReceiptData {
    if (result.data && result.data.extractedData) {
      return result.data.extractedData;
    } else if (result.data) {
      return result.data;
    }
    
    // Return minimal data if structure is unexpected
    return {
      vendor: 'Unknown',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      subtotal: 0,
      tax: 0,
      currency: 'USD',
      lineItems: [],
      category: 'Other',
      confidence: 0
    };
  }

  // Public methods for configuration and monitoring
  
  addCustomStrategy(strategy: FallbackStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  getAvailableStrategies(): Array<{
    name: string;
    priority: number;
    cost: number;
    expectedAccuracy: number;
  }> {
    return this.strategies.map(s => ({
      name: s.name,
      priority: s.priority,
      cost: s.cost,
      expectedAccuracy: s.expectedAccuracy
    }));
  }

  updateConfiguration(config: {
    maxFallbackAttempts?: number;
    maxTotalCost?: number;
  }): void {
    if (config.maxFallbackAttempts !== undefined) {
      this.maxFallbackAttempts = config.maxFallbackAttempts;
    }
    if (config.maxTotalCost !== undefined) {
      this.maxTotalCost = config.maxTotalCost;
    }
  }
}

// Export singleton instance
let fallbackManagerInstance: FallbackManager | null = null;

export function getFallbackManager(): FallbackManager {
  if (!fallbackManagerInstance) {
    fallbackManagerInstance = new FallbackManager();
  }
  return fallbackManagerInstance;
}