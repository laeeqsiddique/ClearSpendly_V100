import OpenAI from 'openai';
import { ParsedReceipt, AIEnhancementConfig } from './types';
import { cleanOCRText, buildMinimalPrompt, validateParsedReceipt } from './utils';

export class OpenAIReceiptParser {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIEnhancementConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true
    });

    this.model = config.model || 'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 400;
    this.temperature = config.temperature || 0.1;
  }

  async parseOCRText(ocrText: string): Promise<ParsedReceipt> {
    try {
      const cleanedText = cleanOCRText(ocrText);
      const prompt = buildMinimalPrompt(cleanedText);

      console.log('🤖 Calling OpenAI API with model:', this.model);
      console.log('📝 Token count estimate:', Math.ceil(prompt.length / 4));

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a receipt parser. Return only valid JSON with no explanation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      console.log('✅ OpenAI response received');
      
      const parsedData = JSON.parse(content);
      
      if (!validateParsedReceipt(parsedData)) {
        throw new Error('Invalid receipt data structure');
      }

      return this.normalizeReceiptData(parsedData);
    } catch (error) {
      console.error('❌ OpenAI parsing failed:', error);
      throw error;
    }
  }

  private normalizeReceiptData(data: any): ParsedReceipt {
    return {
      vendor: data.vendor || 'Unknown Vendor',
      date: this.normalizeDate(data.date),
      total: this.normalizeAmount(data.total),
      subtotal: data.subtotal ? this.normalizeAmount(data.subtotal) : undefined,
      tax: data.tax ? this.normalizeAmount(data.tax) : undefined,
      items: Array.isArray(data.items) ? data.items.map((item: any) => ({
        desc: item.desc || item.description || '',
        price: this.normalizeAmount(item.price || item.total_price || 0),
        quantity: item.quantity || 1,
        unit_price: item.unit_price || (item.price / (item.quantity || 1))
      })) : [],
      confidence: 90,
      currency: data.currency || 'USD'
    };
  }

  private normalizeDate(dateStr: any): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('Date parsing failed:', e);
    }
    
    return new Date().toISOString().split('T')[0];
  }

  private normalizeAmount(amount: any): number {
    const num = parseFloat(amount);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.openai.models.list();
      console.log('✅ OpenAI connection successful');
      return true;
    } catch (error) {
      console.error('❌ OpenAI connection failed:', error);
      return false;
    }
  }
}