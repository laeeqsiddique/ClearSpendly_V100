// Server-Safe AI Receipt Parser (No Browser Dependencies)
import { AIReceiptParser } from './receipt-parser';
import { getAIConfig, isAIEnabled } from './config';
import { ParsedReceiptData, AIProcessingResult } from './types';

export class ServerAIParser {
  private aiParser: AIReceiptParser | null = null;

  constructor() {
    if (isAIEnabled()) {
      try {
        const config = getAIConfig();
        this.aiParser = new AIReceiptParser(config);
        console.log('🤖 Server AI Parser initialized with', config.modelName);
      } catch (error) {
        console.warn('⚠️ Failed to initialize server AI parser:', error);
      }
    }
  }

  async parseRawText(rawOCRText: string): Promise<AIProcessingResult> {
    if (!this.aiParser) {
      return {
        success: false,
        error: 'AI parser not available',
        fallbackUsed: true,
        processingTime: 0
      };
    }

    return await this.aiParser.parseReceiptText(rawOCRText);
  }

  async getStatus() {
    if (!this.aiParser) {
      return { 
        enabled: false, 
        status: 'disabled',
        reason: 'AI enhancement not enabled or initialization failed'
      };
    }

    try {
      const status = await this.aiParser.getProviderStatus();
      return {
        enabled: true,
        status: status.status,
        modelLoaded: status.modelLoaded,
        responseTime: status.responseTime,
        model: getAIConfig().modelName
      };
    } catch (error) {
      return {
        enabled: true,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  isEnabled(): boolean {
    return this.aiParser !== null;
  }
}

// Create a singleton instance for server use
let serverAIParserInstance: ServerAIParser | null = null;

export function getServerAIParser(): ServerAIParser {
  if (!serverAIParserInstance) {
    serverAIParserInstance = new ServerAIParser();
  }
  return serverAIParserInstance;
}