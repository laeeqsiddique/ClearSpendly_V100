import { OCRProvider, OCRResult, ExtractedReceiptData } from '../types';

export abstract class BaseOCRProvider implements OCRProvider {
  abstract name: string;
  abstract priority: number;
  
  protected apiKey: string | undefined;
  protected isBuildTime: boolean;

  constructor() {
    this.isBuildTime = process.env.NODE_ENV === 'production' && 
                       !process.env.VERCEL && 
                       !process.env.RAILWAY_ENVIRONMENT;
  }

  isAvailable(): boolean {
    if (this.isBuildTime) return false;
    return !!this.apiKey && this.apiKey.length > 0;
  }

  abstract process(imageBase64: string): Promise<OCRResult>;
  abstract getCostPerPage(): number;
  abstract getAccuracyScore(): number;

  protected createSuccessResult(
    data: ExtractedReceiptData,
    processingTime: number,
    confidence: number
  ): OCRResult {
    return {
      success: true,
      data,
      provider: this.name,
      processingTime,
      cost: this.getCostPerPage(),
      confidence
    };
  }

  protected createErrorResult(error: string): OCRResult {
    return {
      success: false,
      error,
      provider: this.name,
      processingTime: 0,
      cost: 0,
      confidence: 0
    };
  }

  protected generateLineItemId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : 
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateReceiptData(data: any): ExtractedReceiptData | null {
    if (!data.vendor || !data.totalAmount) {
      return null;
    }

    const lineItems = (data.lineItems || []).map((item: any, index: number) => ({
      id: this.generateLineItemId(),
      description: item.description || `Item ${index + 1}`,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      totalPrice: parseFloat(item.totalPrice) || (item.quantity * item.unitPrice) || 0,
      category: item.category || "Other"
    }));

    return {
      vendor: data.vendor,
      date: data.date || new Date().toISOString().split('T')[0],
      totalAmount: parseFloat(data.totalAmount) || 0,
      subtotal: parseFloat(data.subtotal) || parseFloat(data.totalAmount) || 0,
      tax: parseFloat(data.tax) || 0,
      currency: data.currency || "USD",
      lineItems,
      category: data.category || "Other",
      confidence: data.confidence || 75,
      notes: data.notes || "",
      receiptNumber: data.receiptNumber,
      paymentMethod: data.paymentMethod
    };
  }
}