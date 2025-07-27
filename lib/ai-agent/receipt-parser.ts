// Main Receipt Parser with AI Enhancement
import { OllamaProvider } from './providers/ollama-provider';
import { BaseLLMProvider } from './providers/base-provider';
import { 
  AIAgentConfig, 
  ParsedReceiptData, 
  AIProcessingResult, 
  ValidationResult 
} from './types';
import { RECEIPT_PARSER_PROMPT } from './config';

export class AIReceiptParser {
  private provider: BaseLLMProvider;
  private config: AIAgentConfig;

  constructor(config: AIAgentConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  private createProvider(config: AIAgentConfig): BaseLLMProvider {
    switch (config.llmProvider) {
      case 'ollama':
        return new OllamaProvider(
          config.apiUrl || 'http://localhost:11434',
          config.modelName,
          config.timeout
        );
      default:
        throw new Error(`Unsupported LLM provider: ${config.llmProvider}`);
    }
  }

  async parseReceiptText(rawOCRText: string): Promise<AIProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate connection first
      const isConnected = await this.provider.validateConnection();
      if (!isConnected) {
        throw new Error('LLM provider not available');
      }

      // Generate completion
      const prompt = this.buildPrompt(rawOCRText);
      const response = await this.provider.generateCompletion(prompt, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        format: 'json'
      });

      // Parse and validate response
      const parsedData = this.parseResponse(response);
      const validation = this.validateParsedData(parsedData);

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      return {
        success: true,
        data: {
          ...parsedData,
          processingMethod: 'ai-enhanced'
        },
        fallbackUsed: false,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('AI parsing failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: true,
        processingTime: Date.now() - startTime
      };
    }
  }

  private buildPrompt(rawOCRText: string): string {
    return `${RECEIPT_PARSER_PROMPT}

OCR Text to parse:
${rawOCRText}`;
  }

  private parseResponse(response: string): ParsedReceiptData {
    try {
      const parsed = JSON.parse(response);
      
      // Ensure required fields have defaults
      return {
        vendor: parsed.vendor || 'Unknown',
        date: this.validateDate(parsed.date) || new Date().toISOString().split('T')[0],
        totalAmount: this.validateNumber(parsed.totalAmount) || 0,
        subtotal: this.validateNumber(parsed.subtotal) || 0,
        tax: this.validateNumber(parsed.tax) || 0,
        currency: parsed.currency || 'USD',
        lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems.map(this.validateLineItem) : [],
        confidence: this.validateNumber(parsed.confidence, 0, 100) || 70,
        parsingNotes: parsed.parsingNotes || '',
        processingMethod: 'ai-enhanced'
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}`);
    }
  }

  private validateDate(dateStr: string): string | null {
    if (!dateStr) return null;
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString().split('T')[0];
  }

  private validateNumber(num: any, min?: number, max?: number): number | null {
    const parsed = typeof num === 'number' ? num : parseFloat(num);
    if (isNaN(parsed)) return null;
    
    if (min !== undefined && parsed < min) return null;
    if (max !== undefined && parsed > max) return null;
    
    return parsed;
  }

  private validateLineItem(item: any) {
    return {
      description: item.description || 'Unknown Item',
      quantity: this.validateNumber(item.quantity) || 1,
      unitPrice: this.validateNumber(item.unitPrice) || 0,
      totalPrice: this.validateNumber(item.totalPrice) || 0,
      taxable: typeof item.taxable === 'boolean' ? item.taxable : false
    };
  }

  private validateParsedData(data: ParsedReceiptData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!data.vendor || data.vendor === 'Unknown') {
      warnings.push('Vendor name not clearly identified');
    }

    if (data.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    // Math validation
    const calculatedTotal = data.subtotal + data.tax;
    if (Math.abs(calculatedTotal - data.totalAmount) > 0.02) {
      warnings.push(`Math inconsistency: ${calculatedTotal} vs ${data.totalAmount}`);
    }

    // Line items validation
    if (data.lineItems.length === 0) {
      warnings.push('No line items found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: Math.max(0, data.confidence - (errors.length * 20) - (warnings.length * 5))
    };
  }

  async getProviderStatus() {
    if (this.provider instanceof OllamaProvider) {
      return await this.provider.healthCheck();
    }
    
    return {
      status: 'unknown' as const,
      modelLoaded: false,
      responseTime: 0
    };
  }
}