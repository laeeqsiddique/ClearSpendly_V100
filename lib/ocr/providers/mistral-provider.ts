import { BaseOCRProvider } from './base-provider';
import { OCRResult, ExtractedReceiptData, EXPENSE_CATEGORIES } from '../types';

export class MistralOCRProvider extends BaseOCRProvider {
  name = 'mistral';
  priority = 1;
  
  private mistralApiKey: string | undefined;
  private mistralApiUrl = 'https://api.mistral.ai/v1';

  constructor() {
    super();
    this.mistralApiKey = process.env.MISTRAL_API_KEY;
    this.apiKey = this.mistralApiKey;
  }

  getCostPerPage(): number {
    return 0.001; // $1 per 1000 pages
  }

  getAccuracyScore(): number {
    return 94.9; // 94.9% accuracy based on benchmarks
  }

  async process(imageBase64: string): Promise<OCRResult> {
    if (!this.isAvailable()) {
      return this.createErrorResult('Mistral API key not configured');
    }

    const startTime = Date.now();

    try {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Step 1: Use Mistral OCR to extract text
      const ocrResponse = await this.performOCR(base64Data);
      
      // Step 2: Use Mistral LLM to structure the data
      const structuredData = await this.extractStructuredData(ocrResponse.text, base64Data);
      
      const processingTime = Date.now() - startTime;
      
      const validatedData = this.validateReceiptData(structuredData);
      if (!validatedData) {
        return this.createErrorResult('Failed to extract valid receipt data');
      }

      return this.createSuccessResult(
        validatedData,
        processingTime,
        structuredData.confidence || 90
      );
    } catch (error) {
      console.error('Mistral OCR processing error:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Mistral processing failed'
      );
    }
  }

  private async performOCR(base64Image: string): Promise<{ text: string }> {
    const response = await fetch(`${this.mistralApiUrl}/ocr/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          document_url: `data:image/jpeg;base64,${base64Image}`
        },
        include_image_base64: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral OCR API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return { text: result.text || result.content || '' };
  }

  private async extractStructuredData(
    ocrText: string, 
    base64Image: string
  ): Promise<any> {
    const structuredPrompt = `You are a receipt parsing AI. Based on the OCR text and image provided, extract all information and return ONLY a valid JSON object with this exact structure:

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
  "receiptNumber": "string - receipt/invoice number if present",
  "paymentMethod": "string - payment method if visible"
}

Categories must be one of: ${EXPENSE_CATEGORIES.join(', ')}

OCR Text:
${ocrText}

CRITICAL RULES:
1. Extract EACH item as a SEPARATE line item
2. Use EXACT prices from the receipt
3. Parse dates correctly
4. Calculate tax if not explicitly shown
5. Return ONLY valid JSON, no additional text`;

    const response = await fetch(`${this.mistralApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: structuredPrompt },
              { 
                type: 'image_url', 
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral LLM API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || '{}';
    
    try {
      const cleanedContent = content.replace(/```json\s*|\s*```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse Mistral response:', content);
      throw new Error('Failed to parse structured data from Mistral');
    }
  }
}