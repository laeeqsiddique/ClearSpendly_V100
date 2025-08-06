export function cleanOCRText(rawText: string): string {
  return rawText
    .replace(/[^\w\s\$\.\-\:\(\)\/\,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);
}

export function buildMinimalPrompt(ocrText: string): string {
  return `Parse this receipt data into JSON. Extract EVERY single item from the receipt, including repeated/duplicate items.

RAW OCR TEXT:
${ocrText}

CRITICAL EXTRACTION RULES:
1. FIND ALL ITEMS - Don't skip any lines that contain products
2. REPEATED ITEMS - If "Bananas" appears 3 times, extract all 3 separate entries
3. QUANTITY ITEMS - "2x Apples" should be 1 item with quantity=2, not 2 separate items
4. PARTIAL LINES - Even if garbled, try to extract: "Br d Lo f 2.99" → "Bread Loaf"
5. PRICE PATTERNS - Look for any number with decimal: "4.96", "12.50", "$3.99"
6. PRODUCT CODES - Numbers/letters before descriptions: "12345 MILK" → desc="MILK"

COMMON RECEIPT FORMATS:
- Walmart: [CODE] [DESCRIPTION] [PRICE]
- Grocery: [DESCRIPTION] [PRICE] or [DESCRIPTION] [QTY] x [UNIT_PRICE]
- Restaurant: [ITEM] [PRICE] (often repeated items for table orders)

SCANNING STRATEGY:
1. Read EVERY line of the OCR text
2. If a line has a price (number with 2 decimals), it's likely an item
3. Group description text with the nearest price
4. Don't merge items unless they're explicitly marked as quantity (2x, 3@, etc.)

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