import { MistralOCRProvider } from './providers/mistral-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { OCRProvider, OCRResult, OCRConfig } from './types';

export class OCRService {
  private providers: OCRProvider[] = [];
  private config: OCRConfig;
  private cache: Map<string, OCRResult> = new Map();

  constructor(config?: Partial<OCRConfig>) {
    this.config = {
      primaryProvider: config?.primaryProvider || 'mistral',
      fallbackProviders: config?.fallbackProviders || ['openai'],
      enableCaching: config?.enableCaching ?? true,
      costThreshold: config?.costThreshold || 0.01,
      accuracyThreshold: config?.accuracyThreshold || 70,
      maxRetries: config?.maxRetries || 2,
      timeout: config?.timeout || 30000
    };

    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize all providers
    const allProviders = [
      new MistralOCRProvider(),
      new OpenAIProvider()
    ];

    // Sort by priority and availability
    this.providers = allProviders
      .filter(p => p.isAvailable())
      .sort((a, b) => a.priority - b.priority);

    console.log('Available OCR providers:', this.providers.map(p => p.name));
  }

  async processReceipt(imageBase64: string): Promise<OCRResult> {
    // Check cache first
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey(imageBase64);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('Returning cached OCR result');
        return { ...cached, provider: `${cached.provider} (cached)` };
      }
    }

    // Try primary provider first
    const primaryProvider = this.providers.find(p => p.name === this.config.primaryProvider);
    if (primaryProvider) {
      const result = await this.tryProvider(primaryProvider, imageBase64);
      if (result.success && result.confidence >= this.config.accuracyThreshold) {
        this.cacheResult(imageBase64, result);
        return result;
      }
    }

    // Fallback to other providers
    for (const provider of this.providers) {
      if (provider.name === this.config.primaryProvider) continue;
      
      const result = await this.tryProvider(provider, imageBase64);
      if (result.success) {
        this.cacheResult(imageBase64, result);
        return result;
      }
    }

    // If all providers fail, return mock data for demo
    return this.getMockResult();
  }

  private async tryProvider(provider: OCRProvider, imageBase64: string): Promise<OCRResult> {
    try {
      console.log(`Processing with ${provider.name} provider...`);
      
      // Add timeout wrapper
      const timeoutPromise = new Promise<OCRResult>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), this.config.timeout);
      });

      const result = await Promise.race([
        provider.process(imageBase64),
        timeoutPromise
      ]);

      // Check cost threshold
      if (result.cost > this.config.costThreshold) {
        console.warn(`${provider.name} cost ($${result.cost}) exceeds threshold ($${this.config.costThreshold})`);
      }

      return result;
    } catch (error) {
      console.error(`${provider.name} provider error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Provider failed',
        provider: provider.name,
        processingTime: 0,
        cost: 0,
        confidence: 0
      };
    }
  }

  private generateCacheKey(imageBase64: string): string {
    // Simple hash based on image length and first/last characters
    const len = imageBase64.length;
    const sample = imageBase64.substring(0, 100) + imageBase64.substring(len - 100);
    return `${len}-${sample}`;
  }

  private cacheResult(imageBase64: string, result: OCRResult) {
    if (!this.config.enableCaching) return;
    
    const cacheKey = this.generateCacheKey(imageBase64);
    this.cache.set(cacheKey, result);

    // Clear old cache entries if too many
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  private getMockResult(): OCRResult {
    const mockData = {
      vendor: "Demo Store",
      date: new Date().toISOString().split('T')[0],
      totalAmount: 99.99,
      subtotal: 91.73,
      tax: 8.26,
      currency: "USD",
      lineItems: [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-1`,
          description: "Sample Item 1",
          quantity: 2,
          unitPrice: 25.99,
          totalPrice: 51.98,
          category: "Office Supplies"
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-2`,
          description: "Sample Item 2",
          quantity: 1,
          unitPrice: 39.75,
          totalPrice: 39.75,
          category: "Equipment & Software"
        }
      ],
      category: "Office Supplies",
      confidence: 0,
      notes: "Demo mode - configure OCR provider for real processing"
    };

    return {
      success: true,
      data: mockData,
      provider: 'mock',
      processingTime: 100,
      cost: 0,
      confidence: 0
    };
  }

  getProviderStats() {
    return this.providers.map(p => ({
      name: p.name,
      available: p.isAvailable(),
      costPerPage: p.getCostPerPage(),
      accuracy: p.getAccuracyScore(),
      priority: p.priority
    }));
  }
}

// Singleton instance
let ocrService: OCRService | null = null;

export function getOCRService(config?: Partial<OCRConfig>): OCRService {
  if (!ocrService) {
    ocrService = new OCRService(config);
  }
  return ocrService;
}