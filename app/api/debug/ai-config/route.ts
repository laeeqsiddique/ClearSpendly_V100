import { NextResponse } from 'next/server';

export async function GET() {
  // Debug AI configuration
  const config = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
    },
    openai: {
      // Check all possible OpenAI key sources
      hasNextPublicKey: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      hasServerKey: !!process.env.OPENAI_API_KEY,
      nextPublicKeyPrefix: process.env.NEXT_PUBLIC_OPENAI_API_KEY?.substring(0, 8) || 'not set',
      serverKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 8) || 'not set',
    },
    aiFlags: {
      NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT: process.env.NEXT_PUBLIC_ENABLE_AI_ENHANCEMENT || 'not set',
      ENABLE_AI_ENHANCEMENT: process.env.ENABLE_AI_ENHANCEMENT || 'not set',
      NEXT_PUBLIC_AI_MODEL: process.env.NEXT_PUBLIC_AI_MODEL || 'not set',
      AI_MODEL: process.env.AI_MODEL || 'not set',
      NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD: process.env.NEXT_PUBLIC_AI_CONFIDENCE_THRESHOLD || 'not set',
    },
    allNextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .map(key => ({
        key,
        hasValue: !!process.env[key],
        valuePrefix: process.env[key]?.substring(0, 10) || 'empty'
      })),
    timestamp: new Date().toISOString(),
  };
  
  // Test AI processor instantiation
  try {
    // Import and test the enhanced processor
    const { SimplifiedOCRProcessor } = await import('@/lib/ai-ocr/enhanced-processor');
    const processor = new SimplifiedOCRProcessor();
    config.processorTest = 'Successfully created processor instance';
  } catch (error) {
    config.processorTest = `Failed to create processor: ${error.message}`;
  }
  
  return NextResponse.json(config);
}