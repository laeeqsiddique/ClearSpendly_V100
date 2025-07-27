import { NextResponse } from "next/server";

export async function GET() {
  const envVars = {
    ENABLE_AI_OCR_ENHANCEMENT: process.env.ENABLE_AI_OCR_ENHANCEMENT,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    LLM_MODEL: process.env.LLM_MODEL,
    LLM_API_URL: process.env.LLM_API_URL,
    LLM_TEMPERATURE: process.env.LLM_TEMPERATURE,
    LLM_MAX_TOKENS: process.env.LLM_MAX_TOKENS,
    LLM_TIMEOUT_MS: process.env.LLM_TIMEOUT_MS,
    NODE_ENV: process.env.NODE_ENV,
  };

  const aiEnabled = process.env.ENABLE_AI_OCR_ENHANCEMENT === 'true';

  return NextResponse.json({
    aiEnabled,
    envVars,
    recommendations: {
      restartServer: !aiEnabled && envVars.ENABLE_AI_OCR_ENHANCEMENT,
      checkEnvFile: !envVars.ENABLE_AI_OCR_ENHANCEMENT,
      ollamaRunning: !!envVars.LLM_API_URL
    }
  });
}