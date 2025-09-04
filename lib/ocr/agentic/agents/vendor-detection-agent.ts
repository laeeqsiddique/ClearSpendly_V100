// Vendor Detection Agent - Step 1 of Agentic Pipeline
import { 
  BaseAgent, 
  AgentResult, 
  VendorDetectionResult, 
  VendorType, 
  VENDOR_TYPES, 
  OCRContext,
  VendorPattern,
  AgentConfig 
} from '../types';

interface VendorIndicator {
  vendorType: VendorType;
  confidence: number;
  evidence: string[];
}

export class VendorDetectionAgent implements BaseAgent {
  readonly name = 'vendor-detection-agent';
  readonly type = 'detection' as const;
  readonly config: AgentConfig;

  private vendorPatterns: Map<VendorType, VendorPattern>;
  private fallbackThreshold = 0.3;

  constructor(config: AgentConfig) {
    this.config = {
      timeout: 5000,
      retries: 2,
      costThreshold: 0.001, // Very low cost for rule-based detection
      confidenceThreshold: 0.6,
      ...config
    };
    
    this.vendorPatterns = this.initializeVendorPatterns();
  }

  async process(context: OCRContext): Promise<AgentResult<VendorDetectionResult>> {
    const startTime = Date.now();
    
    try {
      const rawText = context.rawText.toLowerCase();
      const indicators = this.analyzeVendorIndicators(rawText);
      
      // Find best match
      const bestMatch = this.selectBestVendorMatch(indicators);
      
      const result: VendorDetectionResult = {
        vendorType: bestMatch.vendorType,
        confidence: bestMatch.confidence,
        indicators: bestMatch.evidence,
        fallbackToGeneric: bestMatch.confidence < this.config.confidenceThreshold
      };

      return {
        success: true,
        data: result,
        confidence: bestMatch.confidence,
        processingTime: Date.now() - startTime,
        cost: 0, // Rule-based detection has no API cost
        agentName: this.name,
        metadata: {
          candidateVendors: indicators.map(i => ({ type: i.vendorType, confidence: i.confidence })),
          detectionMethod: 'pattern_matching'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vendor detection failed',
        confidence: 0,
        processingTime: Date.now() - startTime,
        cost: 0,
        agentName: this.name
      };
    }
  }

  canHandle(context: OCRContext): boolean {
    return !!(context.rawText && context.rawText.length > 10);
  }

  getCost(): number {
    return 0; // Rule-based detection
  }

  getAccuracy(): number {
    return 0.85; // Based on pattern matching accuracy
  }

  private initializeVendorPatterns(): Map<VendorType, VendorPattern> {
    const patterns = new Map<VendorType, VendorPattern>();

    // Walmart patterns
    patterns.set(VENDOR_TYPES.WALMART, {
      vendorType: VENDOR_TYPES.WALMART,
      patterns: {
        nameMatchers: [
          /walmart\s*supercenter/i,
          /wal-mart/i,
          /walmart\s*store/i,
          /walmart/i
        ],
        logoText: ['Save money. Live better.', 'Great Value', 'Equate'],
        formatIndicators: [
          /\d+\s+AT\s+\d+\s+FOR\s+\$?\d+\.\d{2}/i, // "6 AT 1 FOR 0.78"
          /TC#\s*\d+/i, // Terminal/transaction code
          /ST#\s*\d+/i  // Store number
        ],
        pricePatterns: [
          /\$?\d+\.\d{2}\s*[A-Z]?$/,
          /\d+\s*@\s*\$?\d+\.\d{2}/
        ],
        itemPatterns: [
          /^\s*[A-Z0-9\s]+\s+\$?\d+\.\d{2}/,
          /\d{12,14}\s+.+\s+\$?\d+\.\d{2}/
        ],
        taxPatterns: [
          /tax\s*\$?\d+\.\d{2}/i,
          /total\s*tax\s*\$?\d+\.\d{2}/i
        ]
      },
      parsingRules: {
        itemSeparator: /\n\s*(?=\S)/,
        quantityFormat: 'separate_line',
        priceLocation: 'end_of_line',
        taxCalculation: 'separate_line',
        specialHandling: ['multi_line_items', 'bulk_pricing', 'tax_codes']
      }
    });

    // Home Depot patterns
    patterns.set(VENDOR_TYPES.HOME_DEPOT, {
      vendorType: VENDOR_TYPES.HOME_DEPOT,
      patterns: {
        nameMatchers: [
          /the\s*home\s*depot/i,
          /home\s*depot/i,
          /homedepot\.com/i
        ],
        logoText: ['More Saving. More Doing.', 'You Can Do It. We Can Help.'],
        formatIndicators: [
          /SKU\s*#?\s*\d+/i,
          /STORE\s*#\s*\d+/i,
          /INTERNET\s*#\s*\d+/i
        ],
        pricePatterns: [
          /\$\d+\.\d{2}\s*EA/i, // Each
          /\$\d+\.\d{2}\s*\/\s*[A-Z]+/i // Per unit
        ],
        itemPatterns: [
          /^\s*\d+\s+.+\$\d+\.\d{2}/,
          /SKU\s*#?\s*\d+\s*.+/i
        ],
        taxPatterns: [
          /SALES\s*TAX\s*\$?\d+\.\d{2}/i,
          /TAX\s*\$?\d+\.\d{2}/i
        ]
      },
      parsingRules: {
        itemSeparator: /\n\s*(?=\d+\s+)/,
        quantityFormat: 'prefix',
        priceLocation: 'end_of_line',
        taxCalculation: 'separate_line',
        specialHandling: ['sku_tracking', 'department_codes', 'contractor_pricing']
      }
    });

    // Target patterns
    patterns.set(VENDOR_TYPES.TARGET, {
      vendorType: VENDOR_TYPES.TARGET,
      patterns: {
        nameMatchers: [
          /target\s*store/i,
          /target/i,
          /target\.com/i
        ],
        logoText: ['Expect More. Pay Less.', 'up&up', 'Good & Gather'],
        formatIndicators: [
          /REF#\s*\d+/i,
          /DPCI\s*\d+-\d+-\d+/i // Department-Class-Item code
        ],
        pricePatterns: [
          /\$\d+\.\d{2}\s*T/i, // Taxable indicator
          /\$\d+\.\d{2}\s*F/i  // Food stamp eligible
        ],
        itemPatterns: [
          /^\s*.+\s+\$\d+\.\d{2}\s*[TF]?$/,
          /DPCI\s*\d+-\d+-\d+\s*.+/i
        ],
        taxPatterns: [
          /SALES\s*TAX\s*\$?\d+\.\d{2}/i
        ]
      },
      parsingRules: {
        itemSeparator: /\n\s*(?=\S)/,
        quantityFormat: 'separate_line',
        priceLocation: 'end_of_line',
        taxCalculation: 'embedded',
        specialHandling: ['dpci_codes', 'circle_rewards', 'food_stamp_tracking']
      }
    });

    // Generic grocery store
    patterns.set(VENDOR_TYPES.GROCERY_GENERIC, {
      vendorType: VENDOR_TYPES.GROCERY_GENERIC,
      patterns: {
        nameMatchers: [
          /grocery/i,
          /market/i,
          /food/i,
          /supermarket/i,
          /deli/i
        ],
        logoText: [],
        formatIndicators: [
          /\d+\s*@\s*\$?\d+\.\d{2}/i, // Quantity @ price
          /LB\s*@\s*\$?\d+\.\d{2}/i   // Price per pound
        ],
        pricePatterns: [
          /\$?\d+\.\d{2}$/,
          /\d+\.\d{2}\s*[A-Z]?$/
        ],
        itemPatterns: [
          /^\s*.+\s+\$?\d+\.\d{2}$/
        ],
        taxPatterns: [
          /tax\s*\$?\d+\.\d{2}/i
        ]
      },
      parsingRules: {
        itemSeparator: /\n/,
        quantityFormat: 'prefix',
        priceLocation: 'end_of_line',
        taxCalculation: 'separate_line',
        specialHandling: ['weight_based_pricing', 'produce_codes']
      }
    });

    return patterns;
  }

  private analyzeVendorIndicators(rawText: string): VendorIndicator[] {
    const indicators: VendorIndicator[] = [];

    for (const [vendorType, pattern] of this.vendorPatterns.entries()) {
      const confidence = this.calculateVendorConfidence(rawText, pattern);
      
      if (confidence > 0.1) { // Minimum threshold for consideration
        indicators.push({
          vendorType,
          confidence,
          evidence: this.getMatchingEvidence(rawText, pattern)
        });
      }
    }

    return indicators.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateVendorConfidence(rawText: string, pattern: VendorPattern): number {
    let confidence = 0;
    let maxPossibleScore = 0;

    // Name matching (40% weight)
    maxPossibleScore += 40;
    for (const namePattern of pattern.patterns.nameMatchers) {
      if (namePattern.test(rawText)) {
        confidence += 40;
        break;
      }
    }

    // Logo text matching (20% weight)
    maxPossibleScore += 20;
    for (const logoText of pattern.patterns.logoText) {
      if (rawText.includes(logoText.toLowerCase())) {
        confidence += 20;
        break;
      }
    }

    // Format indicators (20% weight)
    maxPossibleScore += 20;
    let formatMatches = 0;
    for (const formatPattern of pattern.patterns.formatIndicators) {
      if (formatPattern.test(rawText)) {
        formatMatches++;
      }
    }
    if (formatMatches > 0) {
      confidence += Math.min(20, formatMatches * 10);
    }

    // Price patterns (10% weight)
    maxPossibleScore += 10;
    for (const pricePattern of pattern.patterns.pricePatterns) {
      if (pricePattern.test(rawText)) {
        confidence += 10;
        break;
      }
    }

    // Item patterns (10% weight)
    maxPossibleScore += 10;
    for (const itemPattern of pattern.patterns.itemPatterns) {
      if (itemPattern.test(rawText)) {
        confidence += 10;
        break;
      }
    }

    return confidence / 100; // Normalize to 0-1
  }

  private getMatchingEvidence(rawText: string, pattern: VendorPattern): string[] {
    const evidence: string[] = [];

    // Check name matches
    for (const namePattern of pattern.patterns.nameMatchers) {
      const match = rawText.match(namePattern);
      if (match) {
        evidence.push(`Name match: ${match[0]}`);
        break;
      }
    }

    // Check format indicators
    for (const formatPattern of pattern.patterns.formatIndicators) {
      const match = rawText.match(formatPattern);
      if (match) {
        evidence.push(`Format indicator: ${match[0]}`);
      }
    }

    // Check logo text
    for (const logoText of pattern.patterns.logoText) {
      if (rawText.includes(logoText.toLowerCase())) {
        evidence.push(`Brand text: ${logoText}`);
      }
    }

    return evidence;
  }

  private selectBestVendorMatch(indicators: VendorIndicator[]): VendorIndicator {
    if (indicators.length === 0) {
      return {
        vendorType: VENDOR_TYPES.UNKNOWN,
        confidence: 0,
        evidence: ['No vendor patterns matched']
      };
    }

    const bestMatch = indicators[0];
    
    // Use generic fallback if confidence is too low
    if (bestMatch.confidence < this.fallbackThreshold) {
      return {
        vendorType: VENDOR_TYPES.GENERIC,
        confidence: 0.2, // Low but positive confidence for generic parsing
        evidence: ['Fallback to generic parsing', ...bestMatch.evidence]
      };
    }

    return bestMatch;
  }
}

// Export factory function for easy instantiation
export function createVendorDetectionAgent(config?: Partial<AgentConfig>): VendorDetectionAgent {
  return new VendorDetectionAgent({
    name: 'vendor-detection-agent',
    priority: 1,
    timeout: 5000,
    retries: 2,
    costThreshold: 0.001,
    confidenceThreshold: 0.6,
    ...config
  });
}