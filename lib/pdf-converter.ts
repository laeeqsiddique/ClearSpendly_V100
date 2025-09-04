// Production-ready PDF to Image conversion
// Uses multiple approaches for reliability

export interface PDFConversionResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
  method?: string;
}

export async function convertPdfToImage(pdfUrl: string): Promise<PDFConversionResult> {
  console.log('🔄 Server-side PDF conversion - this should rarely be used now');
  
  // Since we're now doing client-side conversion, this should only be a fallback
  // Keep it simple and just return an error suggesting client-side conversion
  return {
    success: false,
    error: 'PDF conversion should be handled on client-side. If you see this error, there was an issue with client-side PDF processing.',
    method: 'server-fallback'
  };
}

async function convertWithPdfLib(pdfUrl: string): Promise<PDFConversionResult> {
  try {
    // Import libraries dynamically to avoid build issues
    const { PDFDocument } = await import('pdf-lib');
    const { createCanvas } = await import('canvas');
    
    console.log('📄 Using PDF-lib for conversion...');
    
    // Download PDF
    const response = await fetch(pdfUrl);
    const pdfBuffer = await response.arrayBuffer();
    
    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    if (pages.length === 0) {
      throw new Error('PDF has no pages');
    }
    
    // Get first page (receipts are usually single page)
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // This is a simplified approach - in production you might want to use
    // pdf2pic, pdf-poppler, or similar libraries for better rendering
    
    // For now, return a temporary solution
    throw new Error('PDF-lib conversion needs additional setup for image rendering');
    
  } catch (error) {
    throw new Error(`PDF-lib conversion failed: ${error.message}`);
  }
}

async function convertWithExternalService(pdfUrl: string): Promise<PDFConversionResult> {
  // Option 1: CloudConvert API (has free tier)
  const cloudConvertKey = process.env.CLOUDCONVERT_API_KEY;
  
  if (cloudConvertKey) {
    return await convertWithCloudConvert(pdfUrl, cloudConvertKey);
  }
  
  // Option 2: ConvertAPI (has free tier)
  const convertApiSecret = process.env.CONVERTAPI_SECRET;
  
  if (convertApiSecret) {
    return await convertWithConvertAPI(pdfUrl, convertApiSecret);
  }
  
  throw new Error('No external conversion service configured');
}

async function convertWithCloudConvert(pdfUrl: string, apiKey: string): Promise<PDFConversionResult> {
  console.log('☁️ Using CloudConvert for PDF conversion...');
  
  try {
    // CloudConvert API integration
    const CloudConvert = (await import('cloudconvert')).default;
    const cloudConvert = new CloudConvert(apiKey);
    
    const job = await cloudConvert.jobs.create({
      tasks: {
        'import-pdf': {
          operation: 'import/url',
          url: pdfUrl
        },
        'convert-to-png': {
          operation: 'convert',
          input: 'import-pdf',
          output_format: 'png',
          engine: 'graphicsmagick',
          quality: 100
        },
        'export-png': {
          operation: 'export/url',
          input: 'convert-to-png'
        }
      }
    });
    
    // Wait for completion
    const completedJob = await cloudConvert.jobs.wait(job.id);
    const exportTask = completedJob.tasks.filter(task => task.name === 'export-png')[0];
    
    if (exportTask.result?.files?.[0]?.url) {
      // Download the converted image
      const imageResponse = await fetch(exportTask.result.files[0].url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      
      return {
        success: true,
        imageBase64: `data:image/png;base64,${imageBase64}`,
        method: 'cloudconvert'
      };
    }
    
    throw new Error('CloudConvert did not return image URL');
    
  } catch (error) {
    throw new Error(`CloudConvert conversion failed: ${error.message}`);
  }
}

async function convertWithConvertAPI(pdfUrl: string, secret: string): Promise<PDFConversionResult> {
  console.log('🔧 Using ConvertAPI for PDF conversion...');
  
  try {
    const response = await fetch('https://v2.convertapi.com/convert/pdf/to/png', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Parameters: [
          {
            Name: 'File',
            FileValue: {
              Url: pdfUrl
            }
          },
          {
            Name: 'ImageResolution',
            Value: '150'
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`ConvertAPI error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.Files && result.Files[0]) {
      const imageUrl = result.Files[0].Url;
      
      // Download the converted image
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      
      return {
        success: true,
        imageBase64: `data:image/png;base64,${imageBase64}`,
        method: 'convertapi'
      };
    }
    
    throw new Error('ConvertAPI did not return files');
    
  } catch (error) {
    throw new Error(`ConvertAPI conversion failed: ${error.message}`);
  }
}

// Simple fallback that extracts text using pdf-parse (no images)
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse/lib/pdf-parse.js');
    
    const response = await fetch(pdfUrl);
    const pdfBuffer = await response.arrayBuffer();
    
    const data = await pdfParse.default(Buffer.from(pdfBuffer));
    return data.text;
    
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw error;
  }
}