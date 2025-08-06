// AI Agent Configuration
import { AIAgentConfig } from './types';

export const DEFAULT_AI_CONFIG: AIAgentConfig = {
  llmProvider: 'ollama',
  modelName: 'llama3.2:3b',
  apiUrl: 'http://localhost:11434',
  temperature: 0.1, // Low for consistency
  maxTokens: 1500, // Reduced for faster response
  timeout: 300000, // 5 minutes for CPU processing
};

export const getAIConfig = (): AIAgentConfig => {
  // Check both server and client environment variables
  const isClient = typeof window !== 'undefined';
  
  return {
    llmProvider: (
      (isClient ? process.env.NEXT_PUBLIC_LLM_PROVIDER : process.env.LLM_PROVIDER) as any
    ) || DEFAULT_AI_CONFIG.llmProvider,
    
    modelName: (
      isClient ? process.env.NEXT_PUBLIC_LLM_MODEL : process.env.LLM_MODEL
    ) || DEFAULT_AI_CONFIG.modelName,
    
    apiUrl: (
      isClient ? process.env.NEXT_PUBLIC_LLM_API_URL : process.env.LLM_API_URL
    ) || DEFAULT_AI_CONFIG.apiUrl,
    
    apiKey: process.env.LLM_API_KEY, // Server-only
    
    temperature: parseFloat(
      (isClient ? process.env.NEXT_PUBLIC_LLM_TEMPERATURE : process.env.LLM_TEMPERATURE) || '0.1'
    ),
    
    maxTokens: parseInt(
      (isClient ? process.env.NEXT_PUBLIC_LLM_MAX_TOKENS : process.env.LLM_MAX_TOKENS) || '2000'
    ),
    
    timeout: parseInt(
      (isClient ? process.env.NEXT_PUBLIC_LLM_TIMEOUT_MS : process.env.LLM_TIMEOUT_MS) || '120000'
    ),
  };
};

export const RECEIPT_PARSER_PROMPT = `Parse this receipt data into JSON. Extract EVERY single item, including repeated/duplicate items.

CRITICAL RULES:
1. FIND ALL ITEMS - Don't skip any product lines
2. REPEATED ITEMS - If same item appears multiple times, list each occurrence separately  
3. QUANTITY vs REPEATS - "2x Apples" = 1 item (qty=2), "Apples" appearing twice = 2 items (qty=1 each)
4. FIX OCR ERRORS - O/0, l/1/I, missing decimals, garbled text
5. PRICE PATTERNS - Any decimal number (4.96, 12.50, $3.99) likely indicates an item

Return ONLY this JSON format:
{
  "vendor": "cleaned business name",
  "date": "YYYY-MM-DD", 
  "totalAmount": number,
  "subtotal": number,
  "tax": number,
  "currency": "USD",
  "lineItems": [
    {
      "description": "item name (cleaned from garbled OCR)",
      "quantity": 1,
      "unitPrice": number,
      "totalPrice": number,
      "taxable": true
    }
  ],
  "confidence": 85,
  "parsingNotes": "extraction notes"
}

Scan EVERY line for items. Be thorough and extract ALL products.`;

export const isAIEnabled = (): boolean => {
  const isClient = typeof window !== 'undefined';
  const enableVar = isClient 
    ? process.env.NEXT_PUBLIC_ENABLE_AI_OCR_ENHANCEMENT 
    : process.env.ENABLE_AI_OCR_ENHANCEMENT;
  return enableVar === 'true';
};