// Multi-Pass AI-First Receipt Processing System
// Optimized for cost, accuracy, and Railway hosting constraints

// Deployment-safe AI SDK imports
let openai: any = null;
let anthropic: any = null;
let generateText: any = null;
let ImageQualityMetrics: any = null;
let EnhancedImagePreprocessor: any = null;

// Build-time detection
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

if (!isBuildTime) {
  try {
    const openaiModule = require("@ai-sdk/openai");
    const anthropicModule = require("@ai-sdk/anthropic");
    const aiModule = require("ai");
    const preprocessingModule = require("./ai-enhanced-preprocessing");
    
    openai = openaiModule.openai;
    anthropic = anthropicModule.anthropic;
    generateText = aiModule.generateText;
    ImageQualityMetrics = preprocessingModule.ImageQualityMetrics;
    EnhancedImagePreprocessor = preprocessingModule.EnhancedImagePreprocessor;
  } catch (error) {
    console.warn('AI SDK modules not available during build:', error);
  }
}

export interface ProcessingRoute {
  name: string;
  provider: 'openai' | 'anthropic' | 'textract' | 'tesseract';
  model: string;
  costPerRequest: number;
  expectedAccuracy: number;
  averageTime: number;
  description: string;
}

export interface CostBudget {
  dailyLimit: number;
  currentSpent: number;
  remainingBudget: number;
  receiptCount: number;
  averageCostPerReceipt: number;
}

export interface ParsedReceiptData {
  vendor: string;
  date: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  currency: string;
  lineItems: LineItemData[];
  category: string;
  confidence: number;
  processingTime: number;
  processingRoute: string;
  costEstimate: number;
  qualityMetrics?: ImageQualityMetrics;
}

export interface LineItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  confidence?: number;
}

export interface MultiPassResult {
  success: boolean;
  data?: ParsedReceiptData;
  error?: string;
  fallbackUsed: boolean;
  totalCost: number;
  processingTime: number;
  routesAttempted: string[];
}

export class MultiPassAIProcessor {
  private preprocessor: any;
  private costBudget: CostBudget;
  private isAvailable: boolean;
  
  // Available processing routes (ordered by cost-effectiveness)
  private routes: ProcessingRoute[] = [
    {
      name: 'gpt-4o-nano',
      provider: 'openai',
      model: 'gpt-4o-nano',
      costPerRequest: 0.0002,
      expectedAccuracy: 88,
      averageTime: 1500,
      description: 'Ultra-fast, ultra-cheap for simple receipts'
    },
    {
      name: 'gpt-4o-mini',
      provider: 'openai', 
      model: 'gpt-4o-mini',
      costPerRequest: 0.002,
      expectedAccuracy: 92,
      averageTime: 2500,
      description: 'Balanced cost/accuracy for standard receipts'
    },
    {
      name: 'claude-3-haiku',
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307', 
      costPerRequest: 0.0015,
      expectedAccuracy: 90,
      averageTime: 2000,
      description: 'Alternative AI provider for diversity'
    },
    {
      name: 'gpt-4o',
      provider: 'openai',
      model: 'gpt-4o',
      costPerRequest: 0.005,
      expectedAccuracy: 95,
      averageTime: 3500,
      description: 'Premium accuracy for complex receipts'
    }
  ];

  constructor() {
    // Build-time safety check
    this.isAvailable = !isBuildTime && EnhancedImagePreprocessor !== null;
    
    if (this.isAvailable) {
      this.preprocessor = new EnhancedImagePreprocessor();
    } else {
      this.preprocessor = null;
    }
    
    this.costBudget = this.initializeCostBudget();
  }

  /**
   * Main processing function - handles the entire multi-pass pipeline
   */
  async processReceipt(
    imageFile: File,
    userTier: 'free' | 'pro' | 'enterprise' = 'free'
  ): Promise<MultiPassResult> {
    // Build-time safety check
    if (!this.isAvailable) {
      throw new Error('AI processing is not available during build time');
    }

    const startTime = Date.now();
    const routesAttempted: string[] = [];
    let totalCost = 0;
    let fallbackUsed = false;

    try {
      console.log('🚀 Starting multi-pass AI receipt processing...');

      // Stage 1: Analyze image quality and determine processing strategy
      const qualityMetrics = await this.preprocessor.analyzeImageQuality(imageFile);
      console.log('📊 Image quality analysis:', qualityMetrics);

      // Stage 2: Select optimal processing route based on multiple factors
      const selectedRoute = this.selectProcessingRoute(qualityMetrics, userTier);
      console.log('🎯 Selected processing route:', selectedRoute.name);

      // Stage 3: Preprocess image if needed
      let processedImageData: string;
      if (qualityMetrics.overallScore < 60) {
        console.log('🔧 Applying enhanced preprocessing...');
        processedImageData = await this.preprocessor.enhanceImage(imageFile, {
          enableEnhancedPreprocessing: true,
          targetDPI: 300,
          adaptiveBinarization: true,
          perspectiveCorrection: qualityMetrics.overallScore < 40,
          noiseReduction: qualityMetrics.sharpness < 30
        });
      } else {
        // Use original image for high-quality images
        processedImageData = await this.fileToDataURL(imageFile);
      }

      // Stage 4: Process with selected AI model
      routesAttempted.push(selectedRoute.name);
      let result = await this.processWithRoute(processedImageData, selectedRoute, qualityMetrics);
      totalCost += selectedRoute.costPerRequest;

      // Stage 5: Validate result and apply fallback if needed
      if (!result || result.confidence < 60) {
        console.log('⚠️ Primary processing failed or low confidence, trying fallback...');
        
        // Try next best route if budget allows
        const fallbackRoute = this.selectFallbackRoute(selectedRoute, userTier);
        if (fallbackRoute && this.canAffordRoute(fallbackRoute)) {
          console.log('🔄 Trying fallback route:', fallbackRoute.name);
          routesAttempted.push(fallbackRoute.name);
          
          const fallbackResult = await this.processWithRoute(processedImageData, fallbackRoute, qualityMetrics);
          if (fallbackResult && fallbackResult.confidence > (result?.confidence || 0)) {
            result = fallbackResult;
            totalCost += fallbackRoute.costPerRequest;
            fallbackUsed = true;
          }
        } else {
          console.log('🆘 Using Tesseract.js fallback...');
          result = await this.processwithTesseractFallback(imageFile);
          fallbackUsed = true;
        }
      }

      // Stage 6: Apply multi-model fusion if this is a complex receipt and user allows it
      if (qualityMetrics.processingRoute === 'complex' && 
          userTier !== 'free' && 
          result && 
          result.confidence < 85) {
        console.log('🧠 Applying multi-model fusion for complex receipt...');
        result = await this.applyMultiModelFusion(processedImageData, result, qualityMetrics);
      }

      // Stage 7: Post-process and validate
      if (result) {
        result = this.postProcessResult(result, qualityMetrics);
        result.processingTime = Date.now() - startTime;
        result.costEstimate = totalCost;
        
        // Update cost tracking
        this.updateCostBudget(totalCost);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Multi-pass processing completed in ${processingTime}ms, cost: $${totalCost.toFixed(4)}`);

      return {
        success: !!result,
        data: result || undefined,
        error: result ? undefined : 'Processing failed on all routes',
        fallbackUsed,
        totalCost,
        processingTime,
        routesAttempted
      };

    } catch (error) {
      console.error('❌ Multi-pass processing error:', error);
      
      // Last resort: Tesseract.js fallback
      console.log('🆘 Attempting final Tesseract.js fallback...');
      try {
        const fallbackResult = await this.processwithTesseractFallback(imageFile);
        return {
          success: true,
          data: fallbackResult,
          error: undefined,
          fallbackUsed: true,
          totalCost,
          processingTime: Date.now() - startTime,
          routesAttempted: [...routesAttempted, 'tesseract-fallback']
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `All processing routes failed: ${error.message}`,
          fallbackUsed: true,
          totalCost,
          processingTime: Date.now() - startTime,
          routesAttempted
        };
      }
    }
  }

  /**
   * Select optimal processing route based on image quality, user tier, and cost budget
   */
  private selectProcessingRoute(
    metrics: ImageQualityMetrics, 
    userTier: 'free' | 'pro' | 'enterprise'
  ): ProcessingRoute {
    // Filter routes based on user tier
    let availableRoutes = this.routes;
    
    if (userTier === 'free') {
      // Free tier limited to cheapest options
      availableRoutes = this.routes.filter(r => r.costPerRequest <= 0.002);
    } else if (userTier === 'pro') {
      // Pro tier can use up to mid-tier options
      availableRoutes = this.routes.filter(r => r.costPerRequest <= 0.005);
    }
    // Enterprise gets all routes

    // Select based on processing route complexity
    switch (metrics.processingRoute) {
      case 'simple':
        // High quality, simple receipt - use cheapest effective option
        return availableRoutes.find(r => r.name === 'gpt-4o-nano') || availableRoutes[0];
        
      case 'standard':
        // Medium complexity - balance cost and accuracy
        return availableRoutes.find(r => r.name === 'gpt-4o-mini') || 
               availableRoutes.find(r => r.name === 'claude-3-haiku') || 
               availableRoutes[0];
               
      case 'complex':
        // Complex receipt - prioritize accuracy
        return availableRoutes.find(r => r.name === 'gpt-4o') ||
               availableRoutes.find(r => r.name === 'gpt-4o-mini') ||
               availableRoutes[availableRoutes.length - 1];
               
      default:
        return availableRoutes[0];
    }
  }

  /**
   * Process image with specific AI route
   */
  private async processWithRoute(
    imageData: string,
    route: ProcessingRoute,
    metrics: ImageQualityMetrics
  ): Promise<ParsedReceiptData | null> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Processing with ${route.name}...`);

      // Optimized prompt based on image quality and complexity
      const prompt = this.generateOptimizedPrompt(metrics);

      let result;
      
      if (route.provider === 'openai') {
        result = await generateText({
          model: openai(route.model),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image", image: imageData }
              ],
            },
          ],
          maxTokens: 1000,
          temperature: 0.1,
        });
      } else if (route.provider === 'anthropic') {
        result = await generateText({
          model: anthropic(route.model),
          messages: [
            {
              role: "user", 
              content: [
                { type: "text", text: prompt },
                { type: "image", image: imageData }
              ],
            },
          ],
          maxTokens: 1000,
          temperature: 0.1,
        });
      } else {
        throw new Error(`Unsupported provider: ${route.provider}`);
      }

      // Parse and validate the result
      const extractedData = this.parseAIResponse(result.text);
      if (!extractedData) {
        console.warn(`Failed to parse response from ${route.name}`);
        return null;
      }

      return {
        ...extractedData,
        processingTime: Date.now() - startTime,
        processingRoute: route.name,
        costEstimate: route.costPerRequest,
        qualityMetrics: metrics
      };

    } catch (error) {
      console.error(`❌ Error processing with ${route.name}:`, error);
      return null;
    }
  }

  /**
   * Generate optimized prompt based on image quality metrics
   */
  private generateOptimizedPrompt(metrics: ImageQualityMetrics): string {
    let basePrompt = `Extract receipt information and return ONLY valid JSON:

{
  "vendor": "string - business name",
  "date": "YYYY-MM-DD",
  "totalAmount": number,
  "subtotal": number,
  "tax": number,
  "currency": "USD",
  "lineItems": [
    {
      "description": "string - exact item name",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "category": "string"
    }
  ],
  "category": "string - expense category",
  "confidence": number - 0-100 confidence score
}

CRITICAL LINE ITEM RULES:
1. Extract EACH item separately - do NOT combine similar items
2. Use EXACT prices from receipt - do NOT calculate or divide
3. If quantity > 1 shown, use that quantity with total price
4. Read each line carefully - separate lines = separate items
5. NEVER group items or average prices

Categories: "Office Supplies", "Travel & Transportation", "Meals & Entertainment", "Equipment & Software", "Professional Services", "Marketing & Advertising", "Utilities", "Insurance", "Other"`;

    // Add specific instructions based on image quality
    if (metrics.sharpness < 40) {
      basePrompt += "\n\nNOTE: Image may be blurry - be extra careful with number recognition.";
    }
    
    if (metrics.contrast < 30) {
      basePrompt += "\n\nNOTE: Low contrast image - focus on distinguishing text from background.";
    }
    
    if (metrics.estimatedLineItems > 10) {
      basePrompt += "\n\nNOTE: Receipt appears to have many items - ensure you capture all line items.";
    }

    basePrompt += "\n\nReturn ONLY the JSON object, no additional text.";
    
    return basePrompt;
  }

  /**
   * Apply multi-model fusion for complex receipts
   */
  private async applyMultiModelFusion(
    imageData: string,
    primaryResult: ParsedReceiptData,
    metrics: ImageQualityMetrics
  ): Promise<ParsedReceiptData> {
    console.log('🧠 Applying multi-model result fusion...');
    
    try {
      // Get secondary opinion from different provider
      const secondaryRoute = this.routes.find(r => 
        r.provider !== 'openai' && r.costPerRequest <= 0.003
      );
      
      if (!secondaryRoute || !this.canAffordRoute(secondaryRoute)) {
        console.log('⚠️ Cannot afford secondary processing, skipping fusion');
        return primaryResult;
      }

      const secondaryResult = await this.processWithRoute(imageData, secondaryRoute, metrics);
      
      if (!secondaryResult) {
        console.log('⚠️ Secondary processing failed, using primary result');
        return primaryResult;
      }

      // Fuse results using confidence-weighted approach
      return this.fuseResults(primaryResult, secondaryResult);
      
    } catch (error) {
      console.error('❌ Multi-model fusion failed:', error);
      return primaryResult;
    }
  }

  /**
   * Intelligent result fusion algorithm
   */
  private fuseResults(primary: ParsedReceiptData, secondary: ParsedReceiptData): ParsedReceiptData {
    console.log('🔀 Fusing results from two AI models...');
    
    const primaryWeight = primary.confidence / 100;
    const secondaryWeight = secondary.confidence / 100;
    const totalWeight = primaryWeight + secondaryWeight;
    
    // Use weighted voting for key fields
    const fusedResult: ParsedReceiptData = {
      vendor: primary.confidence > secondary.confidence ? primary.vendor : secondary.vendor,
      date: primary.date || secondary.date,
      totalAmount: this.fuseNumericValue(primary.totalAmount, secondary.totalAmount, primaryWeight, secondaryWeight),
      subtotal: this.fuseNumericValue(primary.subtotal, secondary.subtotal, primaryWeight, secondaryWeight),
      tax: this.fuseNumericValue(primary.tax, secondary.tax, primaryWeight, secondaryWeight),
      currency: primary.currency || secondary.currency,
      lineItems: this.fuseLineItems(primary.lineItems, secondary.lineItems),
      category: primary.category || secondary.category,
      confidence: Math.min(95, (primary.confidence * primaryWeight + secondary.confidence * secondaryWeight) / totalWeight),
      processingTime: primary.processingTime + secondary.processingTime,
      processingRoute: `fusion:${primary.processingRoute}+${secondary.processingRoute}`,
      costEstimate: primary.costEstimate + secondary.costEstimate,
      qualityMetrics: primary.qualityMetrics
    };

    console.log(`✨ Result fusion completed. Combined confidence: ${fusedResult.confidence}%`);
    return fusedResult;
  }

  /**
   * Fuse numeric values using weighted average with validation
   */
  private fuseNumericValue(val1: number, val2: number, weight1: number, weight2: number): number {
    if (!val1 && !val2) return 0;
    if (!val1) return val2;  
    if (!val2) return val1;
    
    // If values are very close (within 5%), use weighted average
    const diff = Math.abs(val1 - val2) / Math.max(val1, val2);
    if (diff <= 0.05) {
      return (val1 * weight1 + val2 * weight2) / (weight1 + weight2);
    }
    
    // If values differ significantly, use the one from higher confidence model
    return weight1 > weight2 ? val1 : val2;
  }

  /**
   * Intelligent line item fusion with deduplication
   */
  private fuseLineItems(items1: LineItemData[], items2: LineItemData[]): LineItemData[] {
    if (!items1.length) return items2;
    if (!items2.length) return items1;
    
    const fusedItems: LineItemData[] = [];
    const used2: boolean[] = new Array(items2.length).fill(false);
    
    // Match items from both sets
    for (const item1 of items1) {
      let bestMatch = -1;
      let bestSimilarity = 0;
      
      for (let i = 0; i < items2.length; i++) {
        if (used2[i]) continue;
        
        const similarity = this.calculateItemSimilarity(item1, items2[i]);
        if (similarity > bestSimilarity && similarity > 0.7) {
          bestSimilarity = similarity;
          bestMatch = i;
        }
      }
      
      if (bestMatch >= 0) {
        // Merge matched items
        used2[bestMatch] = true;
        fusedItems.push(this.mergeLineItems(item1, items2[bestMatch]));
      } else {
        // Keep unmatched item from first set
        fusedItems.push(item1);
      }
    }
    
    // Add unmatched items from second set
    for (let i = 0; i < items2.length; i++) {
      if (!used2[i]) {
        fusedItems.push(items2[i]);
      }
    }
    
    return fusedItems;
  }

  /**
   * Calculate similarity between two line items
   */
  private calculateItemSimilarity(item1: LineItemData, item2: LineItemData): number {
    // Normalize descriptions for comparison
    const desc1 = item1.description.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const desc2 = item2.description.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    
    // Calculate Levenshtein distance ratio
    const maxLen = Math.max(desc1.length, desc2.length);
    if (maxLen === 0) return 0;
    
    const distance = this.levenshteinDistance(desc1, desc2);
    const textSimilarity = 1 - (distance / maxLen);
    
    // Factor in price similarity
    const priceDiff = Math.abs(item1.totalPrice - item2.totalPrice) / Math.max(item1.totalPrice, item2.totalPrice);
    const priceSimilarity = 1 - Math.min(1, priceDiff);
    
    // Weighted combination
    return textSimilarity * 0.7 + priceSimilarity * 0.3;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Merge two similar line items
   */
  private mergeLineItems(item1: LineItemData, item2: LineItemData): LineItemData {
    return {
      description: item1.description.length > item2.description.length ? item1.description : item2.description,
      quantity: item1.quantity || item2.quantity,
      unitPrice: item1.unitPrice || item2.unitPrice,
      totalPrice: item1.totalPrice || item2.totalPrice,
      category: item1.category || item2.category,
      confidence: Math.min(95, ((item1.confidence || 75) + (item2.confidence || 75)) / 2)
    };
  }

  /**
   * Tesseract.js fallback processor
   */
  private async processwithTesseractFallback(imageFile: File): Promise<ParsedReceiptData> {
    console.log('🔧 Processing with Tesseract.js fallback...');
    
    // This would integrate with your existing OCR processor
    // For now, return a basic structure
    return {
      vendor: 'Unknown Vendor',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      subtotal: 0,
      tax: 0,
      currency: 'USD',
      lineItems: [],
      category: 'Other',
      confidence: 30, // Low confidence for fallback
      processingTime: 2000,
      processingRoute: 'tesseract-fallback',
      costEstimate: 0
    };
  }

  /**
   * Post-process and validate result
   */
  private postProcessResult(result: ParsedReceiptData, metrics: ImageQualityMetrics): ParsedReceiptData {
    // Validate totals
    if (result.lineItems.length > 0) {
      const calculatedSubtotal = result.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // If subtotal is missing or incorrect, calculate it
      if (!result.subtotal || Math.abs(result.subtotal - calculatedSubtotal) > 0.01) {
        result.subtotal = Math.round(calculatedSubtotal * 100) / 100;
      }
      
      // Validate total
      const expectedTotal = result.subtotal + result.tax;
      if (Math.abs(result.totalAmount - expectedTotal) > 0.01) {
        // Adjust tax to make total consistent
        result.tax = Math.round((result.totalAmount - result.subtotal) * 100) / 100;
      }
    }

    // Adjust confidence based on consistency checks
    if (result.lineItems.length === 0) {
      result.confidence = Math.min(result.confidence, 50);
    }
    
    if (!result.vendor || result.vendor === 'Unknown Vendor') {
      result.confidence = Math.min(result.confidence, 60);
    }

    return result;
  }

  /**
   * Helper methods for cost management
   */
  private initializeCostBudget(): CostBudget {
    return {
      dailyLimit: 5.00, // $5 daily limit for free tier
      currentSpent: 0,
      remainingBudget: 5.00,
      receiptCount: 0,
      averageCostPerReceipt: 0
    };
  }

  private canAffordRoute(route: ProcessingRoute): boolean {
    return this.costBudget.remainingBudget >= route.costPerRequest;
  }

  private updateCostBudget(cost: number): void {
    this.costBudget.currentSpent += cost;
    this.costBudget.remainingBudget -= cost;
    this.costBudget.receiptCount += 1;
    this.costBudget.averageCostPerReceipt = this.costBudget.currentSpent / this.costBudget.receiptCount;
  }

  private selectFallbackRoute(primaryRoute: ProcessingRoute, userTier: string): ProcessingRoute | null {
    const availableRoutes = this.routes.filter(r => 
      r.name !== primaryRoute.name && 
      (userTier !== 'free' || r.costPerRequest <= 0.002)
    );
    
    return availableRoutes.length > 0 ? availableRoutes[0] : null;
  }

  /**
   * Parse AI response and extract structured data
   */
  private parseAIResponse(responseText: string): Partial<ParsedReceiptData> | null {
    try {
      const cleanedResponse = responseText.replace(/```json\s*|\s*```/g, "").trim();
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate required fields
      if (!parsed.vendor || typeof parsed.totalAmount !== 'number') {
        console.warn('Invalid AI response: missing required fields');
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return null;
    }
  }

  /**
   * Convert File to data URL
   */
  private async fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get current cost statistics
   */
  getCostStatistics(): CostBudget {
    return { ...this.costBudget };
  }

  /**
   * Reset daily cost budget (call this daily)
   */
  resetDailyBudget(): void {
    this.costBudget.currentSpent = 0;
    this.costBudget.remainingBudget = this.costBudget.dailyLimit;
    this.costBudget.receiptCount = 0;
    this.costBudget.averageCostPerReceipt = 0;
  }
}