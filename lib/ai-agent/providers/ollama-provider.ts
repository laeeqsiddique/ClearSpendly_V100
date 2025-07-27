// Ollama LLM Provider Implementation
import { BaseLLMProvider } from './base-provider';
import { CompletionOptions, ModelInfo } from '../types';

export class OllamaProvider extends BaseLLMProvider {
  name = 'ollama';
  
  constructor(
    private apiUrl: string,
    private modelName: string,
    private timeoutMs: number = 120000
  ) {
    super();
  }

  async generateCompletion(prompt: string, options: CompletionOptions): Promise<string> {
    const response = await this.handleRequest(async () => {
      const res = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          format: options.format || 'json',
          stream: false
        })
      });

      if (!res.ok) {
        throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      return data.response;
    }, this.timeoutMs);

    return this.cleanJsonResponse(response);
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.models?.some((model: any) => model.name === this.modelName);
    } catch {
      return false;
    }
  }

  getModelInfo(): ModelInfo {
    return {
      name: this.modelName,
      size: this.getModelSize(),
      parameters: this.getParameterCount(),
      quantization: 'q4_0'
    };
  }

  private getModelSize(): string {
    if (this.modelName.includes('3b')) return '~2GB';
    if (this.modelName.includes('7b')) return '~4GB';
    if (this.modelName.includes('13b')) return '~7GB';
    return 'Unknown';
  }

  private getParameterCount(): string {
    if (this.modelName.includes('3b')) return '3.2B';
    if (this.modelName.includes('7b')) return '7B';
    if (this.modelName.includes('13b')) return '13B';
    return 'Unknown';
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    modelLoaded: boolean;
    responseTime: number;
  }> {
    const start = Date.now();
    
    try {
      const isConnected = await this.validateConnection();
      const responseTime = Date.now() - start;
      
      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        modelLoaded: isConnected,
        responseTime
      };
    } catch {
      return {
        status: 'unhealthy',
        modelLoaded: false,
        responseTime: Date.now() - start
      };
    }
  }
}