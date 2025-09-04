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
      // Check if this is text from PDF extraction
      if (imageBase64.startsWith('text:')) {
        console.log('Processing extracted PDF text with Mistral...');
        const extractedText = imageBase64.substring(5); // Remove 'text:' prefix
        
        // Skip OCR step and go directly to structured data extraction
        const structuredData = await this.extractStructuredDataFromText(extractedText);
        
        const processingTime = Date.now() - startTime;
        
        const validatedData = this.validateReceiptData(structuredData);
        if (!validatedData) {
          return this.createErrorResult('Failed to extract valid receipt data from PDF text');
        }

        return this.createSuccessResult(
          validatedData,
          processingTime,
          structuredData.confidence || 85
        );
      }

      let base64Data: string;
      
      // Handle different input types (base64 data or URL)
      if (imageBase64.startsWith('http')) {
        // It's a URL - download and convert to base64
        console.log('Downloading image from URL for Mistral processing...');
        const response = await fetch(imageBase64);
        const buffer = await response.arrayBuffer();
        base64Data = Buffer.from(buffer).toString('base64');
      } else {
        // Remove data URL prefix if present
        base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
      }
      
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
    // Use the vision model directly for now since OCR-specific endpoint may not be available
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
              { 
                type: 'text', 
                text: 'Extract all text from this image. Return only the raw text content, no formatting or additional commentary.'
              },
              { 
                type: 'image_url', 
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral OCR API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const extractedText = result.choices?.[0]?.message?.content || '';
    return { text: extractedText };
  }

  private async extractStructuredDataFromText(ocrText: string): Promise<any> {
    const structuredPrompt = `You are a receipt parsing AI. Based on the text extracted from a PDF receipt, extract all information and return ONLY a valid JSON object with this exact structure:

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

PDF Text:
${ocrText}

CRITICAL RULES:
1. Extract EACH item as a SEPARATE line item - but understand pricing patterns
2. For pricing like "6 AT 1 FOR 0.78" or "QTY 6 @ $0.78 = $4.68":
   - quantity = 6
   - unitPrice = 0.78  
   - totalPrice = 4.68
   - This is ONE item, not multiple items
3. Look for patterns like "X AT Y FOR Z", "QTY X @ $Y", "X × $Y = $Z"
4. Use the FINAL calculated total for each line item, not intermediate prices
5. Parse dates correctly (YYYY-MM-DD format)
6. Calculate tax if not explicitly shown
7. Return ONLY valid JSON, no additional text`;

    const response = await fetch(`${this.mistralApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest', // Use text-only model for PDF text
        messages: [
          {
            role: 'user',
            content: structuredPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
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
1. Extract EACH item as a SEPARATE line item - but understand pricing patterns
2. For pricing like "6 AT 1 FOR 0.78" or "QTY 6 @ $0.78 = $4.68":
   - quantity = 6
   - unitPrice = 0.78  
   - totalPrice = 4.68
   - This is ONE item, not multiple items
3. Look for patterns like "X AT Y FOR Z", "QTY X @ $Y", "X × $Y = $Z"
4. Use the FINAL calculated total for each line item, not intermediate prices
5. Parse dates correctly (YYYY-MM-DD format)
6. Calculate tax if not explicitly shown
7. Return ONLY valid JSON, no additional text`;

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
        max_tokens: 2000,
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