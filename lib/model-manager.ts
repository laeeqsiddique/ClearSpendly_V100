import { createWorker, Worker } from 'tesseract.js';

export interface ModelConfig {
  name: string;
  language: string;
  url?: string;
  version: string;
  receiptTypes: string[];
  accuracy: number;
  size: number; // in MB
}

export interface ModelPerformance {
  modelName: string;
  accuracy: number;
  processingTime: number;
  confidenceScore: number;
  receiptType: string;
  errorPatterns: string[];
  timestamp: Date;
}

export class TesseractModelManager {
  private models: Map<string, ModelConfig> = new Map();
  private workers: Map<string, Worker> = new Map();
  private performance: ModelPerformance[] = [];

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    // Default English model
    this.models.set('eng', {
      name: 'eng',
      language: 'eng',
      version: '4.1.0',
      receiptTypes: ['general'],
      accuracy: 85,
      size: 11.5
    });

    // Future custom models
    this.models.set('receipt-grocery', {
      name: 'receipt-grocery',
      language: 'receipt-grocery',
      url: '/models/receipt-grocery.traineddata',
      version: '1.0.0',
      receiptTypes: ['grocery', 'retail'],
      accuracy: 95,
      size: 8.2
    });

    this.models.set('receipt-restaurant', {
      name: 'receipt-restaurant',
      language: 'receipt-restaurant', 
      url: '/models/receipt-restaurant.traineddata',
      version: '1.0.0',
      receiptTypes: ['restaurant', 'food'],
      accuracy: 93,
      size: 7.8
    });
  }

  async getOptimalModel(receiptType?: string): Promise<string> {
    if (!receiptType) return 'eng';

    // Find best model for receipt type
    let bestModel = 'eng';
    let bestAccuracy = 0;

    for (const [name, config] of this.models) {
      if (config.receiptTypes.includes(receiptType)) {
        if (config.accuracy > bestAccuracy) {
          bestAccuracy = config.accuracy;
          bestModel = name;
        }
      }
    }

    // Check if custom model is available
    const modelConfig = this.models.get(bestModel);
    if (modelConfig?.url) {
      const isAvailable = await this.checkModelAvailability(modelConfig.url);
      if (!isAvailable) {
        console.warn(`Custom model ${bestModel} not available, falling back to eng`);
        return 'eng';
      }
    }

    return bestModel;
  }

  async createWorkerForModel(modelName: string): Promise<Worker> {
    // Reuse existing worker if available
    if (this.workers.has(modelName)) {
      return this.workers.get(modelName)!;
    }

    const modelConfig = this.models.get(modelName);
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const workerOptions: any = {
      logger: (m: any) => console.log(`OCR [${modelName}]:`, m),
      cachePath: '.',
    };

    // Add custom model path if available
    if (modelConfig.url) {
      workerOptions.langPath = '/models/';
    }

    const worker = await createWorker(modelConfig.language, 1, workerOptions);
    
    // Cache worker for reuse
    this.workers.set(modelName, worker);
    
    console.log(`✅ Initialized ${modelName} model (v${modelConfig.version})`);
    return worker;
  }

  async detectReceiptType(text: string): Promise<string> {
    const patterns = {
      grocery: /walmart|kroger|safeway|target|costco|grocery|supermarket/i,
      restaurant: /restaurant|cafe|bistro|diner|pizza|burger|tip|gratuity/i,
      gas: /shell|exxon|chevron|bp|texaco|gas|fuel|gasoline/i,
      retail: /best buy|apple|amazon|nike|clothing|electronics/i,
      service: /repair|service|maintenance|consultation|professional/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return type;
      }
    }

    return 'general';
  }

  async performanceTest(modelName: string, testCases: Array<{image: string, expectedText: string}>): Promise<number> {
    const worker = await this.createWorkerForModel(modelName);
    let correctResults = 0;
    const totalCases = testCases.length;

    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        const result = await worker.recognize(testCase.image);
        const processingTime = Date.now() - startTime;

        const accuracy = this.calculateTextAccuracy(result.data.text, testCase.expectedText);
        
        this.performance.push({
          modelName,
          accuracy,
          processingTime,
          confidenceScore: result.data.confidence,
          receiptType: await this.detectReceiptType(result.data.text),
          errorPatterns: this.findErrorPatterns(result.data.text, testCase.expectedText),
          timestamp: new Date()
        });

        if (accuracy > 90) correctResults++;
      } catch (error) {
        console.error(`Test failed for ${modelName}:`, error);
      }
    }

    const overallAccuracy = (correctResults / totalCases) * 100;
    console.log(`${modelName} performance: ${overallAccuracy.toFixed(1)}% accuracy on ${totalCases} test cases`);
    
    return overallAccuracy;
  }

  private calculateTextAccuracy(predicted: string, expected: string): number {
    const predWords = predicted.toLowerCase().split(/\s+/);
    const expWords = expected.toLowerCase().split(/\s+/);
    
    let matches = 0;
    const maxLength = Math.max(predWords.length, expWords.length);
    
    for (let i = 0; i < Math.min(predWords.length, expWords.length); i++) {
      if (predWords[i] === expWords[i]) {
        matches++;
      }
    }
    
    return (matches / maxLength) * 100;
  }

  private findErrorPatterns(predicted: string, expected: string): string[] {
    const patterns: string[] = [];
    
    // Common OCR error patterns
    const errorMappings = {
      '0': 'O', '1': 'l', '5': 'S', '8': 'B',
      'rn': 'm', 'cl': 'd', 'li': 'h'
    };

    for (const [incorrect, correct] of Object.entries(errorMappings)) {
      if (predicted.includes(incorrect) && expected.includes(correct)) {
        patterns.push(`${incorrect} → ${correct}`);
      }
    }

    return patterns;
  }

  async compareModels(testCases: Array<{image: string, expectedText: string}>): Promise<{[modelName: string]: number}> {
    const results: {[modelName: string]: number} = {};
    
    for (const modelName of this.models.keys()) {
      try {
        results[modelName] = await this.performanceTest(modelName, testCases);
      } catch (error) {
        console.error(`Failed to test model ${modelName}:`, error);
        results[modelName] = 0;
      }
    }

    // Log comparison results
    console.log('\n📊 Model Performance Comparison:');
    Object.entries(results)
      .sort(([,a], [,b]) => b - a)
      .forEach(([model, accuracy]) => {
        console.log(`  ${model}: ${accuracy.toFixed(1)}%`);
      });

    return results;
  }

  getPerformanceHistory(modelName?: string): ModelPerformance[] {
    if (modelName) {
      return this.performance.filter(p => p.modelName === modelName);
    }
    return this.performance;
  }

  private async checkModelAvailability(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async deployModel(modelFile: File, modelName: string, config: Partial<ModelConfig>): Promise<void> {
    // In a real implementation, this would upload the model to your CDN/storage
    console.log(`Deploying model ${modelName}...`);
    
    const fullConfig: ModelConfig = {
      name: modelName,
      language: modelName,
      url: `/models/${modelName}.traineddata`,
      version: config.version || '1.0.0',
      receiptTypes: config.receiptTypes || ['general'],
      accuracy: config.accuracy || 85,
      size: modelFile.size / (1024 * 1024) // Convert to MB
    };

    this.models.set(modelName, fullConfig);
    console.log(`✅ Model ${modelName} deployed successfully`);
  }

  listAvailableModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  async cleanupWorkers(): Promise<void> {
    for (const [name, worker] of this.workers) {
      try {
        await worker.terminate();
        console.log(`🧹 Terminated worker: ${name}`);
      } catch (error) {
        console.error(`Failed to terminate worker ${name}:`, error);
      }
    }
    this.workers.clear();
  }
}

// Singleton instance
let modelManager: TesseractModelManager | null = null;

export function getModelManager(): TesseractModelManager {
  if (!modelManager) {
    modelManager = new TesseractModelManager();
  }
  return modelManager;
}