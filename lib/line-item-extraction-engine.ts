// Specialized Line Item Extraction Engine
// Handles repeated items, quantity calculations, and complex receipt structures

export interface ExtractedLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  confidence: number;
  rawText?: string;
  extractionMethod: 'ai_primary' | 'ai_secondary' | 'pattern_match' | 'heuristic';
  deduplicationGroup?: string;
  validationFlags: ValidationFlag[];
}

export interface ValidationFlag {
  type: 'price_mismatch' | 'duplicate' | 'incomplete' | 'suspicious_quantity' | 'invalid_chars';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface LineItemExtractionResult {
  items: ExtractedLineItem[];
  totalItemsFound: number;
  duplicatesRemoved: number;
  validationSummary: {
    errors: number;
    warnings: number;
    overallConfidence: number;
  };
  processingStats: {
    aiExtractions: number;
    patternMatches: number;
    heuristicMatches: number;
    processingTime: number;
  };
}

export interface ReceiptPattern {
  name: string;
  vendorPatterns: string[];
  lineItemRegex: RegExp;
  quantityPatterns: RegExp[];
  pricePatterns: RegExp[];
  skipPatterns: RegExp[];
  extractionLogic: (line: string, context: string[]) => Partial<ExtractedLineItem> | null;
}

export class LineItemExtractionEngine {
  private vendorPatterns: Map<string, ReceiptPattern[]> = new Map();
  private genericPatterns: ReceiptPattern[] = [];
  
  constructor() {
    this.initializePatterns();
  }

  /**
   * Main extraction function - processes raw OCR text and AI results
   */
  async extractLineItems(
    rawOCRText: string,
    aiResults: Partial<ExtractedLineItem>[],
    vendorName?: string
  ): Promise<LineItemExtractionResult> {
    const startTime = Date.now();
    
    console.log('🔍 Starting specialized line item extraction...');
    console.log(`📊 Input: ${aiResults.length} AI items, vendor: ${vendorName || 'unknown'}`);
    
    // Step 1: Process AI results and add validation
    const aiItems = this.processAIResults(aiResults);
    
    // Step 2: Extract additional items using pattern matching
    const patternItems = this.extractUsingPatterns(rawOCRText, vendorName);
    
    // Step 3: Extract using heuristic methods for missed items
    const heuristicItems = this.extractUsingHeuristics(rawOCRText, [...aiItems, ...patternItems]);
    
    // Step 4: Combine all items
    const allItems = [...aiItems, ...patternItems, ...heuristicItems];
    
    // Step 5: Deduplicate and validate
    const deduplicatedItems = this.deduplicateItems(allItems);
    const validatedItems = this.validateAndCleanItems(deduplicatedItems);
    
    // Step 6: Calculate statistics
    const stats = this.calculateProcessingStats(validatedItems, startTime);
    
    console.log(`✅ Line item extraction completed: ${validatedItems.length} items found`);
    
    return {
      items: validatedItems,
      totalItemsFound: allItems.length,
      duplicatesRemoved: allItems.length - deduplicatedItems.length,
      validationSummary: this.createValidationSummary(validatedItems),
      processingStats: stats
    };
  }

  /**
   * Process AI-extracted items and add validation
   */
  private processAIResults(aiResults: Partial<ExtractedLineItem>[]): ExtractedLineItem[] {
    return aiResults.map((item, index) => {
      const extractedItem: ExtractedLineItem = {
        id: `ai-${index}`,
        description: item.description || `Item ${index + 1}`,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        category: item.category || 'Other',
        confidence: item.confidence || 75,
        extractionMethod: 'ai_primary',
        validationFlags: []
      };

      // Validate AI extraction
      this.validateItem(extractedItem);
      
      return extractedItem;
    });
  }

  /**
   * Extract items using vendor-specific and generic patterns
   */
  private extractUsingPatterns(rawText: string, vendorName?: string): ExtractedLineItem[] {
    const items: ExtractedLineItem[] = [];
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Get applicable patterns
    const patterns = this.getApplicablePatterns(vendorName);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3));
      
      // Skip lines that match skip patterns
      if (this.shouldSkipLine(line)) {
        continue;
      }
      
      for (const pattern of patterns) {
        const extractedItem = pattern.extractionLogic(line, context);
        if (extractedItem && this.isValidExtraction(extractedItem)) {
          const item: ExtractedLineItem = {
            id: `pattern-${items.length}`,
            description: extractedItem.description || 'Unknown Item',
            quantity: extractedItem.quantity || 1,
            unitPrice: extractedItem.unitPrice || 0,
            totalPrice: extractedItem.totalPrice || 0, 
            category: extractedItem.category || 'Other',
            confidence: 65, // Pattern-based extraction confidence
            rawText: line,
            extractionMethod: 'pattern_match',
            validationFlags: []
          };
          
          this.validateItem(item);
          items.push(item);
          break; // Use first matching pattern
        }
      }
    }
    
    return items;
  }

  /**
   * Extract items using heuristic methods for items missed by AI and patterns
   */
  private extractUsingHeuristics(rawText: string, existingItems: ExtractedLineItem[]): ExtractedLineItem[] {
    const items: ExtractedLineItem[] = [];
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Find potential item lines that weren't caught by other methods
    const existingDescriptions = new Set(existingItems.map(item => 
      item.description.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    ));
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip if already processed or should be skipped
      if (this.shouldSkipLine(line) || this.lineAlreadyProcessed(line, existingDescriptions)) {
        continue;
      }
      
      // Try different heuristic extraction methods
      const heuristicItem = this.tryHeuristicExtraction(line, lines, i);
      if (heuristicItem) {
        const item: ExtractedLineItem = {
          id: `heuristic-${items.length}`,
          ...heuristicItem,
          confidence: 45, // Lower confidence for heuristic extraction
          rawText: line,
          extractionMethod: 'heuristic',
          validationFlags: []
        };
        
        this.validateItem(item);
        items.push(item);
      }
    }
    
    return items;
  }

  /**
   * Attempt heuristic extraction from a line
   */
  private tryHeuristicExtraction(
    line: string, 
    allLines: string[], 
    currentIndex: number
  ): Partial<ExtractedLineItem> | null {
    
    // Method 1: Look for description followed by price pattern
    const priceAtEndMatch = line.match(/^(.+?)\s+\$?(\d+\.?\d*)\s*$/);
    if (priceAtEndMatch) {
      const [, description, priceStr] = priceAtEndMatch;
      const price = parseFloat(priceStr);
      
      if (price > 0 && price < 1000 && description.length > 2) {
        return {
          description: this.cleanDescription(description),
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          category: this.categorizeItem(description)
        };
      }
    }
    
    // Method 2: Multi-line item (description on one line, price on next)
    if (currentIndex < allLines.length - 1) {
      const nextLine = allLines[currentIndex + 1];
      const priceMatch = nextLine.match(/^\s*\$?(\d+\.?\d*)\s*$/);
      
      if (priceMatch && line.length > 3 && !line.match(/\d/)) {
        const price = parseFloat(priceMatch[1]);
        if (price > 0 && price < 1000) {
          return {
            description: this.cleanDescription(line),
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            category: this.categorizeItem(line)
          };
        }
      }
    }
    
    // Method 3: Quantity x Price format
    const qtyPriceMatch = line.match(/^(.+?)\s+(\d+)\s*[x@]\s*\$?(\d+\.?\d*)\s*=?\s*\$?(\d+\.?\d*)?$/i);
    if (qtyPriceMatch) {
      const [, description, qtyStr, unitPriceStr, totalPriceStr] = qtyPriceMatch;
      const quantity = parseInt(qtyStr);
      const unitPrice = parseFloat(unitPriceStr);
      const totalPrice = totalPriceStr ? parseFloat(totalPriceStr) : quantity * unitPrice;
      
      if (quantity > 0 && quantity <= 100 && unitPrice > 0 && unitPrice < 1000) {
        return {
          description: this.cleanDescription(description),
          quantity,
          unitPrice,
          totalPrice,
          category: this.categorizeItem(description)
        };
      }
    }
    
    return null;
  }

  /**
   * Intelligent deduplication handling repeated items correctly
   */
  private deduplicateItems(items: ExtractedLineItem[]): ExtractedLineItem[] {
    const groups = new Map<string, ExtractedLineItem[]>();
    
    // Group similar items
    for (const item of items) {
      const groupKey = this.createDeduplicationKey(item);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }
    
    const deduplicatedItems: ExtractedLineItem[] = [];
    
    // Process each group
    for (const [groupKey, groupItems] of groups) {
      if (groupItems.length === 1) {
        // Single item, keep as-is
        deduplicatedItems.push(groupItems[0]);
      } else {
        // Multiple similar items - determine if they're duplicates or repeated items
        const processedGroup = this.processItemGroup(groupItems, groupKey);
        deduplicatedItems.push(...processedGroup);
      }
    }
    
    return deduplicatedItems;
  }

  /**
   * Create deduplication key for grouping similar items
   */
  private createDeduplicationKey(item: ExtractedLineItem): string {
    // Normalize description for comparison
    const normalizedDesc = item.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Group by description and price (to handle repeated items correctly)
    return `${normalizedDesc}|${item.unitPrice.toFixed(2)}`;
  }

  /**
   * Process a group of similar items to determine duplicates vs. repeated items
   */
  private processItemGroup(items: ExtractedLineItem[], groupKey: string): ExtractedLineItem[] {
    // Sort by confidence and extraction method priority
    const sortedItems = items.sort((a, b) => {
      const methodPriority = { 'ai_primary': 4, 'ai_secondary': 3, 'pattern_match': 2, 'heuristic': 1 };
      const aPriority = methodPriority[a.extractionMethod];
      const bPriority = methodPriority[b.extractionMethod];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.confidence - a.confidence;
    });
    
    // Check if these are likely duplicates or repeated items
    const quantities = items.map(item => item.quantity);
    const totalPrices = items.map(item => item.totalPrice);
    
    // If all items have same quantity and total price, likely duplicates
    const sameQuantities = quantities.every(q => q === quantities[0]);
    const sameTotalPrices = totalPrices.every(p => Math.abs(p - totalPrices[0]) < 0.01);
    
    if (sameQuantities && sameTotalPrices && items.length > 1) {
      // Likely duplicates - keep the best one
      const bestItem = sortedItems[0];
      bestItem.validationFlags.push({
        type: 'duplicate',
        severity: 'info',
        message: `Removed ${items.length - 1} duplicate(s) of this item`,
        suggestion: 'Verified as single item through deduplication'
      });
      bestItem.deduplicationGroup = groupKey;
      return [bestItem];
    } else {
      // Likely repeated items - check if we should combine them
      const totalQuantity = quantities.reduce((sum, q) => sum + q, 0);
      const avgUnitPrice = items.reduce((sum, item) => sum + item.unitPrice, 0) / items.length;
      const totalAmount = totalPrices.reduce((sum, p) => sum + p, 0);
      
      // If it makes sense to combine (similar unit prices), create combined item
      const unitPriceVariance = this.calculateVariance(items.map(item => item.unitPrice));
      
      if (unitPriceVariance < 0.1 && totalQuantity <= 100) {
        const combinedItem: ExtractedLineItem = {
          ...sortedItems[0], // Use best item as base
          id: `combined-${Date.now()}`,
          quantity: totalQuantity,
          unitPrice: Math.round(avgUnitPrice * 100) / 100,
          totalPrice: Math.round(totalAmount * 100) / 100,
          confidence: Math.min(90, sortedItems[0].confidence + 10), // Boost confidence for combined item
          extractionMethod: 'ai_primary', // Upgrade to primary since it's validated
          deduplicationGroup: groupKey
        };
        
        combinedItem.validationFlags.push({
          type: 'duplicate',
          severity: 'info',
          message: `Combined ${items.length} repeated items (total qty: ${totalQuantity})`,
          suggestion: 'Items were merged as they appear to be repeated purchases'
        });
        
        return [combinedItem];
      } else {
        // Keep as separate items but mark them
        return sortedItems.map(item => {
          item.deduplicationGroup = groupKey;
          item.validationFlags.push({
            type: 'duplicate',
            severity: 'warning',
            message: 'Similar item found multiple times',
            suggestion: 'Review if this should be a single item with higher quantity'
          });
          return item;
        });
      }
    }
  }

  /**
   * Calculate variance for deduplication logic
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  /**
   * Validate and clean extracted items
   */
  private validateAndCleanItems(items: ExtractedLineItem[]): ExtractedLineItem[] {
    return items.map(item => {
      // Additional validation passes
      this.validatePriceConsistency(item);
      this.validateDescription(item);
      this.validateQuantity(item);
      
      // Clean up description
      item.description = this.cleanDescription(item.description);
      
      // Ensure price consistency
      if (Math.abs(item.quantity * item.unitPrice - item.totalPrice) > 0.01) {
        // Fix price inconsistency
        if (item.quantity > 1 && item.totalPrice > 0) {
          item.unitPrice = Math.round((item.totalPrice / item.quantity) * 100) / 100;
        } else if (item.unitPrice > 0) {
          item.totalPrice = Math.round((item.unitPrice * item.quantity) * 100) / 100;
        }
        
        item.validationFlags.push({
          type: 'price_mismatch',
          severity: 'warning',
          message: 'Price calculation corrected',
          suggestion: 'Automatically adjusted for consistency'
        });
      }
      
      return item;
    });
  }

  /**
   * Validate individual item
   */
  private validateItem(item: ExtractedLineItem): void {
    // Check for invalid characters in description
    if (item.description.match(/[^\w\s\-\.\(\)\/&]/)) {
      item.validationFlags.push({
        type: 'invalid_chars',
        severity: 'warning',
        message: 'Description contains unusual characters',
        suggestion: 'Review description for OCR errors'
      });
    }
    
    // Check for suspicious quantities
    if (item.quantity > 50) {
      item.validationFlags.push({
        type: 'suspicious_quantity',
        severity: 'warning',
        message: `High quantity detected: ${item.quantity}`,
        suggestion: 'Verify this is not a price or code misread as quantity'
      });
    }
    
    // Check for incomplete data
    if (!item.description || item.description.length < 2) {
      item.validationFlags.push({
        type: 'incomplete',
        severity: 'error',
        message: 'Missing or incomplete description',
        suggestion: 'Add a proper item description'
      });
    }
    
    if (item.totalPrice <= 0) {
      item.validationFlags.push({
        type: 'incomplete',
        severity: 'error',
        message: 'Invalid or missing price',
        suggestion: 'Verify the price is correctly extracted'
      });
    }
  }

  /**
   * Additional validation methods
   */
  private validatePriceConsistency(item: ExtractedLineItem): void {
    const calculatedTotal = item.quantity * item.unitPrice;
    const priceDiff = Math.abs(calculatedTotal - item.totalPrice);
    
    if (priceDiff > 0.01) {
      item.validationFlags.push({
        type: 'price_mismatch',
        severity: 'warning',
        message: `Price inconsistency: ${item.quantity} x $${item.unitPrice} ≠ $${item.totalPrice}`,
        suggestion: 'Check if quantity, unit price, or total price is incorrect'
      });
    }
  }

  private validateDescription(item: ExtractedLineItem): void {
    // Check for very short descriptions
    if (item.description.length < 3) {
      item.confidence = Math.min(item.confidence, 40);
      item.validationFlags.push({
        type: 'incomplete',
        severity: 'warning',
        message: 'Very short item description',
        suggestion: 'Consider adding more detail to the description'
      });
    }
    
    // Check for numeric-only descriptions (likely OCR errors)
    if (/^\d+$/.test(item.description.trim())) {
      item.confidence = Math.min(item.confidence, 30);
      item.validationFlags.push({
        type: 'invalid_chars',
        severity: 'error',
        message: 'Description appears to be only numbers',
        suggestion: 'This may be a SKU or barcode, not an item description'
      });
    }
  }

  private validateQuantity(item: ExtractedLineItem): void {
    if (item.quantity <= 0) {
      item.quantity = 1;
      item.validationFlags.push({
        type: 'incomplete',
        severity: 'warning',
        message: 'Invalid quantity, set to 1',
        suggestion: 'Verify the correct quantity'
      });
    }
  }

  /**
   * Helper methods
   */
  private shouldSkipLine(line: string): boolean {
    const skipPatterns = [
      /^(total|subtotal|tax|gst|hst|pst|vat|amount\s*due|balance|payment|cash|credit|debit|visa|mastercard|receipt|thank|store|address|phone|www\.|cashier|refund|auth|approved)/i,
      /^\d+\/\d+\/\d+/, // Dates
      /^\d+:\d+/, // Times
      /^[\d\s\-\/]+$/, // Number/date patterns
      /^.{0,2}$/ // Very short lines
    ];
    
    return skipPatterns.some(pattern => pattern.test(line));
  }

  private lineAlreadyProcessed(line: string, existingDescriptions: Set<string>): boolean {
    const normalizedLine = line.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    return existingDescriptions.has(normalizedLine);
  }

  private isValidExtraction(item: Partial<ExtractedLineItem>): boolean {
    return !!(item.description && 
             item.description.length > 2 && 
             item.totalPrice && 
             item.totalPrice > 0 && 
             item.totalPrice < 10000);
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/^\d+\.?\s*/, '') // Remove leading numbers
      .replace(/^[\*\-\•\>\<]\s*/, '') // Remove bullet points
      .replace(/\b\d{10,}\b/g, '') // Remove long codes
      .replace(/\s+/g, ' ')
      .trim();
  }

  private categorizeItem(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('paper') || desc.includes('pen') || desc.includes('staple') || desc.includes('office')) {
      return 'Office Supplies';
    }
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('parking') || desc.includes('taxi')) {
      return 'Travel & Transportation';
    }
    if (desc.includes('food') || desc.includes('coffee') || desc.includes('meal') || desc.includes('lunch')) {
      return 'Meals & Entertainment';
    }
    if (desc.includes('software') || desc.includes('hardware') || desc.includes('computer') || desc.includes('tool')) {
      return 'Equipment & Software';
    }
    
    return 'Other';
  }

  /**
   * Get applicable patterns based on vendor
   */
  private getApplicablePatterns(vendorName?: string): ReceiptPattern[] {
    const patterns: ReceiptPattern[] = [...this.genericPatterns];
    
    if (vendorName) {
      const vendorPatterns = this.vendorPatterns.get(vendorName.toLowerCase());
      if (vendorPatterns) {
        patterns.unshift(...vendorPatterns);
      }
    }
    
    return patterns;
  }

  /**
   * Calculate processing statistics
   */
  private calculateProcessingStats(items: ExtractedLineItem[], startTime: number) {
    const aiExtractions = items.filter(item => item.extractionMethod.startsWith('ai')).length;
    const patternMatches = items.filter(item => item.extractionMethod === 'pattern_match').length;
    const heuristicMatches = items.filter(item => item.extractionMethod === 'heuristic').length;
    
    return {
      aiExtractions,
      patternMatches,
      heuristicMatches,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Create validation summary
   */
  private createValidationSummary(items: ExtractedLineItem[]) {
    let errors = 0;
    let warnings = 0;
    let totalConfidence = 0;
    
    for (const item of items) {
      totalConfidence += item.confidence;
      for (const flag of item.validationFlags) {
        if (flag.severity === 'error') errors++;
        else if (flag.severity === 'warning') warnings++;
      }
    }
    
    return {
      errors,
      warnings,
      overallConfidence: items.length > 0 ? Math.round(totalConfidence / items.length) : 0
    };
  }

  /**
   * Initialize vendor-specific and generic patterns
   */
  private initializePatterns(): void {
    // Generic patterns that work across most receipts
    this.genericPatterns = [
      {
        name: 'standard_item_price',
        vendorPatterns: ['*'],
        lineItemRegex: /^(.+?)\s+\$?(\d+\.?\d*)\s*$/,
        quantityPatterns: [/(\d+)\s*[x@]/i],
        pricePatterns: [/\$?(\d+\.\d{2})/],
        skipPatterns: [/total|tax|subtotal/i],
        extractionLogic: (line: string, context: string[]) => {
          const match = line.match(/^(.+?)\s+\$?(\d+\.?\d*)\s*$/);
          if (match) {
            const [, description, priceStr] = match;
            const price = parseFloat(priceStr);
            if (price > 0 && price < 1000 && description.length > 2) {
              return {
                description: description.trim(),
                quantity: 1,
                unitPrice: price,
                totalPrice: price,
                category: 'Other'
              };
            }
          }
          return null;
        }
      },
      {
        name: 'quantity_at_price',
        vendorPatterns: ['*'],
        lineItemRegex: /^(.+?)\s+(\d+)\s*[x@]\s*\$?(\d+\.?\d*)/i,
        quantityPatterns: [/(\d+)\s*[x@]/i],
        pricePatterns: [/\$?(\d+\.\d{2})/],
        skipPatterns: [/total|tax|subtotal/i],
        extractionLogic: (line: string, context: string[]) => {
          const match = line.match(/^(.+?)\s+(\d+)\s*[x@]\s*\$?(\d+\.?\d*)\s*=?\s*\$?(\d+\.?\d*)?$/i);
          if (match) {
            const [, description, qtyStr, unitPriceStr, totalPriceStr] = match;
            const quantity = parseInt(qtyStr);
            const unitPrice = parseFloat(unitPriceStr);
            const totalPrice = totalPriceStr ? parseFloat(totalPriceStr) : quantity * unitPrice;
            
            if (quantity > 0 && quantity <= 100 && unitPrice > 0) {
              return {
                description: description.trim(),
                quantity,
                unitPrice,
                totalPrice,
                category: 'Other'
              };
            }
          }
          return null;
        }
      }
    ];

    // Home Depot specific patterns
    this.vendorPatterns.set('home depot', [
      {
        name: 'home_depot_standard',
        vendorPatterns: ['home depot', 'homedepot'],
        lineItemRegex: /^(.+?)\s+(\d+)\s*@\s*\$(\d+\.\d{2})\s+\$(\d+\.\d{2})$/,
        quantityPatterns: [/(\d+)\s*@/],
        pricePatterns: [/\$(\d+\.\d{2})/],
        skipPatterns: [/tax|total|subtotal|cash|change|visa|mastercard/i],
        extractionLogic: (line: string, context: string[]) => {
          const match = line.match(/^(.+?)\s+(\d+)\s*@\s*\$(\d+\.\d{2})\s+\$(\d+\.\d{2})$/);
          if (match) {
            const [, desc, qty, unitPrice, totalPrice] = match;
            return {
              description: desc.trim(),
              quantity: parseInt(qty),
              unitPrice: parseFloat(unitPrice),
              totalPrice: parseFloat(totalPrice),
              category: 'Equipment & Software'
            };
          }
          return null;
        }
      }
    ]);

    // Add more vendor-specific patterns as needed
    // This is where you'd add Walmart, Target, Costco, etc. patterns
  }
}