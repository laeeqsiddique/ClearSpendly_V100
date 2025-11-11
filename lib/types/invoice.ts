/**
 * Invoice Type Definitions
 * For vendor invoice processing and OCR extraction
 */

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  poNumber?: string; // Purchase Order Number
  poLineItem?: string; // PO Line Item reference
  serviceDate?: string; // Service or Delivery Date (YYYY-MM-DD)
  itemCode?: string; // Material Number / Item Code
  category?: string; // Optional categorization
}

export interface InvoiceHeader {
  vendorName: string;
  vendorNumber?: string; // Vendor ID/Number
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  poNumber?: string; // Main PO number (if invoice has one overall PO)
  subtotal: number;
  tax: number;
  totalAmount: number;
  currency: string;
  paymentTerms?: string;
  billingAddress?: string;
  shippingAddress?: string;
}

export interface InvoiceData {
  header: InvoiceHeader;
  lineItems: InvoiceLineItem[];
  confidence: number; // 0-100
  vendorPattern?: string; // For future vendor-specific fine-tuning
  rawText?: string; // Original extracted text for reference
}

export interface InvoiceOCRResult {
  success: boolean;
  data?: InvoiceData;
  error?: string;
  processingTime: number;
  provider: string;
}

/**
 * Vendor Pattern Detection for Future Fine-Tuning
 *
 * This system tracks vendor-specific patterns to:
 * 1. Identify common field labels per vendor (e.g., "Customer PO" vs "PO Number")
 * 2. Learn typical invoice layouts and structures
 * 3. Collect data for future fine-tuning (see INVOICE_OCR_IMPROVEMENT_STRATEGY.md)
 *
 * When you have 100+ invoices from a vendor, you can:
 * - Export patterns to create vendor-specific prompts
 * - Use as training data for GPT-4o vision fine-tuning
 * - Build vendor profile system for improved accuracy
 */
export interface VendorPattern {
  vendorName: string;
  vendorNumber?: string;
  commonFields: string[]; // Fields this vendor typically includes
  fieldVariations?: { // Track field label variations per vendor
    poNumber?: string[]; // e.g., ["Customer PO", "PO Number", "Order #"]
    itemCode?: string[]; // e.g., ["Item Code", "Material Number", "SKU"]
    invoiceNumber?: string[]; // e.g., ["Invoice #", "Invoice No.", "Bill #"]
  };
  layoutHints?: {
    hasTableFormat: boolean;
    typicalLineItemCount: number;
    usesItemCodes: boolean;
    usesPONumbers: boolean;
  };
  processedCount: number; // How many invoices from this vendor we've seen
  lastProcessed?: Date; // When we last saw an invoice from this vendor
  averageConfidence?: number; // Average extraction confidence for this vendor
}

// For demo purposes - tracking patterns without persistence
export class VendorPatternTracker {
  private patterns: Map<string, VendorPattern> = new Map();

  addPattern(invoiceData: InvoiceData): void {
    const vendorKey = invoiceData.header.vendorName.toLowerCase().trim();

    const existing = this.patterns.get(vendorKey);
    if (existing) {
      existing.processedCount += 1;
    } else {
      this.patterns.set(vendorKey, {
        vendorName: invoiceData.header.vendorName,
        vendorNumber: invoiceData.header.vendorNumber,
        commonFields: this.detectCommonFields(invoiceData),
        layoutHints: {
          hasTableFormat: invoiceData.lineItems.length > 1,
          typicalLineItemCount: invoiceData.lineItems.length,
          usesItemCodes: invoiceData.lineItems.some(item => !!item.itemCode),
          usesPONumbers: invoiceData.lineItems.some(item => !!item.poNumber),
        },
        processedCount: 1,
      });
    }
  }

  getPattern(vendorName: string): VendorPattern | undefined {
    return this.patterns.get(vendorName.toLowerCase().trim());
  }

  getAllPatterns(): VendorPattern[] {
    return Array.from(this.patterns.values());
  }

  exportPatterns(): string {
    return JSON.stringify(Array.from(this.patterns.values()), null, 2);
  }

  getVendorStats(): {
    totalVendors: number;
    totalInvoices: number;
    topVendors: Array<{ name: string; count: number }>;
  } {
    const patterns = Array.from(this.patterns.values());
    const totalInvoices = patterns.reduce((sum, p) => sum + p.processedCount, 0);
    const topVendors = patterns
      .sort((a, b) => b.processedCount - a.processedCount)
      .slice(0, 10)
      .map(p => ({ name: p.vendorName, count: p.processedCount }));

    return {
      totalVendors: patterns.length,
      totalInvoices,
      topVendors,
    };
  }

  private detectCommonFields(invoiceData: InvoiceData): string[] {
    const fields: string[] = ['vendorName', 'invoiceNumber', 'invoiceDate', 'totalAmount'];

    if (invoiceData.header.vendorNumber) fields.push('vendorNumber');
    if (invoiceData.header.poNumber) fields.push('poNumber');
    if (invoiceData.header.dueDate) fields.push('dueDate');
    if (invoiceData.lineItems.some(item => item.itemCode)) fields.push('itemCode');
    if (invoiceData.lineItems.some(item => item.poNumber)) fields.push('lineItemPO');
    if (invoiceData.lineItems.some(item => item.serviceDate)) fields.push('serviceDate');

    return fields;
  }
}

// Singleton instance for demo session
export const vendorPatternTracker = new VendorPatternTracker();
