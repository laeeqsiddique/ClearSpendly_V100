import { NextRequest, NextResponse } from "next/server";
import { getServerAIParser } from "@/lib/ai-agent/server-ai-parser";

export async function POST(req: NextRequest) {
  try {
    const { rawText, testMode } = await req.json();

    // Get server AI parser
    const serverParser = getServerAIParser();
    const aiStatus = await serverParser.getStatus();
    
    console.log('🧪 Testing Server AI Parser...');
    console.log('🤖 AI Status:', aiStatus);

    if (testMode === 'status') {
      return NextResponse.json({
        success: true,
        aiStatus,
        message: `AI ${aiStatus.enabled ? 'enabled' : 'disabled'}`
      });
    }

    if (!rawText) {
      // Use sample text for testing
      const sampleText = `
        WALMART SUPERCENTER
        Store #1234
        12/25/2023  3:45 PM
        
        MILK GAL 2%        $3.99 T
        BREAD WW LOAF      $2.50
        BANANAS            $1.29
        
        SUBTOTAL           $7.78
        TAX                $0.62
        TOTAL              $8.40
        
        VISA ENDING 1234   $8.40
      `;
      
      // Test AI parsing with sample text
      const startTime = Date.now();
      const result = await serverParser.parseRawText(sampleText);
      const processingTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: result.success,
        data: result.data,
        processingTime,
        aiStatus,
        sampleUsed: true,
        error: result.error
      });
    }

    // Process provided text
    const startTime = Date.now();
    const result = await serverParser.parseRawText(rawText);
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: result.success,
      data: result.data,
      processingTime,
      aiStatus,
      error: result.error
    });

  } catch (error) {
    console.error('❌ Test AI OCR failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Quick health check endpoint
    const serverParser = getServerAIParser();
    const aiStatus = await serverParser.getStatus();
    
    return NextResponse.json({
      status: 'ok',
      aiEnabled: serverParser.isEnabled(),
      aiStatus,
      timestamp: new Date().toISOString(),
      environment: {
        ENABLE_AI_OCR_ENHANCEMENT: process.env.ENABLE_AI_OCR_ENHANCEMENT,
        LLM_PROVIDER: process.env.LLM_PROVIDER,
        LLM_MODEL: process.env.LLM_MODEL,
        LLM_API_URL: process.env.LLM_API_URL
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}