export interface ParsedReceipt {
  vendor: string;
  date: string;
  total: number;
  subtotal?: number;
  tax?: number;
  items: ParsedItem[];
  confidence?: number;
  currency?: string;
  category?: string;
}

export interface ParsedItem {
  desc: string;
  price: number;
  quantity?: number;
  unit_price?: number;
  category?: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface AIEnhancementConfig {
  apiKey: string;
  model?: string;
  enableAI?: boolean;
  confidenceThreshold?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface EnhancedReceiptData {
  vendor: string;
  date: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  currency: string;
  lineItems: EnhancedLineItem[];
  category: string;
  confidence: number;
  notes: string;
  processingMethod?: 'ocr-only' | 'ai-enhanced';
}

export interface EnhancedLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}