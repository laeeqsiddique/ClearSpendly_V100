import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Ollama processing function for local OCR
async function processWithOllama(imageData: string) {
  const ollamaUrl = process.env.OLLAMA_API_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llava:latest"; // Use vision model
  
  const prompt = `You are a receipt parsing AI. Extract all information from this receipt image and return ONLY a valid JSON object with this exact structure:

{
  "vendor": "string - business name",
  "date": "YYYY-MM-DD - receipt date", 
  "totalAmount": number,
  "subtotal": number,
  "tax": number,
  "currency": "USD",
  "lineItems": [
    {
      "description": "string - item name",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "category": "string - best guess category"
    }
  ],
  "category": "string - overall expense category",
  "confidence": number
}

Categories should be one of: "Office Supplies", "Travel & Transportation", "Meals & Entertainment", "Marketing & Advertising", "Professional Services", "Equipment & Software", "Utilities", "Rent & Facilities", "Insurance", "Training & Education", "Other"

Return ONLY the JSON object, no additional text.`;

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        images: [imageData.replace(/^data:image\/[a-z]+;base64,/, '')], // Remove data URL prefix
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent extraction
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const result = await response.json();
    const extractedText = result.response;
    
    // Parse the JSON response
    const cleanedResponse = extractedText.replace(/```json\s*|\s*```/g, "").trim();
    const extractedData = JSON.parse(cleanedResponse);
    
    // Ensure line items have required fields
    if (extractedData.lineItems) {
      extractedData.lineItems = extractedData.lineItems.map((item: any, index: number) => ({
        id: crypto.randomUUID(),
        description: item.description || `Item ${index + 1}`,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || item.unitPrice || 0,
        category: item.category || "Other",
      }));
    }
    
    return {
      vendor: extractedData.vendor,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      totalAmount: extractedData.totalAmount,
      subtotal: extractedData.subtotal || extractedData.totalAmount,
      tax: extractedData.tax || 0,
      currency: extractedData.currency || "USD",
      lineItems: extractedData.lineItems || [],
      category: extractedData.category || "Other",
      confidence: extractedData.confidence || 75,
      notes: "",
    };
  } catch (error) {
    console.error('Ollama processing error:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageData } = await req.json();

    if (!imageUrl && !imageData) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Check if this is a PDF (which browser OCR can't handle)
    const isPdf = imageUrl?.includes('data:application/pdf') || imageData?.includes('data:application/pdf');
    
    if (isPdf) {
      console.log('📄 PDF detected - browser OCR cannot process PDFs, using AI processing');
    }

    // Check for available AI services (prioritize local/open source)
    const hasOllama = process.env.OLLAMA_API_URL && process.env.OLLAMA_MODEL;
    const hasOpenAI = process.env.OPENAI_API_KEY && 
                     process.env.OPENAI_API_KEY !== 'your_openai_api_key' &&
                     process.env.OPENAI_API_KEY.length > 0;

    // Try Ollama first (local/privacy-first), then OpenAI as fallback
    if (!hasOllama && !hasOpenAI) {
      console.warn('No AI service configured. Using mock data for demo.');
      
      // Generate unique mock data based on timestamp and image data
      const mockVariations = [
        {
          vendor: "TriCounty AG",
          category: "Equipment & Software",
          lineItems: [
            { description: "Fertilizer 20-10-10", quantity: 2, unitPrice: 45.99, category: "Equipment & Software" },
            { description: "Grass Seed Premium Mix", quantity: 1, unitPrice: 28.52, category: "Equipment & Software" },
            { description: "Garden Tools Set", quantity: 1, unitPrice: 25.00, category: "Equipment & Software" }
          ]
        },
        {
          vendor: "Office Depot",
          category: "Office Supplies",
          lineItems: [
            { description: "Copy Paper (500 sheets)", quantity: 3, unitPrice: 12.99, category: "Office Supplies" },
            { description: "Ballpoint Pens (12-pack)", quantity: 2, unitPrice: 8.50, category: "Office Supplies" },
            { description: "Stapler Heavy Duty", quantity: 1, unitPrice: 24.99, category: "Office Supplies" }
          ]
        },
        {
          vendor: "Home Depot",
          category: "Equipment & Software",
          lineItems: [
            { description: "Drill Bits Set", quantity: 1, unitPrice: 34.99, category: "Equipment & Software" },
            { description: "Safety Goggles", quantity: 2, unitPrice: 15.99, category: "Equipment & Software" },
            { description: "Extension Cord 25ft", quantity: 1, unitPrice: 28.99, category: "Equipment & Software" }
          ]
        },
        {
          vendor: "Starbucks",
          category: "Meals & Entertainment",
          lineItems: [
            { description: "Grande Latte", quantity: 2, unitPrice: 5.45, category: "Meals & Entertainment" },
            { description: "Blueberry Muffin", quantity: 1, unitPrice: 3.95, category: "Meals & Entertainment" },
            { description: "Breakfast Sandwich", quantity: 1, unitPrice: 4.95, category: "Meals & Entertainment" }
          ]
        },
        {
          vendor: "Shell Gas Station",
          category: "Travel & Transportation",
          lineItems: [
            { description: "Regular Gasoline", quantity: 12.5, unitPrice: 3.89, category: "Travel & Transportation" },
            { description: "Energy Drink", quantity: 1, unitPrice: 2.99, category: "Meals & Entertainment" },
            { description: "Car Wash", quantity: 1, unitPrice: 8.99, category: "Travel & Transportation" }
          ]
        },
        {
          vendor: "Best Buy",
          category: "Equipment & Software",
          lineItems: [
            { description: "USB Cable 6ft", quantity: 2, unitPrice: 19.99, category: "Equipment & Software" },
            { description: "Wireless Mouse", quantity: 1, unitPrice: 29.99, category: "Equipment & Software" },
            { description: "Screen Cleaner Kit", quantity: 1, unitPrice: 12.99, category: "Office Supplies" }
          ]
        }
      ];
      
      // Use a hash of the image data to consistently pick the same variation for the same image
      const imageHash = imageUrl ? imageUrl.length : (imageData ? imageData.length : Date.now());
      const variationIndex = imageHash % mockVariations.length;
      const selectedVariation = mockVariations[variationIndex];
      
      // Calculate totals from line items
      const lineItemsWithIds = selectedVariation.lineItems.map(item => ({
        id: crypto.randomUUID(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        category: item.category,
      }));
      
      const subtotal = lineItemsWithIds.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = 0.08; // 8% tax
      const tax = subtotal * taxRate;
      const totalAmount = subtotal + tax;
      
      const mockData = {
        vendor: selectedVariation.vendor,
        date: new Date().toISOString().split('T')[0],
        totalAmount: Math.round(totalAmount * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        currency: "USD",
        lineItems: lineItemsWithIds,
        category: selectedVariation.category,
        confidence: 85 + (imageHash % 15), // Confidence between 85-99
        notes: "",
      };

      return NextResponse.json({
        success: true,
        data: mockData,
        warning: "Using demo data. Configure OPENAI_API_KEY for real OCR processing."
      });
    }

    // Try Ollama first if available
    if (hasOllama) {
      try {
        console.log('Attempting OCR processing with Ollama...');
        const ollamaResult = await processWithOllama(imageUrl || imageData);
        if (ollamaResult) {
          return NextResponse.json({
            success: true,
            data: ollamaResult,
            source: "ollama"
          });
        }
      } catch (error) {
        console.warn('Ollama processing failed, falling back to OpenAI:', error);
      }
    }

    // Fallback to OpenAI if Ollama fails or unavailable
    if (!hasOpenAI) {
      return NextResponse.json(
        { error: "No AI service available for OCR processing" },
        { status: 500 }
      );
    }

    // Receipt parsing prompt optimized for structured extraction
    const prompt = `You are a receipt parsing AI. Extract all information from this receipt image and return ONLY a valid JSON object with this exact structure:

{
  "vendor": "string - business name",
  "date": "YYYY-MM-DD - receipt date",
  "totalAmount": number,
  "subtotal": number,
  "tax": number,
  "currency": "USD",
  "lineItems": [
    {
      "description": "string - item name",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "category": "string - best guess category"
    }
  ],
  "category": "string - overall expense category",
  "confidence": number - 0-100 confidence score
}

Categories should be one of: "Office Supplies", "Travel & Transportation", "Meals & Entertainment", "Marketing & Advertising", "Professional Services", "Equipment & Software", "Utilities", "Rent & Facilities", "Insurance", "Training & Education", "Other"

If you cannot read the receipt clearly, return confidence < 50. Return ONLY the JSON object, no additional text.`;

    const result = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              image: imageUrl || imageData,
            },
          ],
        },
      ],
      maxTokens: 1000,
    });

    // Parse the AI response
    let extractedData;
    try {
      // Clean the response and extract JSON
      const cleanedResponse = result.text.replace(/```json\s*|\s*```/g, "").trim();
      extractedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", result.text);
      return NextResponse.json(
        { error: "Failed to parse receipt data" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!extractedData.vendor || !extractedData.totalAmount) {
      return NextResponse.json(
        { error: "Insufficient data extracted from receipt" },
        { status: 400 }
      );
    }

    // Ensure line items have required fields
    if (extractedData.lineItems) {
      extractedData.lineItems = extractedData.lineItems.map((item: any, index: number) => ({
        id: crypto.randomUUID(),
        description: item.description || `Item ${index + 1}`,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || item.unitPrice || 0,
        category: item.category || "Other",
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: extractedData.vendor,
        date: extractedData.date || new Date().toISOString().split('T')[0],
        totalAmount: extractedData.totalAmount,
        subtotal: extractedData.subtotal || extractedData.totalAmount,
        tax: extractedData.tax || 0,
        currency: extractedData.currency || "USD",
        lineItems: extractedData.lineItems || [],
        category: extractedData.category || "Other",
        confidence: extractedData.confidence || 75,
        notes: "",
      },
    });
  } catch (error) {
    console.error("OCR processing error:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
}