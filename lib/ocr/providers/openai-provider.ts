import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { BaseOCRProvider } from './base-provider';
import { OCRResult, EXPENSE_CATEGORIES } from '../types';

export class OpenAIProvider extends BaseOCRProvider {
  name = 'openai';
  priority = 2;
  
  private openaiApiKey: string | undefined;

  constructor() {
    super();
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.apiKey = this.openaiApiKey;
  }

  getCostPerPage(): number {
    return 0.004; // Approximate cost for GPT-4o-mini
  }

  getAccuracyScore(): number {
    return 90; // Estimated accuracy
  }

  isAvailable(): boolean {
    if (this.isBuildTime) return false;
    return !!(this.openaiApiKey && 
             this.openaiApiKey !== 'your_openai_api_key' &&
             this.openaiApiKey.length > 0);
  }

  async process(imageBase64: string): Promise<OCRResult> {
    if (!this.isAvailable()) {
      return this.createErrorResult('OpenAI API key not configured');
    }

    const startTime = Date.now();

    try {
      const prompt = `You are a receipt parsing AI. Extract all information from this receipt image and return ONLY a valid JSON object with this exact structure:

{
  "vendor": "string - business name",
  "date": "YYYY-MM-DD - receipt date",
  "totalAmount": number,
  "subtotal": number,
  "tax": number,
  "currency": "USD",
  "lineItems": [
    {
      "description": "string - item name",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "category": "string - best guess category"
    }
  ],
  "category": "string - overall expense category",
  "confidence": number (0-100),
  "receiptNumber": "string - if present",
  "paymentMethod": "string - if visible"
}

Categories must be one of: ${EXPENSE_CATEGORIES.join(', ')}

CRITICAL RULES:
1. Extract EACH item as a SEPARATE line item - do NOT combine similar items
2. Use the EXACT prices shown on the receipt
3. If an item shows quantity > 1, use that quantity with the total price shown
4. Return ONLY the JSON object, no additional text`;

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: imageBase64 }
            ]
          }
        ],
        maxTokens: 1500,
        temperature: 0.1
      });

      const processingTime = Date.now() - startTime;

      // Log cost information
      const usage = (result as any).usage;
      if (usage) {
        const promptTokens = usage.promptTokens || usage.prompt_tokens || 0;
        const completionTokens = usage.completionTokens || usage.completion_tokens || 0;
        
        if (promptTokens > 0 || completionTokens > 0) {
          const inputCost = (promptTokens / 1000000) * 0.15;
          const outputCost = (completionTokens / 1000000) * 0.60;
          const totalCost = inputCost + outputCost;
          
          console.log(`OpenAI OCR Cost: $${totalCost.toFixed(4)} (${promptTokens} input, ${completionTokens} output tokens)`);
        }
      }

      // Parse response
      let extractedData;
      try {
        const cleanedResponse = result.text.replace(/```json\s*|\s*```/g, "").trim();
        extractedData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", result.text);
        return this.createErrorResult('Failed to parse receipt data');
      }

      const validatedData = this.validateReceiptData(extractedData);
      if (!validatedData) {
        return this.createErrorResult('Failed to extract valid receipt data');
      }

      return this.createSuccessResult(
        validatedData,
        processingTime,
        extractedData.confidence || 85
      );

    } catch (error) {
      console.error('OpenAI processing error:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'OpenAI processing failed'
      );
    }
  }
}