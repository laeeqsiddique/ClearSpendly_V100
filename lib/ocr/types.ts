export interface OCRProvider {
  name: string;
  priority: number;
  isAvailable(): boolean;
  process(imageBase64: string): Promise<OCRResult>;
  getCostPerPage(): number;
  getAccuracyScore(): number;
}

export interface OCRResult {
  success: boolean;
  data?: ExtractedReceiptData;
  error?: string;
  provider: string;
  processingTime: number;
  cost: number;
  confidence: number;
}

export interface ExtractedReceiptData {
  vendor: string;
  date: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  currency: string;
  lineItems: LineItem[];
  category: string;
  confidence: number;
  notes?: string;
  rawText?: string;
  receiptNumber?: string;
  paymentMethod?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface OCRConfig {
  primaryProvider: 'mistral' | 'openai' | 'anthropic';
  fallbackProviders: string[];
  enableCaching: boolean;
  costThreshold: number;
  accuracyThreshold: number;
  maxRetries: number;
  timeout: number;
}

export const EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Travel & Transportation", 
  "Meals & Entertainment",
  "Marketing & Advertising",
  "Professional Services",
  "Equipment & Software",
  "Utilities",
  "Rent & Facilities",
  "Insurance",
  "Training & Education",
  "Other"
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];