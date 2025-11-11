import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { InvoiceData, InvoiceOCRResult, vendorPatternTracker } from "@/lib/types/invoice";

/**
 * Invoice Processing API Endpoint
 * Extracts structured data from vendor invoices using OpenAI GPT-4o-mini
 * Demo endpoint - no database persistence
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function processInvoiceWithOpenAI(imageBase64: string): Promise<InvoiceOCRResult> {
  const startTime = Date.now();

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key') {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        processingTime: Date.now() - startTime,
        provider: 'openai'
      };
    }

    // Handle URLs or base64
    let imageInput: string;
    if (imageBase64.startsWith('http')) {
      imageInput = imageBase64;
      console.log('Using URL for invoice processing...');
    } else {
      imageInput = imageBase64;
    }

    const prompt = `You are an expert invoice processing AI. Extract all information from this vendor invoice and return ONLY a valid JSON object with this exact structure:

{
  "header": {
    "vendorName": "string - business/vendor name",
    "vendorNumber": "string - vendor ID/number if present",
    "invoiceNumber": "string - invoice number",
    "invoiceDate": "YYYY-MM-DD - invoice date",
    "dueDate": "YYYY-MM-DD - payment due date if present",
    "poNumber": "string - purchase order number if present",
    "subtotal": number,
    "tax": number,
    "totalAmount": number,
    "currency": "USD or other currency code",
    "paymentTerms": "string - payment terms if present",
    "billingAddress": "string - if present",
    "shippingAddress": "string - if present"
  },
  "lineItems": [
    {
      "description": "string - item/service description",
      "quantity": number,
      "unitOfMeasure": "string - unit of measure (EA, BOX, HR, LB, etc.) - default to 'EA' if not specified",
      "unitPrice": number,
      "totalPrice": number,
      "poNumber": "string - PO number for this line if present",
      "poLineItem": "string - PO line item reference if present",
      "serviceDate": "YYYY-MM-DD - service/delivery date if present",
      "itemCode": "string - material number/item code if present",
      "category": "string - category if identifiable"
    }
  ],
  "confidence": number (0-100)
}

CRITICAL EXTRACTION RULES:
1. **Line Items**: Extract EVERY line item separately - do NOT combine similar items

2. **Quantities & Pricing**:
   - Look for patterns: "QTY X @ $Y = $Z", "X units × $Y", "X FOR $Z"
   - Use exact prices shown - unitPrice × quantity should equal totalPrice
   - If only total is shown, calculate unit price: totalPrice / quantity

3. **Unit of Measure (UOM) - CRITICAL**:
   - LOOK FOR: "UOM", "U/M", "Unit", "Units", "Each", "EA", "BOX", "HR", "LB", "KG", "GAL", "FT", etc.
   - Common UOMs: EA (Each), BOX, CASE, HR (Hour), LB (Pound), KG, GAL (Gallon), FT (Foot), YD (Yard), SQ FT, METER
   - May appear in column header or next to quantity
   - DEFAULT to "EA" (Each) if no UOM is explicitly shown
   - Extract exactly as shown on invoice (preserve case and format)

4. **PO Numbers (CRITICAL - Multiple Label Variations)**:
   - LOOK FOR THESE LABELS: "PO Number", "P.O.", "PO#", "Purchase Order", "Customer PO",
     "Cust PO", "Order Number", "Order #", "Ref Number", "Reference", "Your PO"
   - Check header/top section first for overall PO number
   - Check near billing/shipping info for PO references
   - Check each line item for line-specific PO numbers or references
   - IMPORTANT: If you see ANY variation of these labels, extract that value to poNumber field
   - Do NOT leave poNumber empty if ANY PO-related field exists on the invoice

5. **Item Codes/Material Numbers (Multiple Label Variations)**:
   - LOOK FOR: "Item Code", "Item #", "Material Number", "Mat #", "SKU", "Product Code",
     "Part Number", "Part #", "Catalog #"
   - Often shown before description or in separate column
   - May be alphanumeric (e.g., "MAT-12345", "SKU789", "P/N: ABC-123")

6. **Dates**:
   - Invoice date (required) - may be labeled "Invoice Date", "Date", "Dated", "Bill Date"
   - Due date (payment terms) - may be "Due Date", "Payment Due", "Terms"
   - Service/delivery dates per line item - may be "Service Date", "Delivery Date", "Date Performed"

7. **Vendor Information**:
   - Extract vendor name from header/top of invoice
   - Look for vendor ID/number (may be "Vendor #", "Vendor ID", "Supplier Number", "Account #")

8. **Table Recognition**:
   - Identify ALL table headers regardless of naming variations
   - Common header patterns: Description, Desc, Item, Qty, Quantity, Unit Price, Price,
     Total, Amount, PO#, Item Code, Date
   - Map each row to corresponding headers
   - Handle multi-line descriptions carefully
   - Don't skip rows even if some cells are blank

9. **Field Variation Strategy**:
   - ALWAYS look for semantic meaning, not exact label matches
   - If a field looks like a PO number (alphanumeric, often has dashes or slashes), extract it
   - If a field looks like an item code (short alphanumeric), extract it
   - Use context clues from nearby labels and field positions

10. **Accuracy**: Be precise with numbers, dates, and codes. If unclear, mark lower confidence.
   If field exists but you're unsure which type it is, include it anyway - it's better to extract
   data that can be reviewed than to miss it entirely.

Return ONLY the JSON object, no additional text.`;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: imageInput }
          ]
        }
      ],
      maxTokens: 2000, // More tokens for larger invoices
      temperature: 0.1
    });

    const processingTime = Date.now() - startTime;

    // Log cost information
    const usage = (result as any).usage;
    if (usage) {
      const promptTokens = usage.promptTokens || usage.prompt_tokens || 0;
      const completionTokens = usage.completionTokens || usage.completion_tokens || 0;

      if (promptTokens > 0 || completionTokens > 0) {
        const inputCost = (promptTokens / 1000000) * 0.15;
        const outputCost = (completionTokens / 1000000) * 0.60;
        const totalCost = inputCost + outputCost;

        console.log(`Invoice OCR Cost: $${totalCost.toFixed(4)} (${promptTokens} input, ${completionTokens} output tokens)`);
      }
    }

    // Parse response
    let extractedData: InvoiceData;
    try {
      const cleanedResponse = result.text.replace(/```json\s*|\s*```/g, "").trim();
      console.log("📋 OpenAI raw response:", result.text.substring(0, 500));
      extractedData = JSON.parse(cleanedResponse);
      console.log("✅ Parsed invoice data:", JSON.stringify(extractedData, null, 2));
    } catch (parseError) {
      console.error("❌ Failed to parse OpenAI invoice response:", result.text);
      return {
        success: false,
        error: 'Failed to parse invoice data from AI response',
        processingTime,
        provider: 'openai'
      };
    }

    // Ensure all line items have UOM (default to "EA" if missing)
    extractedData.lineItems = extractedData.lineItems.map(item => ({
      ...item,
      unitOfMeasure: item.unitOfMeasure || 'EA'
    }));

    // Validate required fields
    console.log("🔍 Validating fields:", {
      hasVendorName: !!extractedData.header?.vendorName,
      hasInvoiceNumber: !!extractedData.header?.invoiceNumber,
      hasTotalAmount: extractedData.header?.totalAmount !== undefined && extractedData.header?.totalAmount !== null,
      hasLineItems: !!extractedData.lineItems?.length
    });

    if (!extractedData.header?.vendorName ||
        !extractedData.header?.invoiceNumber ||
        extractedData.header?.totalAmount === undefined ||
        extractedData.header?.totalAmount === null ||
        !extractedData.lineItems?.length) {
      console.error("❌ Missing required fields. Extracted data:", JSON.stringify(extractedData, null, 2));
      return {
        success: false,
        error: 'Missing required invoice fields (vendor, invoice number, total, or line items)',
        processingTime,
        provider: 'openai'
      };
    }

    // Track vendor pattern for future optimization
    vendorPatternTracker.addPattern(extractedData);

    console.log(`✅ Invoice processed: ${extractedData.header.vendorName} - ${extractedData.lineItems.length} line items`);

    return {
      success: true,
      data: extractedData,
      processingTime,
      provider: 'openai'
    };

  } catch (error) {
    console.error('Invoice processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invoice processing failed',
      processingTime: Date.now() - startTime,
      provider: 'openai'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    console.log('📄 Processing vendor invoice...');
    const result = await processInvoiceWithOpenAI(image);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        processingTime: result.processingTime,
        provider: result.provider
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Invoice processing failed" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Invoice API error:", error);
    return NextResponse.json(
      { error: "Failed to process invoice" },
      { status: 500 }
    );
  }
}
