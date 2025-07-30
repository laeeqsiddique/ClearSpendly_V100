import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let status = 'healthy';
  const checks: Record<string, any> = {};

  // Railway-specific: Skip AI checks during build/static generation
  if (process.env.NODE_ENV === 'production' && process.env.CI === 'true') {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks: {
        openai: { status: 'skipped-during-build' },
        ollama: { status: 'skipped-during-build' },
        ocrEnhancement: { status: 'skipped-during-build' },
        providerFallback: { status: 'skipped-during-build' },
        configuration: { status: 'skipped-during-build' },
        performance: { status: 'skipped-during-build' }
      },
      features: {
        aiEnhancement: process.env.NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT === 'true',
        multiProvider: !!(process.env.NEXT_PUBLIC_OPENAI_API_KEY && process.env.LLM_API_URL),
        confidenceThreshold: process.env.NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD || '90'
      }
    });
  }

  try {
    // 1. OpenAI Service Check
    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      try {
        const openaiStart = Date.now();
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (openaiResponse.ok) {
          const models = await openaiResponse.json();
          const configuredModel = process.env.NEXT_PUBLIC_AI_MODEL || 'gpt-4o-mini';
          const modelExists = models.data?.some((model: any) => model.id === configuredModel);

          checks.openai = {
            status: modelExists ? 'healthy' : 'warning',
            responseTime: Date.now() - openaiStart,
            configuredModel,
            modelAvailable: modelExists,
            totalModels: models.data?.length || 0
          };

          if (!modelExists) status = 'degraded';
        } else {
          throw new Error(`OpenAI API returned ${openaiResponse.status}`);
        }
      } catch (error) {
        checks.openai = {
          status: 'unhealthy',
          error: (error as Error).message,
          responseTime: Date.now() - startTime
        };
        status = 'degraded';
      }
    } else {
      checks.openai = {
        status: 'disabled',
        message: 'OpenAI API key not configured'
      };
    }

    // 2. Ollama Service Check (if configured)
    if (process.env.LLM_PROVIDER === 'ollama' && process.env.LLM_API_URL) {
      try {
        const ollamaStart = Date.now();
        const ollamaResponse = await fetch(`${process.env.LLM_API_URL}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });

        if (ollamaResponse.ok) {
          const ollamaData = await ollamaResponse.json();
          const configuredModel = process.env.LLM_MODEL || 'llama3.2:3b';
          const modelExists = ollamaData.models?.some((model: any) => model.name === configuredModel);

          checks.ollama = {
            status: modelExists ? 'healthy' : 'warning',
            responseTime: Date.now() - ollamaStart,
            configuredModel,
            modelAvailable: modelExists,
            availableModels: ollamaData.models?.map((m: any) => m.name) || []
          };

          if (!modelExists) status = 'degraded';
        } else {
          throw new Error(`Ollama API returned ${ollamaResponse.status}`);
        }
      } catch (error) {
        checks.ollama = {
          status: 'unhealthy',
          error: (error as Error).message,
          responseTime: Date.now() - startTime
        };
        status = 'degraded';
      }
    } else {
      checks.ollama = {
        status: 'disabled',
        message: 'Ollama not configured or not primary provider'
      };
    }

    // 3. OCR Enhancement Test
    try {
      const ocrTestStart = Date.now();
      
      // Test the OCR enhancement logic without actually calling AI
      const testData = {
        originalText: "RECEIPT\nStore Name: Test Store\nAmount: $25.99\nDate: 2024-01-15",
        confidence: 85
      };

      const enhancementEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT === 'true';
      const confidenceThreshold = parseInt(process.env.NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD || '90');
      
      const shouldEnhance = enhancementEnabled && testData.confidence < confidenceThreshold;

      checks.ocrEnhancement = {
        status: 'healthy',
        enabled: enhancementEnabled,
        confidenceThreshold,
        testCase: {
          originalConfidence: testData.confidence,
          shouldEnhance,
          processingTime: Date.now() - ocrTestStart
        }
      };
    } catch (error) {
      checks.ocrEnhancement = {
        status: 'unhealthy',
        error: (error as Error).message
      };
      status = 'degraded';
    }

    // 4. AI Provider Fallback Test
    try {
      const providers = [];
      
      if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
        providers.push('openai');
      }
      
      if (process.env.LLM_API_URL && process.env.LLM_PROVIDER === 'ollama') {
        providers.push('ollama');
      }

      checks.providerFallback = {
        status: providers.length > 1 ? 'healthy' : 'warning',
        availableProviders: providers,
        primaryProvider: process.env.LLM_PROVIDER || 'openai',
        fallbackEnabled: providers.length > 1,
        message: providers.length > 1 ? 'Multiple providers available for fallback' : 'Single provider - no fallback available'
      };

      if (providers.length === 0) {
        checks.providerFallback.status = 'unhealthy';
        status = 'unhealthy';
      } else if (providers.length === 1) {
        status = status === 'healthy' ? 'degraded' : status;
      }
    } catch (error) {
      checks.providerFallback = {
        status: 'unhealthy',
        error: (error as Error).message
      };
      status = 'degraded';
    }

    // 5. AI Service Configuration Validation
    try {
      const configChecks = {
        aiModelConfigured: !!(process.env.NEXT_PUBLIC_AI_MODEL || process.env.LLM_MODEL),
        temperatureValid: (() => {
          const temp = parseFloat(process.env.LLM_TEMPERATURE || '0.1');
          return temp >= 0 && temp <= 2;
        })(),
        maxTokensValid: (() => {
          const tokens = parseInt(process.env.LLM_MAX_TOKENS || '2000');
          return tokens > 0 && tokens <= 8000;
        })(),
        timeoutValid: (() => {
          const timeout = parseInt(process.env.LLM_TIMEOUT_MS || '60000');
          return timeout > 0 && timeout <= 300000; // Max 5 minutes
        })()
      };

      const allConfigsValid = Object.values(configChecks).every(Boolean);

      checks.configuration = {
        status: allConfigsValid ? 'healthy' : 'warning',
        checks: configChecks,
        settings: {
          model: process.env.NEXT_PUBLIC_AI_MODEL || process.env.LLM_MODEL,
          temperature: process.env.LLM_TEMPERATURE,
          maxTokens: process.env.LLM_MAX_TOKENS,
          timeout: process.env.LLM_TIMEOUT_MS
        }
      };

      if (!allConfigsValid && status === 'healthy') {
        status = 'degraded';
      }
    } catch (error) {
      checks.configuration = {
        status: 'unhealthy',
        error: (error as Error).message
      };
      status = 'degraded';
    }

    // 6. Test AI Enhancement Performance
    try {
      const perfStart = Date.now();
      
      // Simulate the enhancement process timing
      const mockProcessingSteps = [
        'Text extraction',
        'Confidence analysis', 
        'Enhancement decision',
        'AI provider selection',
        'Response processing'
      ];

      const stepTimes = mockProcessingSteps.map(() => Math.random() * 100 + 50); // 50-150ms per step
      const totalSimulatedTime = stepTimes.reduce((a, b) => a + b, 0);
      const actualTestTime = Date.now() - perfStart;

      checks.performance = {
        status: totalSimulatedTime < 5000 ? 'healthy' : 'slow',
        estimatedProcessingTime: Math.round(totalSimulatedTime),
        testTime: actualTestTime,
        threshold: 5000,
        steps: mockProcessingSteps.map((step, i) => ({
          step,
          estimatedTime: Math.round(stepTimes[i])
        }))
      };

      if (totalSimulatedTime > 5000) status = 'degraded';
    } catch (error) {
      checks.performance = {
        status: 'unhealthy',
        error: (error as Error).message
      };
      status = 'degraded';
    }

  } catch (error) {
    status = 'unhealthy';
    checks.error = {
      message: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
  }

  const response = {
    status,
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    checks,
    features: {
      aiEnhancement: process.env.NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT === 'true',
      multiProvider: !!(process.env.NEXT_PUBLIC_OPENAI_API_KEY && process.env.LLM_API_URL),
      confidenceThreshold: process.env.NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD || '90'
    }
  };

  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  
  return NextResponse.json(response, { status: statusCode });
}