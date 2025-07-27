export function cleanOCRText(rawText: string): string {
  return rawText
    .replace(/[^\w\s\$\.\-\:\(\)\/\,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);
}

export function buildMinimalPrompt(ocrText: string): string {
  return `Parse this receipt data into JSON. Use the RAW OCR TEXT to find ALL items, and use STRUCTURED EXTRACTION to help with vendor/totals if the raw text is unclear.

${ocrText}

Important: Look for ALL items in the raw text, even if they're garbled. Common patterns:
- Items often have prices like "4.96", "5.98", etc.
- Look for product codes, descriptions, and prices
- Walmart receipts often have product codes before descriptions

Return JSON: {"vendor":"","date":"YYYY-MM-DD","total":0,"subtotal":0,"tax":0,"items":[{"desc":"","price":0,"quantity":1}]}`;
}

export function validateParsedReceipt(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const hasVendor = typeof data.vendor === 'string' && data.vendor.length > 0;
  const hasDate = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date);
  const hasTotal = typeof data.total === 'number' && data.total > 0;
  const hasItems = Array.isArray(data.items);
  
  return hasVendor && hasDate && hasTotal && hasItems;
}

export function mergeWithFallback<T>(primary: T, fallback: T, confidence: number): T {
  if (confidence > 85) {
    return primary;
  }
  
  return { ...fallback, ...primary };
}

export function calculateConfidence(
  ocrConfidence: number,
  dataCompleteness: number,
  aiSuccess: boolean
): number {
  const baseConfidence = ocrConfidence * 0.5 + dataCompleteness * 0.5;
  
  if (aiSuccess) {
    return Math.min(95, baseConfidence * 1.2);
  }
  
  return baseConfidence;
}