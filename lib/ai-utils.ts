// AI Utilities for ClearSpendly
// Supports both OpenAI (fallback) and Ollama/Mistral (production)

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

export interface ChatCompletionParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Ollama Integration (Production AI)
export class OllamaClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateEmbedding(text: string, model: string = 'mistral'): Promise<EmbeddingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        embedding: data.embedding,
        dimensions: data.embedding.length
      };
    } catch (error) {
      console.error('Ollama embedding error:', error);
      throw error;
    }
  }

  async generateCompletion(params: ChatCompletionParams): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: params.model || 'mistral',
          messages: params.messages,
          stream: false,
          options: {
            num_predict: params.maxTokens || 500,
            temperature: params.temperature || 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama completion failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error) {
      console.error('Ollama completion error:', error);
      throw error;
    }
  }
}

// OpenAI Integration (Fallback)
export class OpenAIClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async generateEmbedding(text: string, model: string = 'text-embedding-3-small'): Promise<EmbeddingResult> {
    try {
      const { embed } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');

      const { embedding } = await embed({
        model: openai.embedding(model),
        value: text
      });

      return {
        embedding,
        dimensions: embedding.length
      };
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  async generateCompletion(params: ChatCompletionParams): Promise<string> {
    try {
      const { generateText } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');

      const systemMessage = params.messages.find(m => m.role === 'system');
      const userMessages = params.messages.filter(m => m.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];

      const { text } = await generateText({
        model: openai(params.model || 'gpt-3.5-turbo'),
        system: systemMessage?.content,
        prompt: lastUserMessage?.content || '',
        maxTokens: params.maxTokens || 500,
        temperature: params.temperature || 0.7
      });

      return text;
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw error;
    }
  }
}

// Unified AI Client (automatically chooses best available provider)
export class AIClient {
  private ollama: OllamaClient;
  private openai: OpenAIClient;

  constructor() {
    this.ollama = new OllamaClient();
    this.openai = new OpenAIClient();
  }

  async getAvailableProvider(): Promise<'ollama' | 'openai' | null> {
    // Prefer Ollama for production (as per PRD)
    if (await this.ollama.isAvailable()) {
      return 'ollama';
    }
    
    if (await this.openai.isAvailable()) {
      return 'openai';
    }

    return null;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const provider = await this.getAvailableProvider();
    
    switch (provider) {
      case 'ollama':
        return this.ollama.generateEmbedding(text);
      case 'openai':
        return this.openai.generateEmbedding(text);
      default:
        throw new Error('No AI provider available for embeddings');
    }
  }

  async generateCompletion(params: ChatCompletionParams): Promise<string> {
    const provider = await this.getAvailableProvider();
    
    switch (provider) {
      case 'ollama':
        return this.ollama.generateCompletion(params);
      case 'openai':
        return this.openai.generateCompletion(params);
      default:
        throw new Error('No AI provider available for completions');
    }
  }
}

// SQL Generation utilities
export function generateReceiptSearchSQL(
  query: string,
  tenantId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    vendorIds?: string[];
    tagIds?: string[];
  }
): string {
  const baseSQL = `
    SELECT 
      r.id,
      r.receipt_date,
      r.total_amount,
      r.tax_amount,
      v.name as vendor_name,
      v.category as vendor_category,
      COUNT(ri.id) as line_items_count
    FROM receipt r
    LEFT JOIN vendor v ON r.vendor_id = v.id
    LEFT JOIN receipt_item ri ON r.id = ri.receipt_id
    WHERE r.tenant_id = $1
  `;

  const conditions: string[] = [];
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Add search conditions
  if (query && query.trim()) {
    conditions.push(`(
      v.name ILIKE $${paramIndex} OR 
      EXISTS (
        SELECT 1 FROM receipt_item ri2 
        WHERE ri2.receipt_id = r.id 
        AND ri2.description ILIKE $${paramIndex}
      )
    )`);
    params.push(`%${query.trim()}%`);
    paramIndex++;
  }

  // Add filter conditions
  if (filters?.startDate) {
    conditions.push(`r.receipt_date >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters?.endDate) {
    conditions.push(`r.receipt_date <= $${paramIndex}`);
    params.push(filters.endDate);
    paramIndex++;
  }

  if (filters?.minAmount) {
    conditions.push(`r.total_amount >= $${paramIndex}`);
    params.push(filters.minAmount);
    paramIndex++;
  }

  if (filters?.maxAmount) {
    conditions.push(`r.total_amount <= $${paramIndex}`);
    params.push(filters.maxAmount);
    paramIndex++;
  }

  if (filters?.vendorIds?.length) {
    conditions.push(`r.vendor_id = ANY($${paramIndex})`);
    params.push(filters.vendorIds);
    paramIndex++;
  }

  // Build final query
  let finalSQL = baseSQL;
  if (conditions.length > 0) {
    finalSQL += ' AND ' + conditions.join(' AND ');
  }

  finalSQL += `
    GROUP BY r.id, r.receipt_date, r.total_amount, r.tax_amount, v.name, v.category
    ORDER BY r.receipt_date DESC
    LIMIT 50
  `;

  return finalSQL;
}

// Prompt templates for consistent AI responses
export const SYSTEM_PROMPTS = {
  RECEIPT_ASSISTANT: `You are ClearSpendly AI Assistant, an expert in expense management and receipt analysis. 
You have access to receipt data and should provide helpful, accurate responses about expenses, spending patterns, and financial insights.

Your capabilities include:
- Analyzing spending patterns and trends
- Finding specific receipts and expenses
- Providing vendor and category breakdowns
- Helping with tax deduction insights
- Explaining expense data and relationships

Always be concise, helpful, and focus on actionable insights. Use bullet points for lists and include specific numbers when available.`,

  RECEIPT_PARSER: `You are a JSON generator that extracts structured data from receipt text. 
Extract every line-item with maximum accuracy. Output valid JSON only.

Schema:
{
  "vendor": string,
  "receipt_date": "YYYY-MM-DD",
  "currency_code": string,
  "items": [
    {
      "description": string,
      "sku": string|null,
      "quantity": number,
      "unit_price": number,
      "total_price": number,
      "category": string|null
    }
  ],
  "tax_amount": number,
  "total_amount": number,
  "confidence": number
}`
};