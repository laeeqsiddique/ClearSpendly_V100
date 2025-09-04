// Agentic OCR Orchestrator - Coordinates the two-step process
import { 
  BaseAgent,
  AgentResult,
  OCRContext,
  AgentPipeline,
  AgentStage,
  PipelineConfig,
  AgentSelectionStrategy,
  VendorDetectionResult,
  VendorParsingResult,
  ExtractedReceiptData,
  VENDOR_TYPES,
  VendorType
} from './types';

import { VendorDetectionAgent, createVendorDetectionAgent } from './agents/vendor-detection-agent';
import { 
  VendorSpecificParsingAgent, 
  createWalmartParser,
  createHomeDepotParser,
  createGenericParser 
} from './agents/vendor-specific-parser';

import { getOCRService } from '../ocr-service';
import { OCRResult } from '../types';

export interface AgenticOCRResult {
  success: boolean;
  data?: ExtractedReceiptData;
  error?: string;
  
  // Pipeline execution details
  pipeline: {
    stage1_vendor_detection: AgentResult<VendorDetectionResult>;
    stage2_parsing: AgentResult<VendorParsingResult>;
    totalProcessingTime: number;
    totalCost: number;
  };
  
  // Quality metrics
  quality: {
    overallConfidence: number;
    vendorDetectionConfidence: number;
    parsingQuality: number;
    improvementOverBaseline?: number;
  };
  
  // Metadata
  metadata: {
    vendorType: VendorType;
    agentsUsed: string[];
    fallbacksTriggered: string[];
    costBreakdown: Record<string, number>;
  };
}

export class AgenticOCROrchestrator {
  private config: PipelineConfig;
  private vendorDetectionAgent: VendorDetectionAgent;
  private parsingAgents: Map<VendorType[], VendorSpecificParsingAgent>;
  private fallbackAgent: VendorSpecificParsingAgent;
  private baselineOCRService: any; // Current OCR service for comparison
  
  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      enableVendorDetection: true,
      enableSpecializedParsing: true,
      enableFallbacks: true,
      qualityThreshold: 0.7,
      costBudget: 0.05, // 5 cents per receipt max
      mode: 'production',
      ...config
    };
    
    this.initializeAgents();
    this.baselineOCRService = getOCRService();
  }

  async processReceipt(
    imageData: string,
    options: {
      skipBaseline?: boolean;
      forceVendor?: VendorType;
      maxCost?: number;
    } = {}
  ): Promise<AgenticOCRResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Get basic OCR extraction (existing system)
      console.log('🔄 Stage 1: Basic OCR extraction...');
      const basicOCRResult = options.skipBaseline ? null : 
        await this.baselineOCRService.processReceipt(imageData);
      
      if (basicOCRResult && !basicOCRResult.success) {
        throw new Error(`Basic OCR failed: ${basicOCRResult.error}`);
      }

      // Create OCR context
      const context: OCRContext = {
        rawText: basicOCRResult?.data?.rawText || this.extractTextFromImage(imageData),
        imageData,
        originalOCRResult: basicOCRResult,
        processingHints: []
      };

      // Step 2: Vendor Detection (if enabled)
      console.log('🔄 Stage 2: Vendor detection...');
      let vendorDetectionResult: AgentResult<VendorDetectionResult>;
      
      if (options.forceVendor) {
        // Skip detection if vendor is forced
        vendorDetectionResult = {
          success: true,
          data: {
            vendorType: options.forceVendor,
            confidence: 1.0,
            indicators: ['Forced vendor type'],
            fallbackToGeneric: false
          },
          confidence: 1.0,
          processingTime: 0,
          cost: 0,
          agentName: 'forced-vendor'
        };
      } else if (this.config.enableVendorDetection) {
        vendorDetectionResult = await this.vendorDetectionAgent.process(context);
      } else {
        vendorDetectionResult = {
          success: true,
          data: {
            vendorType: VENDOR_TYPES.GENERIC,
            confidence: 0.5,
            indicators: ['Vendor detection disabled'],
            fallbackToGeneric: true
          },
          confidence: 0.5,
          processingTime: 0,
          cost: 0,
          agentName: 'disabled-detection'
        };
      }

      if (!vendorDetectionResult.success) {
        console.warn('Vendor detection failed, falling back to generic parsing');
        vendorDetectionResult.data = {
          vendorType: VENDOR_TYPES.GENERIC,
          confidence: 0.3,
          indicators: ['Detection failed'],
          fallbackToGeneric: true
        };
      }

      // Step 3: Vendor-Specific Parsing
      console.log(`🔄 Stage 3: Vendor-specific parsing (${vendorDetectionResult.data!.vendorType})...`);
      const parsingAgent = this.selectParsingAgent(
        vendorDetectionResult.data!.vendorType,
        context
      );
      
      const parsingResult = await parsingAgent.process({
        context,
        vendorDetection: vendorDetectionResult.data!
      });

      // Step 4: Quality Assessment & Fallback Logic
      const needsFallback = this.shouldTriggerFallback(parsingResult, vendorDetectionResult.data!);
      let finalParsingResult = parsingResult;
      
      if (needsFallback && this.config.enableFallbacks) {
        console.log('🔄 Stage 4: Fallback parsing...');
        finalParsingResult = await this.fallbackAgent.process({
          context,
          vendorDetection: {
            ...vendorDetectionResult.data!,
            vendorType: VENDOR_TYPES.GENERIC,
            fallbackToGeneric: true
          }
        });
      }

      // Compile results
      const totalProcessingTime = Date.now() - startTime;
      const totalCost = (vendorDetectionResult.cost || 0) + (finalParsingResult.cost || 0);
      
      // Check cost budget
      const maxCost = options.maxCost || this.config.costBudget;
      if (totalCost > maxCost) {
        console.warn(`Cost ${totalCost} exceeds budget ${maxCost}`);
      }

      const result: AgenticOCRResult = {
        success: finalParsingResult.success,
        data: finalParsingResult.success ? finalParsingResult.data!.extractedData : undefined,
        error: finalParsingResult.success ? undefined : finalParsingResult.error,
        
        pipeline: {
          stage1_vendor_detection: vendorDetectionResult,
          stage2_parsing: finalParsingResult,
          totalProcessingTime,
          totalCost
        },
        
        quality: {
          overallConfidence: finalParsingResult.success ? finalParsingResult.confidence : 0,
          vendorDetectionConfidence: vendorDetectionResult.confidence,
          parsingQuality: finalParsingResult.success ? 
            finalParsingResult.data!.parseQuality.overallScore : 0,
          improvementOverBaseline: basicOCRResult ? 
            this.calculateImprovement(finalParsingResult, basicOCRResult) : undefined
        },
        
        metadata: {
          vendorType: vendorDetectionResult.data!.vendorType,
          agentsUsed: [
            vendorDetectionResult.agentName,
            finalParsingResult.agentName
          ],
          fallbacksTriggered: needsFallback ? ['generic_parser_fallback'] : [],
          costBreakdown: {
            vendor_detection: vendorDetectionResult.cost || 0,
            parsing: finalParsingResult.cost || 0,
            baseline_ocr: basicOCRResult?.cost || 0
          }
        }
      };

      console.log(`✅ Agentic OCR completed: ${totalProcessingTime}ms, $${totalCost.toFixed(4)}`);
      return result;

    } catch (error) {
      console.error('Agentic OCR orchestration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Orchestration failed',
        pipeline: {
          stage1_vendor_detection: {
            success: false,
            error: 'Pipeline failed',
            confidence: 0,
            processingTime: 0,
            agentName: 'failed'
          },
          stage2_parsing: {
            success: false,
            error: 'Pipeline failed',
            confidence: 0,
            processingTime: 0,
            agentName: 'failed'
          },
          totalProcessingTime: Date.now() - startTime,
          totalCost: 0
        },
        quality: {
          overallConfidence: 0,
          vendorDetectionConfidence: 0,
          parsingQuality: 0
        },
        metadata: {
          vendorType: VENDOR_TYPES.UNKNOWN,
          agentsUsed: [],
          fallbacksTriggered: [],
          costBreakdown: {}
        }
      };
    }
  }

  private initializeAgents(): void {
    // Initialize vendor detection agent
    this.vendorDetectionAgent = createVendorDetectionAgent({
      name: 'main-vendor-detector',
      priority: 1,
      timeout: 5000,
      retries: 1,
      costThreshold: 0.001,
      confidenceThreshold: 0.6
    });

    // Initialize specialized parsing agents
    this.parsingAgents = new Map();
    
    // Walmart parser
    const walmartParser = createWalmartParser(
      process.env.OCR_PRIMARY_PROVIDER as 'mistral' | 'openai' || 'mistral'
    );
    this.parsingAgents.set([VENDOR_TYPES.WALMART], walmartParser);
    
    // Home Depot parser  
    const homeDepotParser = createHomeDepotParser(
      process.env.OCR_PRIMARY_PROVIDER as 'mistral' | 'openai' || 'mistral'
    );
    this.parsingAgents.set([VENDOR_TYPES.HOME_DEPOT], homeDepotParser);

    // Generic fallback parser
    this.fallbackAgent = createGenericParser(
      process.env.OCR_PRIMARY_PROVIDER as 'mistral' | 'openai' || 'mistral'
    );
  }

  private selectParsingAgent(
    vendorType: VendorType, 
    context: OCRContext
  ): VendorSpecificParsingAgent {
    // Find specialized agent for this vendor
    for (const [vendorTypes, agent] of this.parsingAgents) {
      if (vendorTypes.includes(vendorType) && agent.canHandle({ vendorDetection: { 
        vendorType, 
        confidence: 0.7, 
        indicators: [], 
        fallbackToGeneric: false 
      }})) {
        return agent;
      }
    }

    // Fall back to generic parser
    return this.fallbackAgent;
  }

  private shouldTriggerFallback(
    parsingResult: AgentResult<VendorParsingResult>,
    vendorDetection: VendorDetectionResult
  ): boolean {
    if (!parsingResult.success) return true;
    
    const quality = parsingResult.data!.parseQuality;
    
    // Trigger fallback if quality is below threshold
    if (quality.overallScore < this.config.qualityThreshold * 100) return true;
    
    // Trigger fallback if math is inconsistent
    if (quality.mathConsistency < 50) return true;
    
    // Trigger fallback if vendor detection was uncertain
    if (vendorDetection.confidence < 0.4) return true;
    
    return false;
  }

  private calculateImprovement(
    agenticResult: AgentResult<VendorParsingResult>,
    baselineResult: OCRResult
  ): number {
    if (!agenticResult.success || !baselineResult.success) return 0;
    
    const agenticConfidence = agenticResult.data!.parseQuality.overallScore;
    const baselineConfidence = baselineResult.confidence * 100;
    
    return agenticConfidence - baselineConfidence;
  }

  private extractTextFromImage(imageData: string): string {
    // Fallback method to extract text if baseline OCR is skipped
    // In practice, this would use a lightweight OCR or cached result
    return 'TEXT_EXTRACTION_PLACEHOLDER';
  }

  // Public methods for monitoring and configuration
  
  async getAgentStatus(): Promise<Record<string, any>> {
    return {
      vendorDetection: {
        name: this.vendorDetectionAgent.name,
        type: this.vendorDetectionAgent.type,
        available: this.vendorDetectionAgent.canHandle({ rawText: 'test' }),
        cost: this.vendorDetectionAgent.getCost(),
        accuracy: this.vendorDetectionAgent.getAccuracy()
      },
      parsingAgents: Array.from(this.parsingAgents.entries()).map(([vendorTypes, agent]) => ({
        vendorTypes,
        name: agent.name,
        type: agent.type,
        cost: agent.getCost(),
        accuracy: agent.getAccuracy()
      })),
      fallbackAgent: {
        name: this.fallbackAgent.name,
        cost: this.fallbackAgent.getCost(),
        accuracy: this.fallbackAgent.getAccuracy()
      },
      config: this.config
    };
  }

  updateConfig(newConfig: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Agentic OCR config updated:', this.config);
  }

  // Cost and performance monitoring
  async estimateCost(imageData: string): Promise<{
    vendorDetection: number;
    parsing: { min: number; max: number; typical: number };
    total: { min: number; max: number; typical: number };
  }> {
    const detectionCost = this.vendorDetectionAgent.getCost();
    
    const parsingCosts = Array.from(this.parsingAgents.values())
      .map(agent => agent.getCost());
    
    const minParsingCost = Math.min(...parsingCosts, this.fallbackAgent.getCost());
    const maxParsingCost = Math.max(...parsingCosts);
    const typicalParsingCost = parsingCosts[0] || this.fallbackAgent.getCost();

    return {
      vendorDetection: detectionCost,
      parsing: {
        min: minParsingCost,
        max: maxParsingCost, 
        typical: typicalParsingCost
      },
      total: {
        min: detectionCost + minParsingCost,
        max: detectionCost + maxParsingCost,
        typical: detectionCost + typicalParsingCost
      }
    };
  }
}

// Singleton instance for application use
let orchestratorInstance: AgenticOCROrchestrator | null = null;

export function getAgenticOrchestrator(config?: Partial<PipelineConfig>): AgenticOCROrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgenticOCROrchestrator(config);
  }
  return orchestratorInstance;
}

// Factory function for different deployment modes
export function createAgenticOrchestrator(mode: 'production' | 'development' | 'testing'): AgenticOCROrchestrator {
  const configs = {
    production: {
      mode: 'production' as const,
      enableVendorDetection: true,
      enableSpecializedParsing: true,
      enableFallbacks: true,
      qualityThreshold: 0.75,
      costBudget: 0.03
    },
    development: {
      mode: 'development' as const,
      enableVendorDetection: true,
      enableSpecializedParsing: true,
      enableFallbacks: true,
      qualityThreshold: 0.6,
      costBudget: 0.05
    },
    testing: {
      mode: 'testing' as const,
      enableVendorDetection: true,
      enableSpecializedParsing: false, // Use generic parsing only
      enableFallbacks: true,
      qualityThreshold: 0.5,
      costBudget: 0.01
    }
  };
  
  return new AgenticOCROrchestrator(configs[mode]);
}