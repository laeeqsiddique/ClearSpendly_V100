// AI Agent Entry Point
export { EnhancedOCRProcessor } from './enhanced-ocr-processor';
export { AIReceiptParser } from './receipt-parser';
export { OllamaProvider } from './providers/ollama-provider';
export { getAIConfig, isAIEnabled, RECEIPT_PARSER_PROMPT } from './config';
export type { 
  AIAgentConfig, 
  ParsedReceiptData, 
  AIProcessingResult,
  LLMProvider,
  ValidationResult,
  ReceiptType
} from './types';