// Agentic OCR Architecture Types
export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  confidence: number;
  processingTime: number;
  cost?: number;
  agentName: string;
  metadata?: Record<string, any>;
}

export interface VendorDetectionResult {
  vendorType: VendorType;
  confidence: number;
  indicators: string[];
  fallbackToGeneric: boolean;
}

export interface VendorParsingResult {
  extractedData: ExtractedReceiptData;
  parseQuality: ParseQuality;
  vendorSpecificFields: Record<string, any>;
  warnings: string[];
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
  sku?: string;
  vendorSpecificData?: Record<string, any>;
}

export interface ParseQuality {
  overallScore: number;
  lineItemAccuracy: number;
  mathConsistency: number;
  vendorFormatMatch: number;
  missingFields: string[];
  suspiciousPatterns: string[];
}

export interface AgentConfig {
  name: string;
  priority: number;
  timeout: number;
  retries: number;
  costThreshold: number;
  confidenceThreshold: number;
}

export interface VendorAgentConfig extends AgentConfig {
  vendorTypes: VendorType[];
  specialized: boolean;
  fallbackMode: 'generic' | 'prompt_enhanced' | 'fine_tuned';
}

// Vendor Types - Extensible enum pattern
export const VENDOR_TYPES = {
  WALMART: 'walmart',
  HOME_DEPOT: 'home_depot', 
  TARGET: 'target',
  AMAZON: 'amazon',
  COSTCO: 'costco',
  GROCERY_GENERIC: 'grocery_generic',
  RESTAURANT: 'restaurant',
  GAS_STATION: 'gas_station',
  PHARMACY: 'pharmacy',
  OFFICE_SUPPLIES: 'office_supplies',
  HARDWARE_STORE: 'hardware_store',
  UNKNOWN: 'unknown',
  GENERIC: 'generic'
} as const;

export type VendorType = typeof VENDOR_TYPES[keyof typeof VENDOR_TYPES];

// Vendor-specific patterns and rules
export interface VendorPattern {
  vendorType: VendorType;
  patterns: {
    nameMatchers: RegExp[];
    logoText: string[];
    formatIndicators: RegExp[];
    pricePatterns: RegExp[];
    itemPatterns: RegExp[];
    taxPatterns: RegExp[];
  };
  parsingRules: {
    itemSeparator: RegExp;
    quantityFormat: 'prefix' | 'suffix' | 'separate_line';
    priceLocation: 'end_of_line' | 'tabular' | 'aligned_right';
    taxCalculation: 'separate_line' | 'embedded' | 'percentage';
    specialHandling: string[];
  };
}

// Agent orchestration types
export interface AgentPipeline {
  id: string;
  stages: AgentStage[];
  fallbackChain: string[];
  config: PipelineConfig;
}

export interface AgentStage {
  name: string;
  agents: BaseAgent[];
  parallel: boolean;
  required: boolean;
  timeout: number;
}

export interface PipelineConfig {
  enableVendorDetection: boolean;
  enableSpecializedParsing: boolean;
  enableFallbacks: boolean;
  qualityThreshold: number;
  costBudget: number;
  mode: 'production' | 'development' | 'testing';
}

// Base agent interface
export interface BaseAgent {
  readonly name: string;
  readonly type: 'detection' | 'parsing' | 'validation' | 'enhancement';
  readonly config: AgentConfig;
  
  process(input: any): Promise<AgentResult>;
  canHandle(input: any): boolean;
  getCost(): number;
  getAccuracy(): number;
}

// OCR Context - bridges current system with agentic layer
export interface OCRContext {
  rawText: string;
  imageData?: string;
  imageUrl?: string;
  fileType?: string;
  originalOCRResult: any; // From current system
  processingHints?: string[];
}

// Agent selection strategy
export interface AgentSelectionStrategy {
  selectDetectionAgent(context: OCRContext): BaseAgent[];
  selectParsingAgent(vendorType: VendorType, context: OCRContext): BaseAgent[];
  selectFallbackChain(failedAgents: string[], context: OCRContext): BaseAgent[];
}

// Configuration for different approaches
export interface AgenticApproach {
  name: 'dynamic_prompts' | 'fine_tuned_models' | 'hybrid';
  description: string;
  requirements: string[];
  implementation: {
    detectionMethod: 'rule_based' | 'ml_classifier' | 'llm_based';
    parsingMethod: 'dynamic_prompt' | 'fine_tuned' | 'template_matching';
    fallbackStrategy: 'generic' | 'multi_agent' | 'human_in_loop';
  };
  costs: {
    development: 'low' | 'medium' | 'high';
    operational: 'low' | 'medium' | 'high';
    maintenance: 'low' | 'medium' | 'high';
  };
  expectedAccuracy: number;
  timeToImplement: string;
}