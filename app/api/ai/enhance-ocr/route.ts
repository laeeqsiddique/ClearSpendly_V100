import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const runtime = 'nodejs';

interface OCRData {
  vendor: string;
  date: string;
  total: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is available (server-side only)
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI enhancement not available - API key not configured' },
        { status: 503 }
      );
    }

    const { ocrData, imageText } = await request.json();

    if (!ocrData || !imageText) {
      return NextResponse.json(
        { error: 'Missing required data: ocrData and imageText' },
        { status: 400 }
      );
    }

    console.log('🤖 Processing AI enhancement request...');

    const prompt = `You are an expert at parsing receipt data. I have OCR text from a receipt and need you to extract or improve the structured data.

OCR Raw Text:
${imageText}

Current OCR Extracted Data:
${JSON.stringify(ocrData, null, 2)}

Please analyze the raw OCR text and provide improved/corrected structured data in JSON format:
{
  "vendor": "Store name (corrected if needed)",
  "date": "YYYY-MM-DD format",
  "total": number (the final total amount),
  "items": [
    {
      "name": "Item name (cleaned up)",
      "price": number (individual item price),
      "quantity": number (default 1 if not specified)
    }
  ],
  "confidence": number (0-100, your confidence in this extraction)
}

Rules:
- Fix any OCR errors you can identify
- Ensure the total matches the sum of item prices × quantities
- Clean up item names (remove extra spaces, fix obvious OCR mistakes)
- Use proper date format
- Be conservative with confidence score
- If you can't determine something clearly, use the original OCR data`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      maxTokens: 1000,
      temperature: 0.1,
    });

    // Parse the AI response
    let enhancedData;
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enhancedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return original data if parsing fails
      return NextResponse.json({
        enhanced: false,
        data: ocrData,
        error: 'Failed to parse AI response'
      });
    }

    // Validate the enhanced data
    if (!enhancedData.vendor || !enhancedData.total || !enhancedData.items) {
      console.warn('AI response missing required fields, using original data');
      return NextResponse.json({
        enhanced: false,
        data: ocrData,
        error: 'AI response incomplete'
      });
    }

    console.log('✅ AI enhancement successful');

    return NextResponse.json({
      enhanced: true,
      data: enhancedData,
      originalConfidence: ocrData.confidence,
      aiConfidence: enhancedData.confidence || 85
    });

  } catch (error) {
    console.error('AI enhancement error:', error);
    
    return NextResponse.json(
      { 
        enhanced: false,
        error: 'AI enhancement failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}