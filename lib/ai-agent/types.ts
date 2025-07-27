// AI Agent Type Definitions
export interface AIAgentConfig {
  llmProvider: 'ollama' | 'openai' | 'anthropic';
  modelName: string;
  apiUrl?: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface ParsedReceiptData {
  vendor: string;
  date: string; // YYYY-MM-DD
  totalAmount: number;
  subtotal: number;
  tax: number;
  currency: string;
  lineItems: LineItem[];
  confidence: number; // 0-100
  parsingNotes: string;
  processingMethod: 'ai-enhanced' | 'regex-fallback';
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxable?: boolean;
}

export interface LLMProvider {
  name: string;
  generateCompletion(prompt: string, options: CompletionOptions): Promise<string>;
  validateConnection(): Promise<boolean>;
  getModelInfo(): ModelInfo;
}

export interface CompletionOptions {
  temperature: number;
  maxTokens: number;
  format?: 'json' | 'text';
  stream?: boolean;
}

export interface ModelInfo {
  name: string;
  size: string;
  parameters: string;
  quantization?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
}

export type ReceiptType = 'retail' | 'restaurant' | 'hardware' | 'gas' | 'invoice' | 'generic';

export interface AIProcessingResult {
  success: boolean;
  data?: ParsedReceiptData;
  error?: string;
  fallbackUsed: boolean;
  processingTime: number;
}