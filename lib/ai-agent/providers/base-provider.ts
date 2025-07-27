// Base LLM Provider Interface
import { LLMProvider, CompletionOptions, ModelInfo } from '../types';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  
  abstract generateCompletion(prompt: string, options: CompletionOptions): Promise<string>;
  abstract validateConnection(): Promise<boolean>;
  abstract getModelInfo(): ModelInfo;

  protected async handleRequest<T>(
    requestFn: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    return Promise.race([
      requestFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  }

  protected validateResponse(response: string): boolean {
    try {
      if (response.trim().startsWith('{')) {
        JSON.parse(response);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  protected cleanJsonResponse(response: string): string {
    // Remove common formatting issues
    let cleaned = response.trim();
    
    // Remove code block markers
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Remove leading/trailing text
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    return cleaned;
  }
}