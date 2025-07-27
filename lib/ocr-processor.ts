import { createWorker, PSM } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
}

export interface ExtractedReceiptData {
  vendor: string;
  date: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  currency: string;
  lineItems: LineItem[];
  category: string;
  confidence: number;
  notes: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export class OCRProcessor {
  private worker: Tesseract.Worker | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      this.worker = await createWorker('eng', 1, {
        logger: m => console.log('OCR:', m),
        cachePath: '.',
      });
      
      // Optimized parameters for receipt processing
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$%-&():;@# ',
        preserve_interword_spaces: '1',
        tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine only
        textord_min_linesize: '2.5',
        textord_tablefind_good_neighbours: '3',
        textord_tabfind_find_tables: '1',
      });
      
      // Set page segmentation mode separately
      await this.worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK
      });

      this.initialized = true;
      console.log('✅ OCR Worker initialized with optimized settings');
    } catch (error) {
      console.error('❌ Failed to initialize OCR worker:', error);
      throw error;
    }
  }

  async processImage(imageFile: File): Promise<ExtractedReceiptData> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      console.log('🔍 Starting OCR processing...');
      
      // Handle both images and PDFs
      if (!imageFile.type.startsWith('image/') && imageFile.type !== 'application/pdf') {
        throw new Error(`Unsupported file type: ${imageFile.type}. Only image and PDF files are supported.`);
      }

      // Convert PDF to image if needed
      let processFile: File | string = imageFile;
      if (imageFile.type === 'application/pdf') {
        console.log('📄 Converting PDF to image for OCR processing...');
        processFile = await this.convertPdfToImage(imageFile);
      }

      // Try with original file/image first
      let result;
      try {
        console.log('📸 Processing file:', imageFile.name, imageFile.type, `${(imageFile.size / 1024).toFixed(1)}KB`);
        
        // Use the processFile (either original image or converted PDF)
        let imageUrl: string;
        if (typeof processFile === 'string') {
          // Already a data URL from PDF conversion
          imageUrl = processFile;
        } else {
          // Convert File to blob URL for better compatibility
          imageUrl = URL.createObjectURL(processFile);
        }
        
        try {
          const { data } = await this.worker.recognize(imageUrl);
          result = {
            text: data.text,
            confidence: data.confidence
          };
          
          console.log('📝 Extracted text (original):', result.text.substring(0, 200) + '...');
          console.log('📊 OCR Confidence (original):', result.confidence);
          
          // If confidence is very low, try with preprocessing (only for images, not PDFs)
          if (result.confidence < 40 && imageFile.type.startsWith('image/')) {
            console.log('⚡ Low confidence, trying with preprocessing...');
            try {
              const processedImage = await this.preprocessImage(imageFile);
              const { data: processedData } = await this.worker.recognize(processedImage);
              
              if (processedData.confidence > result.confidence) {
                console.log('📈 Preprocessing improved confidence:', processedData.confidence);
                result = {
                  text: processedData.text,
                  confidence: processedData.confidence
                };
              }
            } catch (preprocessError) {
              console.warn('⚠️ Preprocessing failed, using original result:', preprocessError);
            }
          }
        } finally {
          if (typeof processFile !== 'string') {
            URL.revokeObjectURL(imageUrl);
          }
        }
      } catch (ocrError) {
        console.error('❌ Original OCR failed, trying with preprocessing:', ocrError);
        
        // Only try preprocessing for image files, not PDFs
        if (imageFile.type.startsWith('image/')) {
          try {
            // If original fails, try preprocessing as fallback
            const processedImage = await this.preprocessImage(imageFile);
            const { data } = await this.worker.recognize(processedImage);
            result = {
              text: data.text,
              confidence: data.confidence
            };
            console.log('🔄 Preprocessing fallback successful:', result.confidence);
          } catch (preprocessError) {
            console.error('❌ Both original and preprocessed OCR failed');
            throw new Error('OCR processing failed. Please try with a clearer image or use AI processing instead.');
          }
        } else {
          // For PDFs, just throw the original error
          throw new Error('PDF OCR processing failed. Please try with AI processing instead.');
        }
      }

      // Parse the extracted text into structured data
      const structuredData = this.parseReceiptText(result.text, result.confidence);
      
      return structuredData;
    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      throw error;
    }
  }

  private async preprocessImage(imageFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      let objectUrl: string | null = null;
      
      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      };
      
      img.onload = () => {
        try {
          // Set canvas size
          canvas.width = img.width;
          canvas.height = img.height;
          
          if (!ctx) {
            cleanup();
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Apply preprocessing filters
          this.applyContrastEnhancement(data);
          this.applyNoiseReduction(data);
          this.applySharpening(data, canvas.width, canvas.height);
          
          // Put processed image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to data URL
          const dataURL = canvas.toDataURL('image/png', 1.0);
          cleanup();
          resolve(dataURL);
        } catch (error) {
          cleanup();
          reject(new Error('Failed to process image: ' + (error as Error).message));
        }
      };
      
      img.onerror = () => {
        cleanup();
        reject(new Error('Failed to load image for preprocessing'));
      };
      
      try {
        // Create object URL for the image
        objectUrl = URL.createObjectURL(imageFile);
        img.src = objectUrl;
      } catch (error) {
        cleanup();
        reject(new Error('Failed to create image URL: ' + (error as Error).message));
      }
    });
  }

  private applyContrastEnhancement(data: Uint8ClampedArray): void {
    const factor = 1.2; // Contrast enhancement factor
    const intercept = 20;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * data[i] + intercept));     // Red
      data[i + 1] = Math.min(255, Math.max(0, factor * data[i + 1] + intercept)); // Green
      data[i + 2] = Math.min(255, Math.max(0, factor * data[i + 2] + intercept)); // Blue
      // Alpha channel (i + 3) remains unchanged
    }
  }

  private applyNoiseReduction(data: Uint8ClampedArray): void {
    // Simple noise reduction by converting to grayscale and enhancing text
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Enhance text-like areas (darker regions)
      const enhanced = gray < 128 ? Math.max(0, gray - 20) : Math.min(255, gray + 20);
      
      data[i] = enhanced;     // Red
      data[i + 1] = enhanced; // Green
      data[i + 2] = enhanced; // Blue
      // Alpha remains unchanged
    }
  }

  private applySharpening(data: Uint8ClampedArray, width: number, height: number): void {
    // Simple sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    const originalData = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = (y + ky - 1) * width + (x + kx - 1);
            const kernelValue = kernel[ky * 3 + kx];
            
            r += originalData[px * 4] * kernelValue;
            g += originalData[px * 4 + 1] * kernelValue;
            b += originalData[px * 4 + 2] * kernelValue;
          }
        }
        
        const currentPx = y * width + x;
        data[currentPx * 4] = Math.min(255, Math.max(0, r));
        data[currentPx * 4 + 1] = Math.min(255, Math.max(0, g));
        data[currentPx * 4 + 2] = Math.min(255, Math.max(0, b));
      }
    }
  }

  private parseReceiptText(text: string, ocrConfidence: number): ExtractedReceiptData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Debug logging
    console.log('🔍 PARSING DEBUG - Raw OCR Text:');
    console.log('=====================================');
    console.log(text);
    console.log('=====================================');
    console.log('📝 PARSING DEBUG - Cleaned Lines:');
    lines.forEach((line, index) => {
      console.log(`${index + 1}: "${line}"`);
    });
    console.log('=====================================');
    
    // Extract vendor (usually first significant line)
    const vendor = this.extractVendor(lines);
    console.log('🏪 Extracted Vendor:', vendor);
    
    // Apply vendor-specific parsing improvements
    const vendorSpecificData = this.applyVendorSpecificParsing(vendor, lines, text);
    
    // Extract date
    const date = vendorSpecificData.date || this.extractDate(lines);
    console.log('📅 Extracted Date:', date);
    
    // Extract amounts
    const amounts = vendorSpecificData.amounts || this.extractAmounts(lines);
    console.log('💰 Extracted Amounts:', amounts);
    
    // Extract line items
    const lineItems = vendorSpecificData.lineItems || this.extractLineItems(lines);
    console.log('📋 Extracted Line Items:', lineItems);
    
    // Determine category based on vendor and items
    const category = this.categorizeReceipt(vendor, lineItems);
    console.log('🏷️ Determined Category:', category);
    
    // Calculate confidence based on how much data we extracted
    const dataConfidence = this.calculateDataConfidence(vendor, amounts.total, lineItems);
    const finalConfidence = Math.min(ocrConfidence, dataConfidence);
    console.log('📊 Data Confidence:', dataConfidence, 'Final Confidence:', finalConfidence);

    const result = {
      vendor,
      date,
      totalAmount: amounts.total,
      subtotal: amounts.subtotal,
      tax: amounts.tax,
      currency: 'USD',
      lineItems,
      category,
      confidence: finalConfidence,
      notes: ''
    };
    
    console.log('✅ Final Parsed Result:', result);
    return result;
  }

  private extractVendor(lines: string[]): string {
    // Look for vendor name in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Skip lines that are clearly not vendor names
      if (line.match(/^\d+$/) || line.match(/^[\d\/\-]+$/) || line.length < 3) {
        continue;
      }
      
      // Check for known vendor patterns
      const normalizedLine = line.toUpperCase();
      
      // Home Depot specific
      if (normalizedLine.includes('HOME DEPOT') || normalizedLine.includes('HOMEDEPOT')) {
        return 'The Home Depot';
      }
      // Walmart specific
      if (normalizedLine.includes('WALMART') || normalizedLine.includes('WAL-MART') || normalizedLine.includes('WAL MART')) {
        return 'Walmart';
      }
      // Lowe's specific
      if (normalizedLine.includes('LOWE\'S') || normalizedLine.includes('LOWES')) {
        return 'Lowe\'s';
      }
      // Target specific
      if (normalizedLine.includes('TARGET')) {
        return 'Target';
      }
      // Costco specific
      if (normalizedLine.includes('COSTCO')) {
        return 'Costco';
      }
      
      // Take first substantial line as vendor
      if (line.length > 3 && !line.match(/^[\d\$\.\,\s]+$/)) {
        return line;
      }
    }
    return 'Unknown Vendor';
  }

  private extractDate(lines: string[]): string {
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2},?\s*\d{2,4}/i
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          try {
            const dateStr = match[1] || match[0];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) {
            continue;
          }
        }
      }
    }
    
    return new Date().toISOString().split('T')[0];
  }

  private extractAmounts(lines: string[]): { total: number; subtotal: number; tax: number } {
    let total = 0;
    let subtotal = 0;
    let tax = 0;
    const foundAmounts: Array<{amount: number, type: string, line: string, confidence: number}> = [];

    console.log('💰 AMOUNT EXTRACTION DEBUG:');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase().replace(/\s+/g, ' ');
      
      // More comprehensive amount patterns
      const amountMatches: RegExpExecArray[] = [];
      
      // Collect all matches from different patterns
      const patterns = [
        /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,     // $1,234.56
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*\$/g,     // 1,234.56$
        /(\d+\.\d{2})(?!\d)/g,                        // 12.34 (not part of larger number)
        /(\d+)\.(\d{2})\b/g,                          // Alternative decimal format
        /:\s*\$?(\d+\.\d{2})/g,                      // After colon: $12.34 or : 12.34
        /\s+(\d+\.\d{2})$/g,                         // End of line amount
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          amountMatches.push(match);
          if (match.index === pattern.lastIndex) pattern.lastIndex++;
        }
        pattern.lastIndex = 0; // Reset for next line
      }

      for (const match of amountMatches) {
        const amountStr = match[1]?.replace(/,/g, '') || match[0]?.replace(/[,$]/g, '');
        const amount = parseFloat(amountStr);
        
        if (isNaN(amount) || amount <= 0 || amount > 99999) continue; // Reasonable bounds
        
        // Determine what type of amount this likely is
        let type = 'unknown';
        let confidence = 0;
        
        // Total patterns (higher confidence for specific keywords)
        if (/\b(total|amount\s*due|balance\s*due|grand\s*total|final\s*total|you\s*owe|pay\s*amount|total\s*amount|amount\s*paid|total\s*sale|sale\s*total)\b/i.test(lowerLine)) {
          type = 'total';
          confidence = 90;
          // Higher confidence if it's the largest amount or near end of receipt
          if (i > lines.length * 0.6) confidence += 10;
          // Even higher for exact match patterns
          if (/^total\s*:?\s*\$?[\d\.]+$/i.test(lowerLine)) confidence = 100;
        }
        // Subtotal patterns
        else if (/\b(subtotal|sub\s*total|sub-total|net\s*amount|before\s*tax|merchandise\s*total|your\s*order|order\s*total|purchase\s*amount|item\s*total|product\s*total)\b/i.test(lowerLine)) {
          type = 'subtotal';
          confidence = 85;
          // Higher for exact patterns
          if (/^subtotal\s*:?\s*\$?[\d\.]+$/i.test(lowerLine)) confidence = 95;
        }
        // Tax/Fee patterns (expanded to include various fees)
        else if (/\b(tax|gst|hst|pst|vat|sales\s*tax|state\s*tax|city\s*tax|local\s*tax|fee|service\s*fee|transaction\s*fee|processing\s*fee|convenience\s*fee|tx|levy)\b/i.test(lowerLine)) {
          type = 'tax';
          confidence = 85;
          // Higher for exact tax patterns
          if (/^(sales\s*)?tax\s*:?\s*\$?[\d\.]+$/i.test(lowerLine)) confidence = 95;
        }
        // Change patterns (should be ignored)
        else if (/\b(change|cash\s*back|refund|credit)\b/i.test(lowerLine)) {
          type = 'change';
          confidence = 95;
        }
        // Payment patterns (should be ignored)
        else if (/\b(paid|payment|cash|card|visa|mastercard|amex|credit\s*card|debit)\b/i.test(lowerLine)) {
          type = 'payment';
          confidence = 80;
        }
        // If it's a larger amount near the end, likely total
        else if (i > lines.length * 0.7 && amount > 5) {
          type = 'likely_total';
          confidence = 60;
        }
        // If it's a small amount, might be tax
        else if (amount < 20 && i > lines.length * 0.5) {
          type = 'likely_tax';
          confidence = 40;
        }

        foundAmounts.push({ amount, type, line, confidence });
        console.log(`   Line ${i + 1}: $${amount.toFixed(2)} -> ${type} (${confidence}% confidence) | "${line}"`);
      }
    }

    // Sort by confidence and select best candidates
    const totals = foundAmounts.filter(a => a.type === 'total' || a.type === 'likely_total').sort((a, b) => b.confidence - a.confidence);
    const subtotals = foundAmounts.filter(a => a.type === 'subtotal').sort((a, b) => b.confidence - a.confidence);
    const taxes = foundAmounts.filter(a => a.type === 'tax' || a.type === 'likely_tax').sort((a, b) => b.confidence - a.confidence);

    // Select the most confident amounts
    if (totals.length > 0) {
      total = totals[0].amount;
      console.log(`   ✅ Selected Total: $${total.toFixed(2)} (${totals[0].confidence}% confidence)`);
    }
    if (subtotals.length > 0) {
      subtotal = subtotals[0].amount;
      console.log(`   ✅ Selected Subtotal: $${subtotal.toFixed(2)} (${subtotals[0].confidence}% confidence)`);
    }
    if (taxes.length > 0) {
      tax = taxes[0].amount;
      console.log(`   ✅ Selected Tax: $${tax.toFixed(2)} (${taxes[0].confidence}% confidence)`);
    }

    // If no explicit total found, try to infer from largest reasonable amount
    if (total === 0) {
      const reasonableAmounts = foundAmounts
        .filter(a => a.type !== 'change' && a.type !== 'payment' && a.amount > 1)
        .sort((a, b) => b.amount - a.amount);
      
      if (reasonableAmounts.length > 0) {
        total = reasonableAmounts[0].amount;
        console.log(`   🔍 Inferred Total from largest amount: $${total.toFixed(2)}`);
      }
    }

    // Smart validation and correction
    if (total === 0 && subtotal > 0) {
      total = subtotal + tax;
      console.log(`   🔧 Calculated Total: Subtotal($${subtotal.toFixed(2)}) + Tax($${tax.toFixed(2)}) = $${total.toFixed(2)}`);
    }
    if (subtotal === 0 && total > tax && tax > 0) {
      subtotal = total - tax;
      console.log(`   🔧 Calculated Subtotal: Total($${total.toFixed(2)}) - Tax($${tax.toFixed(2)}) = $${subtotal.toFixed(2)}`);
    }
    if (tax === 0 && total > subtotal && subtotal > 0) {
      tax = total - subtotal;
      console.log(`   🔧 Calculated Tax: Total($${total.toFixed(2)}) - Subtotal($${subtotal.toFixed(2)}) = $${tax.toFixed(2)}`);
    }

    // Final validation
    if (total > 0 && subtotal > total) {
      console.log(`   ⚠️ Subtotal($${subtotal.toFixed(2)}) > Total($${total.toFixed(2)}), fixing...`);
      subtotal = total;
    }
    if (tax < 0) {
      console.log(`   ⚠️ Negative tax detected, setting to 0`);
      tax = 0;
    }

    const result = { total, subtotal, tax };
    console.log(`   📊 Final Amounts: Total=$${total.toFixed(2)}, Subtotal=$${subtotal.toFixed(2)}, Tax=$${tax.toFixed(2)}`);
    return result;
  }

  private extractLineItems(lines: string[]): LineItem[] {
    const items: LineItem[] = [];
    console.log('📋 LINE ITEM EXTRACTION DEBUG:');
    
    // Multiple patterns for line item detection
    const itemPatterns = [
      {
        pattern: /^(.+?)\s+(\d+(?:\.\d+)?)\s*[@x]\s*\$?(\d+\.\d{2})\s*\$?(\d+\.\d{2})$/i,
        name: 'Full: Item Qty @ UnitPrice TotalPrice',
        groups: 4
      },
      {
        pattern: /^(.+?)\s+(\d+)\s*x\s*\$?(\d+\.\d{2})\s*=?\s*\$?(\d+\.\d{2})$/i,
        name: 'Multiplication: Item Qty x UnitPrice = TotalPrice',
        groups: 4
      },
      {
        pattern: /^(.+?)\s*\(\$?(\d+\.\d{2})\)$/,
        name: 'Parenthetical: Item (Price)',
        groups: 2
      },
      {
        pattern: /^(.+?)\s*\((\d+\.\d{2})\)$/,
        name: 'Parenthetical No Dollar: Item (Price)',
        groups: 2
      },
      {
        pattern: /^(.+?)\s+\$?(\d+\.\d{2})\s*$/,
        name: 'Simple: Item TotalPrice',
        groups: 2
      },
      {
        pattern: /^(.+?)\s+(\d+(?:\.\d+)?)\s*\$?(\d+\.?\d*)$/,
        name: 'Basic: Item Qty Price',
        groups: 3
      },
      {
        pattern: /^(.+?)\s+(\d+\.?\d*)\s*ea\s*\$?(\d+\.\d{2})$/i,
        name: 'Each: Item Price ea TotalPrice',
        groups: 3
      },
      {
        pattern: /^(.+)\s+(\d+\.\d{2})$/,
        name: 'Fallback: Description Amount',
        groups: 2
      },
      {
        pattern: /^(.+?)\s{2,}\$?(\d+\.\d{2})$/,
        name: 'Spaced: Description    Amount',
        groups: 2
      },
      {
        pattern: /^(.+?)\s+\$(\d+\.\d{2})$/,
        name: 'Dollar Sign: Description $Amount',
        groups: 2
      }
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.trim();
      
      // Skip lines that are clearly not items
      if (cleanLine.length < 3) {
        console.log(`   Skipping line ${i + 1}: Too short - "${cleanLine}"`);
        continue;
      }
      
      // Skip lines with payment/total keywords - more comprehensive check
      if (/\b(subtotal|tax|gst|hst|pst|vat|amount due|change|tender|cash|credit|debit|visa|mastercard|receipt|thank|store|address|phone|www\.|cashier|refund auth|total|grand total|balance|payment|your account)\b/i.test(cleanLine)) {
        console.log(`   Skipping line ${i + 1}: Non-item keyword - "${cleanLine}"`);
        continue;
      }
      
      if (/^\d+\/\d+\/\d+/.test(cleanLine) || /^[\d\s\-\/]+$/.test(cleanLine) || /^\d+:\d+/.test(cleanLine)) {
        console.log(`   Skipping line ${i + 1}: Date/time/number only - "${cleanLine}"`);
        continue;
      }
      
      let matched = false;
      let bestMatch: any = null;
      
      for (const patternObj of itemPatterns) {
        const match = cleanLine.match(patternObj.pattern);
        if (match) {
          console.log(`   Line ${i + 1} matches pattern "${patternObj.name}": "${cleanLine}"`);
          console.log(`     Match groups:`, match.slice(1));
          
          let description: string, quantity: number, unitPrice: number, totalPrice: number;
          
          if (patternObj.groups === 4) {
            // Full pattern: description qty unitPrice totalPrice
            [, description, , , ] = match;
            quantity = parseFloat(match[2]);
            unitPrice = parseFloat(match[3]);
            totalPrice = parseFloat(match[4]);
          } else if (patternObj.groups === 3) {
            // Three part pattern: description qty/unitPrice totalPrice
            [, description, , ] = match;
            
            if (patternObj.name.includes('Each')) {
              // Price ea format
              quantity = 1;
              unitPrice = parseFloat(match[2]);
              totalPrice = parseFloat(match[3]);
            } else {
              // Qty price format
              quantity = parseFloat(match[2]);
              totalPrice = parseFloat(match[3]);
              unitPrice = totalPrice / quantity;
            }
          } else if (patternObj.groups === 2) {
            // Two part pattern: description price (qty=1)
            [, description, ] = match;
            quantity = 1;
            totalPrice = parseFloat(match[2]);
            unitPrice = totalPrice;
          } else {
            continue;
          }
          
          // Clean and validate description
          const cleanedDesc = this.cleanDescription(description);
          
          // Skip if description contains total/payment keywords even after pattern match
          const isInvalidDescription = /^(total|subtotal|tax|payment|balance|amount due|grand total)/i.test(cleanedDesc);
          
          // Validate extracted data
          const isValid = cleanedDesc.length > 2 && 
                         !isInvalidDescription &&
                         quantity > 0 && quantity <= 100 &&
                         unitPrice > 0 && unitPrice <= 10000 &&
                         totalPrice > 0 && totalPrice <= 10000 &&
                         Math.abs(quantity * unitPrice - totalPrice) < 0.05; // Allow small rounding errors
          
          console.log(`     Parsed: desc="${description}", qty=${quantity}, unit=$${unitPrice.toFixed(2)}, total=$${totalPrice.toFixed(2)}`);
          console.log(`     Valid: ${isValid}`);
          
          if (isValid) {
            bestMatch = {
              description: cleanedDesc,
              quantity,
              unitPrice: Math.round(unitPrice * 100) / 100,
              totalPrice: Math.round(totalPrice * 100) / 100,
              category: this.categorizeItem(cleanedDesc),
              patternName: patternObj.name
            };
            matched = true;
            break; // Use first valid match
          }
        }
      }
      
      if (bestMatch) {
        items.push({
          id: crypto.randomUUID(),
          ...bestMatch
        });
        console.log(`   ✅ Added item: ${bestMatch.description} - $${bestMatch.totalPrice.toFixed(2)} (${bestMatch.patternName})`);
      } else if (!matched) {
        console.log(`   ❌ No pattern matched for line ${i + 1}: "${cleanLine}"`);
      }
    }

    console.log(`   📊 Extracted ${items.length} line items before deduplication`);
    
    // Remove duplicate items based on description similarity
    const deduplicatedItems = this.deduplicateItems(items);
    console.log(`   📊 Final ${deduplicatedItems.length} line items after deduplication`);
    
    return deduplicatedItems;
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
      .replace(/^[\*\-\•]\s*/, '') // Remove bullet points
      .replace(/\b\d{10,}\b/g, '') // Remove long product codes (10+ digits)
      .replace(/\b[A-Z]{2,3}-[A-Z0-9-]+\b/g, '') // Remove codes like "70-GIRLS" or "I0-GIS"
      .replace(/\b\d{3}\s\d{3}\b/g, '') // Remove spaced codes like "418 008"
      .replace(/^\w+-/, '') // Remove leading codes like "70-"
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private deduplicateItems(items: LineItem[]): LineItem[] {
    const uniqueItems: LineItem[] = [];
    
    for (const item of items) {
      const similar = uniqueItems.find(existing => 
        this.calculateSimilarity(existing.description.toLowerCase(), item.description.toLowerCase()) > 0.8
      );
      
      if (!similar) {
        uniqueItems.push(item);
      } else {
        // Keep the item with more complete information
        if (item.description.length > similar.description.length) {
          const index = uniqueItems.indexOf(similar);
          uniqueItems[index] = item;
        }
      }
    }
    
    return uniqueItems;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  public async convertPdfToImage(pdfFile: File): Promise<string> {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Get the first page (most receipts are single page)
      const page = await pdf.getPage(1);
      
      // Set up canvas with high DPI for better OCR
      const scale = 2.0; // Higher scale for better OCR accuracy
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context for PDF conversion');
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      
      // Convert to high-quality data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      console.log('✅ PDF converted to image successfully');
      return dataUrl;
      
    } catch (error) {
      console.error('❌ PDF conversion failed:', error);
      throw new Error(`Failed to convert PDF to image: ${(error as Error).message}`);
    }
  }

  private categorizeReceipt(vendor: string, items: LineItem[]): string {
    const vendorLower = vendor.toLowerCase();
    
    // Vendor-based categorization (more comprehensive)
    if (vendorLower.includes('gas') || vendorLower.includes('shell') || vendorLower.includes('exxon') || vendorLower.includes('chevron')) {
      return 'Travel & Transportation';
    }
    if (vendorLower.includes('office') || vendorLower.includes('staples') || vendorLower.includes('depot')) {
      return 'Office Supplies';
    }
    if (vendorLower.includes('restaurant') || vendorLower.includes('coffee') || vendorLower.includes('starbucks') || vendorLower.includes('mcdonald')) {
      return 'Meals & Entertainment';
    }
    if (vendorLower.includes('walmart') || vendorLower.includes('target') || vendorLower.includes('marshalls') || vendorLower.includes('tj maxx')) {
      return 'Other';
    }
    if (vendorLower.includes('home depot') || vendorLower.includes('lowes') || vendorLower.includes('hardware')) {
      return 'Equipment & Software';
    }
    if (vendorLower.includes('grocery') || vendorLower.includes('safeway') || vendorLower.includes('kroger')) {
      return 'Other';
    }

    // Item-based categorization (handle empty items array)
    if (items.length === 0) {
      console.log('🏷️ No items found for categorization, using vendor-based category: Other');
      return 'Other';
    }

    const categories = items.map(item => item.category);
    if (categories.length === 0) {
      return 'Other';
    }

    // Find most common category
    const categoryCount = categories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return mostCommon || 'Other';
  }

  private categorizeItem(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('paper') || desc.includes('pen') || desc.includes('staple')) {
      return 'Office Supplies';
    }
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('parking')) {
      return 'Travel & Transportation';
    }
    if (desc.includes('food') || desc.includes('coffee') || desc.includes('meal')) {
      return 'Meals & Entertainment';
    }
    if (desc.includes('software') || desc.includes('hardware') || desc.includes('computer')) {
      return 'Equipment & Software';
    }
    
    return 'Other';
  }

  private calculateDataConfidence(vendor: string, total: number, items: LineItem[]): number {
    let confidence = 100;
    
    if (vendor === 'Unknown Vendor') confidence -= 20;
    if (total === 0) confidence -= 30;
    if (items.length === 0) confidence -= 25;
    
    return Math.max(confidence, 30);
  }

  private applyVendorSpecificParsing(vendor: string, lines: string[], fullText: string): {
    date?: string;
    amounts?: { total: number; subtotal: number; tax: number };
    lineItems?: LineItem[];
  } {
    const vendorLower = vendor.toLowerCase();
    
    // Home Depot specific parsing
    if (vendorLower.includes('home depot')) {
      console.log('🏠 Applying Home Depot specific parsing...');
      return this.parseHomeDepotReceipt(lines, fullText);
    }
    
    // Walmart specific parsing
    if (vendorLower.includes('walmart')) {
      console.log('🛒 Applying Walmart specific parsing...');
      return this.parseWalmartReceipt(lines, fullText);
    }
    
    // Lowe's specific parsing
    if (vendorLower.includes('lowe')) {
      console.log('🔨 Applying Lowe\'s specific parsing...');
      return this.parseLowesReceipt(lines, fullText);
    }
    
    // Target specific parsing
    if (vendorLower.includes('target')) {
      console.log('🎯 Applying Target specific parsing...');
      return this.parseTargetReceipt(lines, fullText);
    }
    
    // No vendor-specific parsing
    return {};
  }

  private parseHomeDepotReceipt(lines: string[], fullText: string): {
    date?: string;
    amounts?: { total: number; subtotal: number; tax: number };
    lineItems?: LineItem[];
  } {
    const result: any = {};
    
    // Home Depot specific date pattern: often MM/DD/YY format
    for (const line of lines) {
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{2})/);
      if (dateMatch) {
        const [month, day, year] = dateMatch[1].split('/');
        result.date = `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        break;
      }
    }
    
    // Home Depot specific item patterns
    const items: LineItem[] = [];
    const itemPattern = /^(.+?)\s+(\d+)\s*@\s*\$(\d+\.\d{2})\s+\$(\d+\.\d{2})$/;
    const simpleItemPattern = /^(.+?)\s+\$(\d+\.\d{2})$/;
    
    for (const line of lines) {
      // Skip known non-item lines
      if (line.match(/TAX|TOTAL|SUBTOTAL|CASH|CHANGE|VISA|MASTERCARD/i)) continue;
      
      let match = line.match(itemPattern);
      if (match) {
        const [, desc, qty, unitPrice, totalPrice] = match;
        items.push({
          id: crypto.randomUUID(),
          description: desc.trim(),
          quantity: parseInt(qty),
          unitPrice: parseFloat(unitPrice),
          totalPrice: parseFloat(totalPrice),
          category: 'Equipment & Software'
        });
      } else {
        match = line.match(simpleItemPattern);
        if (match && !line.match(/^\d{12}/)) { // Skip UPC codes
          const [, desc, price] = match;
          items.push({
            id: crypto.randomUUID(),
            description: desc.trim(),
            quantity: 1,
            unitPrice: parseFloat(price),
            totalPrice: parseFloat(price),
            category: 'Equipment & Software'
          });
        }
      }
    }
    
    if (items.length > 0) {
      result.lineItems = items;
    }
    
    return result;
  }

  private parseWalmartReceipt(lines: string[], fullText: string): {
    date?: string;
    amounts?: { total: number; subtotal: number; tax: number };
    lineItems?: LineItem[];
  } {
    const result: any = {};
    
    // Walmart specific patterns
    const items: LineItem[] = [];
    
    // Walmart often uses item codes followed by description
    const itemPattern = /^(\d{9,12})\s+(.+?)\s+\$(\d+\.\d{2})\s*([A-Z])?$/;
    const simplePattern = /^(.+?)\s+\$(\d+\.\d{2})\s*([A-Z])?$/;
    
    for (const line of lines) {
      if (line.match(/SUBTOTAL|TAX|TOTAL|CHANGE|CASH|DEBIT|CREDIT|EFT/i)) continue;
      
      let match = line.match(itemPattern);
      if (match) {
        const [, code, desc, price, taxCode] = match;
        items.push({
          id: crypto.randomUUID(),
          description: desc.trim(),
          quantity: 1,
          unitPrice: parseFloat(price),
          totalPrice: parseFloat(price),
          category: this.categorizeWalmartItem(desc)
        });
      } else {
        match = line.match(simplePattern);
        if (match && match[1].length > 5) { // Avoid short non-item lines
          const [, desc, price] = match;
          items.push({
            id: crypto.randomUUID(),
            description: desc.trim(),
            quantity: 1,
            unitPrice: parseFloat(price),
            totalPrice: parseFloat(price),
            category: this.categorizeWalmartItem(desc)
          });
        }
      }
    }
    
    if (items.length > 0) {
      result.lineItems = items;
    }
    
    return result;
  }

  private parseLowesReceipt(lines: string[], fullText: string): {
    date?: string;
    amounts?: { total: number; subtotal: number; tax: number };
    lineItems?: LineItem[];
  } {
    const result: any = {};
    
    // Lowe's specific patterns
    const items: LineItem[] = [];
    
    // Lowe's pattern: often has item number, description, then price
    const itemPattern = /^(\d{6,7})\s+(.+?)\s+\$(\d+\.\d{2})$/;
    const qtyPattern = /^\s*QTY\s+(\d+)\s*@\s*\$(\d+\.\d{2})$/;
    
    let lastItem: LineItem | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.match(/SUBTOTAL|TAX|TOTAL|PAYMENT|CHANGE/i)) continue;
      
      const itemMatch = line.match(itemPattern);
      if (itemMatch) {
        const [, itemNum, desc, price] = itemMatch;
        lastItem = {
          id: crypto.randomUUID(),
          description: desc.trim(),
          quantity: 1,
          unitPrice: parseFloat(price),
          totalPrice: parseFloat(price),
          category: 'Equipment & Software'
        };
        items.push(lastItem);
      } else if (lastItem && i > 0) {
        // Check for quantity line after item
        const qtyMatch = line.match(qtyPattern);
        if (qtyMatch) {
          const [, qty, unitPrice] = qtyMatch;
          lastItem.quantity = parseInt(qty);
          lastItem.unitPrice = parseFloat(unitPrice);
          lastItem.totalPrice = lastItem.quantity * lastItem.unitPrice;
        }
      }
    }
    
    if (items.length > 0) {
      result.lineItems = items;
    }
    
    return result;
  }

  private parseTargetReceipt(lines: string[], fullText: string): {
    date?: string;
    amounts?: { total: number; subtotal: number; tax: number };
    lineItems?: LineItem[];
  } {
    const result: any = {};
    
    // Target specific patterns
    const items: LineItem[] = [];
    
    // Target pattern: DPCI number, description, price
    const itemPattern = /^(\d{3}-\d{2}-\d{4})\s+(.+?)\s+\$(\d+\.\d{2})\s*([T])?$/;
    const simplePattern = /^(.+?)\s+\$(\d+\.\d{2})\s*([T])?$/;
    
    for (const line of lines) {
      if (line.match(/SUBTOTAL|TAX|TOTAL|REDcard|VISA|CASH/i)) continue;
      
      let match = line.match(itemPattern);
      if (match) {
        const [, dpci, desc, price, taxable] = match;
        items.push({
          id: crypto.randomUUID(),
          description: desc.trim(),
          quantity: 1,
          unitPrice: parseFloat(price),
          totalPrice: parseFloat(price),
          category: 'Other'
        });
      } else {
        match = line.match(simplePattern);
        if (match && match[1].length > 5) {
          const [, desc, price] = match;
          items.push({
            id: crypto.randomUUID(),
            description: desc.trim(),
            quantity: 1,
            unitPrice: parseFloat(price),
            totalPrice: parseFloat(price),
            category: 'Other'
          });
        }
      }
    }
    
    if (items.length > 0) {
      result.lineItems = items;
    }
    
    return result;
  }

  private categorizeWalmartItem(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('grocery') || desc.includes('food') || desc.includes('produce')) {
      return 'Other';
    }
    if (desc.includes('tool') || desc.includes('hardware') || desc.includes('paint')) {
      return 'Equipment & Software';
    }
    if (desc.includes('office') || desc.includes('paper') || desc.includes('pen')) {
      return 'Office Supplies';
    }
    return 'Other';
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}

// Singleton instance
let ocrInstance: OCRProcessor | null = null;

export function getOCRProcessor(): OCRProcessor {
  if (!ocrInstance) {
    ocrInstance = new OCRProcessor();
  }
  return ocrInstance;
}