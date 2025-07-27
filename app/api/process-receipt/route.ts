import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { getTenantIdWithFallback } from "@/lib/api-tenant";
import { withPermission } from "@/lib/api-middleware";
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Server-side PDF to image conversion
async function convertPdfToImage(pdfDataUrl: string): Promise<string> {
  try {
    console.log('🔄 Starting server-side PDF conversion...');
    
    // Set up DOM environment for PDF.js
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    
    // Polyfill required globals for PDF.js
    global.DOMMatrix = dom.window.DOMMatrix;
    global.document = dom.window.document;
    global.window = dom.window as any;
    
    // Extract base64 data from data URL
    const base64Data = pdfDataUrl.split(',')[1];
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    
    // Load PDF document with server-side configuration
    const pdf = await pdfjsLib.getDocument({
      data: pdfBuffer,
      verbosity: 0, // Reduce console noise
      isEvalSupported: false,
      useSystemFonts: true
    }).promise;
    console.log(`📄 PDF loaded: ${pdf.numPages} pages`);
    
    // Get first page
    const page = await pdf.getPage(1);
    
    // Set up viewport with high resolution for better OCR
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    
    // Create canvas using node-canvas
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Convert canvas to data URL (PNG format)
    const imageDataUrl = canvas.toDataURL('image/png', 1.0);
    
    console.log('✅ PDF converted to image successfully');
    console.log(`📏 Image dimensions: ${viewport.width}x${viewport.height}`);
    
    return imageDataUrl;
    
  } catch (error) {
    console.error('❌ Server-side PDF conversion failed:', error);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}

// Function to save receipt data to database
async function saveReceiptToDatabase(receiptData: any, imageUrl?: string): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the current tenant ID for the authenticated user
    const tenantId = await getTenantIdWithFallback();
    
    // Check if vendor exists, create if not
    let vendorId;
    const normalizedName = receiptData.vendor.toLowerCase().trim().replace(/\s+/g, ' ');
    const { data: existingVendor } = await supabase
      .from('vendor')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('tenant_id', tenantId)
      .single();
    
    if (existingVendor) {
      vendorId = existingVendor.id;
    } else {
      const { data: newVendor, error: vendorError } = await supabase
        .from('vendor')
        .insert({
          tenant_id: tenantId,
          name: receiptData.vendor,
          normalized_name: normalizedName,
          category: receiptData.category || 'Other'
        })
        .select('id')
        .single();
      
      if (vendorError) {
        console.error('Error creating vendor:', vendorError);
        throw vendorError;
      }
      vendorId = newVendor.id;
    }

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabase
      .from('receipt')
      .insert({
        tenant_id: defaultTenantId,
        vendor_id: vendorId,
        receipt_date: receiptData.date,
        currency_code: receiptData.currency || 'USD',
        total_amount: receiptData.totalAmount,
        tax_amount: receiptData.tax || 0,
        original_file_url: imageUrl || null,
        ocr_confidence: (receiptData.confidence || 75) / 100, // Convert percentage to decimal
        status: 'processed'
      })
      .select('id')
      .single();
    
    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      throw receiptError;
    }

    // Create receipt line items
    if (receiptData.lineItems && receiptData.lineItems.length > 0) {
      const lineItemsToInsert = receiptData.lineItems.map((item: any) => ({
        receipt_id: receipt.id,
        sku: null,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: item.totalPrice || (item.quantity * item.unitPrice) || 0,
        category: item.category || 'Other',
        tax_deductible: true
      }));

      const { error: lineItemsError } = await supabase
        .from('receipt_item')
        .insert(lineItemsToInsert);
      
      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError);
        throw lineItemsError;
      }
    }

    console.log('✅ Receipt saved to database:', receipt.id);
    return receipt.id;
  } catch (error) {
    console.error('❌ Database save error:', error);
    throw error;
  }
}

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
  return withPermission('receipts:create')(req, async (request, context) => {
    try {
      let { imageUrl, imageData } = await request.json();

      if (!imageUrl && !imageData) {
        return NextResponse.json({ error: "No image provided" }, { status: 400 });
      }

    // Check if this is a PDF (which browser OCR can't handle)
    const isPdf = imageUrl?.includes('data:application/pdf') || imageData?.includes('data:application/pdf');
    
    if (isPdf) {
      console.log('📄 PDF detected - converting to image for Vision API processing...');
      
      try {
        // Convert PDF to image using server-side conversion
        const pdfDataUrl = imageData || imageUrl;
        const convertedImage = await convertPdfToImage(pdfDataUrl);
        
        // Replace the PDF data with converted image data
        imageData = convertedImage;
        imageUrl = undefined; // Clear the URL since we're using imageData now
        
        console.log('✅ PDF successfully converted to image for Vision API');
      } catch (error) {
        console.error('❌ PDF conversion failed:', error);
        return NextResponse.json(
          { error: `PDF conversion failed: ${error.message}. Please try converting to image format manually.` },
          { status: 500 }
        );
      }
    }

    // Check for available AI services (focus on OpenAI Vision for best results)
    const hasOpenAI = process.env.OPENAI_API_KEY && 
                     process.env.OPENAI_API_KEY !== 'your_openai_api_key' &&
                     process.env.OPENAI_API_KEY.length > 0;

    // Skip Ollama for now - focusing on OpenAI Vision API for better accuracy
    if (!hasOpenAI) {
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

      // Note: Receipt will be saved when user clicks "Save" after review

      return NextResponse.json({
        success: true,
        data: mockData,
        warning: "Using demo data. Configure OPENAI_API_KEY for real OCR processing."
      });
    }

    // Use OpenAI Vision API directly (best accuracy for receipts)
    console.log('🔥 Using OpenAI Vision API for receipt processing...');
    
    // Debug: Check what we're actually sending
    const finalImageData = imageData || imageUrl;
    const imageType = finalImageData?.substring(0, 30) + '...';
    console.log('🔍 Sending to Vision API:', imageType);

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

CRITICAL RULES FOR ITEM EXTRACTION:
1. Extract EACH item as a SEPARATE line item - do NOT combine similar items
2. Use the EXACT prices shown on the receipt - do NOT calculate or divide prices
3. If an item shows quantity > 1, use that quantity with the total price shown
4. If multiple similar items have different prices, list them separately
5. Read each line carefully - items on separate lines should be separate entries
6. NEVER group items together or average prices

Categories should be one of: "Office Supplies", "Travel & Transportation", "Meals & Entertainment", "Marketing & Advertising", "Professional Services", "Equipment & Software", "Utilities", "Rent & Facilities", "Insurance", "Training & Education", "Other"

If you cannot read the receipt clearly, return confidence < 50. Return ONLY the JSON object, no additional text.`;

    const result = await generateText({
      model: openai("gpt-4o-mini"), // Cheaper alternative: ~10x less expensive
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              image: imageData || imageUrl,
            },
          ],
        },
      ],
      maxTokens: 1000,
    });

    // Log detailed cost information for monitoring
    const usage = (result as any).usage;
    console.log('🔍 Debug usage object:', JSON.stringify(usage, null, 2));
    
    if (usage) {
      // Handle different usage object structures (AI SDK vs OpenAI direct)
      const promptTokens = usage.promptTokens || usage.prompt_tokens || usage.input_tokens || 0;
      const completionTokens = usage.completionTokens || usage.completion_tokens || usage.output_tokens || 0;
      const totalTokens = usage.totalTokens || usage.total_tokens || (promptTokens + completionTokens);
      
      if (promptTokens > 0 || completionTokens > 0) {
        // GPT-4o-mini pricing: $0.15 per 1M input tokens, $0.60 per 1M output tokens
        const inputCost = (promptTokens / 1000000) * 0.15;
        const outputCost = (completionTokens / 1000000) * 0.60;
        const totalCost = inputCost + outputCost;
        
        console.log('\n💰 VISION API COST BREAKDOWN:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Input tokens:     ${promptTokens.toLocaleString()}`);
        console.log(`📝 Output tokens:    ${completionTokens.toLocaleString()}`);
        console.log(`🔢 Total tokens:     ${totalTokens.toLocaleString()}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`💵 Input cost:       $${inputCost.toFixed(6)} ($0.15 per 1M tokens)`);
        console.log(`💵 Output cost:      $${outputCost.toFixed(6)} ($0.60 per 1M tokens)`);
        console.log(`💰 TOTAL COST:       $${totalCost.toFixed(4)}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Monthly projections
        const monthly100 = totalCost * 100;
        const monthly1000 = totalCost * 1000;
        const monthly10000 = totalCost * 10000;
        
        console.log(`📈 Monthly projections:`);
        console.log(`   100 receipts:     $${monthly100.toFixed(2)}`);
        console.log(`   1,000 receipts:   $${monthly1000.toFixed(2)}`);
        console.log(`   10,000 receipts:  $${monthly10000.toFixed(2)}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      } else {
        console.log('⚠️ No token usage information available');
      }
    } else {
      console.log('⚠️ No usage information in API response');
    }

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

    const processedData = {
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

    // Note: Receipt will be saved when user clicks "Save" after review

    return NextResponse.json({
      success: true,
      data: processedData,
    });
  } catch (error) {
    console.error("OCR processing error:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
  });
}