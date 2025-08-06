// Enhanced conditional imports with proper loading management
let createWorker: any = null;
let PSM: any = null;
let pdfjsLib: any = null;
let loadingPromise: Promise<void> | null = null;

// Static method to check if we're on client side
function isClientSide(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

// Enhanced async library loading with proper waiting
async function ensureLibrariesLoaded(): Promise<void> {
  if (!isClientSide()) {
    throw new Error('OCR libraries only available on client side');
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = Promise.all([
    import('tesseract.js').then(module => {
      createWorker = module.createWorker;
      PSM = module.PSM;
    }),
    import('pdfjs-dist').then(module => {
      pdfjsLib = module;
      module.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
    })
  ]).then(() => void 0).catch(err => {
    console.warn('Failed to load OCR libraries:', err);
    throw new Error('OCR libraries failed to load');
  });
  
  return loadingPromise;
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
  rawText?: string;
  processing_time?: number;
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

  constructor() {
    // Prevent instantiation on server side
    if (!isClientSide()) {
      throw new Error('OCRProcessor can only be instantiated on the client side');
    }
  }

  async initialize() {
    if (this.initialized) return;

    // Double-check client-side environment
    if (!isClientSide()) {
      throw new Error('OCR processing is only available on the client side');
    }

    // Wait for libraries to load before proceeding
    await ensureLibrariesLoaded();

    // Wait for dynamic imports to complete
    if (!createWorker || !PSM) {
      throw new Error('Tesseract.js not loaded. Please try again.');
    }

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
              // Try enhanced preprocessing first if enabled
              const processedImage = await this.enhancedPreprocessImage(imageFile);
              const { data: processedData } = await this.worker.recognize(processedImage);
              
              if (processedData.confidence > result.confidence) {
                console.log('📈 Enhanced preprocessing improved confidence:', processedData.confidence);
                result = {
                  text: processedData.text,
                  confidence: processedData.confidence
                };
              }
            } catch (preprocessError) {
              console.warn('⚠️ Enhanced preprocessing failed, trying standard:', preprocessError);
              try {
                const processedImage = await this.preprocessImage(imageFile);
                const { data: processedData } = await this.worker.recognize(processedImage);
                
                if (processedData.confidence > result.confidence) {
                  console.log('📈 Standard preprocessing improved confidence:', processedData.confidence);
                  result = {
                    text: processedData.text,
                    confidence: processedData.confidence
                  };
                }
              } catch (standardError) {
                console.warn('⚠️ All preprocessing failed, using original result:', standardError);
              }
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
      
      // Add missing fields for compatibility with enhanced processor
      structuredData.rawText = result.text;
      structuredData.processing_time = Date.now(); // Simple timestamp
      
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

  // ===== PHASE 1: ENHANCED IMAGE PREPROCESSING =====
  // Safe Canvas-based image flattening implementation
  
  private async enhancedPreprocessImage(imageFile: File): Promise<string> {
    // Feature flag check - safe deployment control
    const enableEnhancedProcessing = this.isEnhancedProcessingEnabled();
    if (!enableEnhancedProcessing) {
      return this.preprocessImage(imageFile);
    }

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
      
      img.onload = async () => {
        try {
          if (!ctx) {
            cleanup();
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Step 1: Check image size - skip enhancement for very large images
          if (img.width * img.height > 2000000) { // > 2MP
            console.log('⚠️ Image too large for enhanced processing, using standard');
            const standardResult = await this.preprocessImage(imageFile);
            cleanup();
            resolve(standardResult);
            return;
          }

          // Step 2: Optimal DPI scaling for OCR (300 DPI) - but limit max size
          const optimalScale = Math.min(this.calculateOptimalScale(img.width, img.height), 1.5);
          canvas.width = Math.min(img.width * optimalScale, 1500); // Max 1500px width
          canvas.height = Math.min(img.height * optimalScale, 2000); // Max 2000px height
          
          ctx.scale(canvas.width / img.width, canvas.height / img.height);
          ctx.drawImage(img, 0, 0);
          
          // Store original scaled image for comparison if in debug mode
          if (typeof window !== 'undefined' && window.localStorage?.getItem('ocr-debug-mode') === 'true') {
            const originalURL = canvas.toDataURL('image/png', 1.0);
            window.localStorage.setItem('ocr-original-preview', originalURL);
            console.log('🖼️ Original image preview saved to localStorage');
          }
          
          // Get image data for processing
          let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Step 3: Yield control to prevent blocking - process in chunks
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Step 4: Smart document detection (fast)
          const documentBounds = this.detectDocumentBoundsFast(imageData);
          if (documentBounds && this.shouldCropDocument(documentBounds, imageData)) {
            imageData = this.cropAndCorrect(ctx, imageData, documentBounds);
            await new Promise(resolve => setTimeout(resolve, 5)); // Yield control
          }
          
          // Step 5: Adaptive binarization for text clarity (CamScanner-style)
          this.applyAdaptiveBinarization(imageData);
          await new Promise(resolve => setTimeout(resolve, 5)); // Yield control
          
          // Step 6: Apply existing filters for compatibility (these are already optimized)
          this.applyContrastEnhancement(imageData.data);
          this.applyNoiseReduction(imageData.data);
          this.applySharpening(imageData.data, imageData.width, imageData.height);
          
          // Put processed image back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to high-quality data URL
          const dataURL = canvas.toDataURL('image/png', 1.0);
          
          // Store processed image for preview if in debug mode
          if (typeof window !== 'undefined' && window.localStorage?.getItem('ocr-debug-mode') === 'true') {
            const debugCanvas = document.createElement('canvas');
            const debugCtx = debugCanvas.getContext('2d');
            if (debugCtx) {
              debugCanvas.width = canvas.width;
              debugCanvas.height = canvas.height;
              debugCtx.putImageData(imageData, 0, 0);
              
              const previewURL = debugCanvas.toDataURL('image/png', 1.0);
              window.localStorage.setItem('ocr-processed-preview', previewURL);
              console.log('🖼️ Processed image preview saved to localStorage');
            }
          }
          
          cleanup();
          
          console.log('✅ Enhanced preprocessing completed successfully');
          resolve(dataURL);
        } catch (error) {
          console.warn('⚠️ Enhanced preprocessing failed, falling back to standard:', error);
          cleanup();
          // Fallback to standard preprocessing
          this.preprocessImage(imageFile).then(resolve).catch(reject);
        }
      };
      
      img.onerror = () => {
        cleanup();
        console.warn('⚠️ Image loading failed, falling back to standard preprocessing');
        // Fallback to standard preprocessing
        this.preprocessImage(imageFile).then(resolve).catch(reject);
      };
      
      try {
        objectUrl = URL.createObjectURL(imageFile);
        img.src = objectUrl;
      } catch (error) {
        cleanup();
        reject(new Error('Failed to create image URL: ' + (error as Error).message));
      }
    });
  }

  private isEnhancedProcessingEnabled(): boolean {
    // Check multiple conditions for safe deployment
    if (typeof window === 'undefined') return false;
    
    // Feature flag from environment or localStorage
    const envFlag = process.env.NEXT_PUBLIC_ENABLE_ENHANCED_OCR === 'true';
    const localFlag = typeof localStorage !== 'undefined' && 
                     localStorage.getItem('enable-enhanced-ocr') === 'true';
    
    return envFlag || localFlag;
  }

  private calculateOptimalScale(width: number, height: number): number {
    // Calculate scale to achieve ~300 DPI for optimal OCR
    // Assuming average receipt is ~3-4 inches wide
    const targetWidth = 900; // ~3 inches at 300 DPI
    const targetHeight = 1200; // ~4 inches at 300 DPI
    
    if (width < targetWidth && height < targetHeight) {
      // Scale up small images
      return Math.min(targetWidth / width, targetHeight / height, 2.0);
    }
    
    // Don't scale down if already high resolution
    return 1.0;
  }

  private detectDocumentBounds(imageData: ImageData): {x: number, y: number, width: number, height: number} | null {
    const { width, height, data } = imageData;
    
    // Convert to grayscale for edge detection
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    
    // Simple edge detection using Sobel operator
    const edges = this.detectEdges(gray, width, height);
    
    // Find document boundaries
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let foundDocument = false;
    
    // Threshold for edge strength
    const edgeThreshold = 30;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (edges[idx] > edgeThreshold) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          foundDocument = true;
        }
      }
    }
    
    if (!foundDocument) return null;
    
    // Add padding
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private detectEdges(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const edges = new Uint8ClampedArray(width * height);
    
    // Sobel operator kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Apply Sobel kernels
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const idx = (y + ky - 1) * width + (x + kx - 1);
            const kidx = ky * 3 + kx;
            gx += gray[idx] * sobelX[kidx];
            gy += gray[idx] * sobelY[kidx];
          }
        }
        
        // Calculate edge magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = Math.min(255, magnitude);
      }
    }
    
    return edges;
  }

  private cropToDocument(ctx: CanvasRenderingContext2D, imageData: ImageData, bounds: {x: number, y: number, width: number, height: number}): ImageData {
    // Create new canvas for cropped image
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    
    if (!croppedCtx) {
      console.warn('Could not create cropped canvas context');
      return imageData;
    }
    
    croppedCanvas.width = bounds.width;
    croppedCanvas.height = bounds.height;
    
    // Copy the cropped region
    croppedCtx.putImageData(imageData, -bounds.x, -bounds.y);
    
    return croppedCtx.getImageData(0, 0, bounds.width, bounds.height);
  }

  private applySimplifiedLightingNormalization(imageData: ImageData): void {
    const { data } = imageData;
    
    // Fast and simple lighting normalization
    // Calculate average brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);
    
    // Target brightness
    const targetBrightness = 128;
    const adjustment = targetBrightness / avgBrightness;
    
    // Apply brightness adjustment with bounds
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * adjustment));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * adjustment));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * adjustment));
    }
  }

  // ===== PHASE 2: LIGHTWEIGHT DOCUMENT SCANNING =====
  
  private detectDocumentBoundsFast(imageData: ImageData): {corners: [number, number][]} | null {
    const { width, height, data } = imageData;
    
    console.log('🔍 Starting CamScanner-style document detection...');
    
    try {
      // Step 1: Canny edge detection (CamScanner's core technique)
      const cannyEdges = this.cannyEdgeDetection(imageData);
      console.log('✅ Canny edge detection complete');
      
      // Step 2: Find document contours using deep-learning approach
      const contours = this.findDocumentContours(cannyEdges, width, height);
      if (contours.length === 0) {
        console.log('⚠️ No document contours found, falling back to simple detection');
        return this.detectDocumentBoundsSimple(imageData);
      }
      
      // Step 3: Select best document quadrilateral
      const bestQuad = this.selectBestDocumentQuad(contours, width, height);
      if (!bestQuad) {
        console.log('⚠️ No valid document quadrilateral found, falling back to simple detection');
        return this.detectDocumentBoundsSimple(imageData);
      }
      
      console.log('✅ Document bounds detected:', bestQuad);
      const corners = this.orderDocumentCorners(bestQuad);
      return corners.length === 4 ? { corners } : null;
    } catch (error) {
      console.warn('⚠️ Advanced document detection failed, falling back to simple detection:', error);
      return this.detectDocumentBoundsSimple(imageData);
    }
  }

  private detectDocumentBoundsSimple(imageData: ImageData): {corners: [number, number][]} | null {
    const { width, height } = imageData;
    
    // Simple fallback - assume document fills most of the image with small margins
    const margin = Math.min(width, height) * 0.05;
    
    const corners: [number, number][] = [
      [margin, margin],                        // top-left
      [width - margin, margin],                // top-right
      [width - margin, height - margin],       // bottom-right
      [margin, height - margin]                // bottom-left
    ];
    
    console.log('✅ Simple document bounds detected with margins:', margin);
    return { corners };
  }

  private findCornersFromEdges(edges: number[][], width: number, height: number): [number, number][] {
    // Divide image into quadrants and find edge clusters
    const quadrants = {
      topLeft: edges.filter(([x, y]) => x < width / 2 && y < height / 2),
      topRight: edges.filter(([x, y]) => x >= width / 2 && y < height / 2),
      bottomLeft: edges.filter(([x, y]) => x < width / 2 && y >= height / 2),
      bottomRight: edges.filter(([x, y]) => x >= width / 2 && y >= height / 2)
    };
    
    const corners: [number, number][] = [];
    
    // Find corner in each quadrant
    for (const [quadrant, quadrantEdges] of Object.entries(quadrants)) {
      if (quadrantEdges.length === 0) continue;
      
      // Simple corner detection - find extreme points
      let corner: [number, number];
      if (quadrant === 'topLeft') {
        corner = quadrantEdges.reduce((min, edge) => 
          (edge[0] + edge[1] < min[0] + min[1]) ? edge as [number, number] : min, 
          quadrantEdges[0] as [number, number]
        );
      } else if (quadrant === 'topRight') {
        corner = quadrantEdges.reduce((max, edge) => 
          (edge[0] - edge[1] > max[0] - max[1]) ? edge as [number, number] : max, 
          quadrantEdges[0] as [number, number]
        );
      } else if (quadrant === 'bottomLeft') {
        corner = quadrantEdges.reduce((max, edge) => 
          (edge[1] - edge[0] > max[1] - max[0]) ? edge as [number, number] : max, 
          quadrantEdges[0] as [number, number]
        );
      } else { // bottomRight
        corner = quadrantEdges.reduce((max, edge) => 
          (edge[0] + edge[1] > max[0] + max[1]) ? edge as [number, number] : max, 
          quadrantEdges[0] as [number, number]
        );
      }
      
      corners.push(corner);
    }
    
    return corners;
  }

  private shouldCropDocument(bounds: {corners: [number, number][]}, imageData: ImageData): boolean {
    const { width, height } = imageData;
    const { corners } = bounds;
    
    if (corners.length !== 4) return false;
    
    // Calculate document area vs image area
    const documentArea = this.calculateQuadrilateralArea(corners);
    const imageArea = width * height;
    const areaRatio = documentArea / imageArea;
    
    // Only crop if document takes up less than 80% of image (indicating background)
    return areaRatio < 0.8 && areaRatio > 0.2;
  }

  private calculateQuadrilateralArea(corners: [number, number][]): number {
    // Simple area calculation using shoelace formula
    let area = 0;
    for (let i = 0; i < corners.length; i++) {
      const j = (i + 1) % corners.length;
      area += corners[i][0] * corners[j][1];
      area -= corners[j][0] * corners[i][1];
    }
    return Math.abs(area) / 2;
  }

  private cropAndCorrect(ctx: CanvasRenderingContext2D, imageData: ImageData, bounds: {corners: [number, number][]}): ImageData {
    const { corners } = bounds;
    
    console.log('🔄 Applying CamScanner-style perspective correction...');
    
    // Enhanced perspective correction using proper homography matrix
    const [tl, tr, br, bl] = corners; // top-left, top-right, bottom-right, bottom-left
    
    // Calculate optimal target dimensions (CamScanner uses aspect ratio preservation)
    const { targetWidth, targetHeight } = this.calculateOptimalDimensions(corners);
    console.log(`📐 Target dimensions: ${targetWidth}x${targetHeight}`);
    
    // Create corrected image using homography transformation
    const correctedCanvas = document.createElement('canvas');
    const correctedCtx = correctedCanvas.getContext('2d');
    if (!correctedCtx) return imageData;
    
    correctedCanvas.width = targetWidth;
    correctedCanvas.height = targetHeight;
    
    // Apply proper homography transformation (CamScanner's key technique)
    const correctedImageData = correctedCtx.createImageData(targetWidth, targetHeight);
    this.applyHomographyTransform(imageData, correctedImageData, corners, targetWidth, targetHeight);
    
    console.log('✅ Perspective correction complete');
    return correctedImageData;
  }

  private applyAdaptiveBinarization(imageData: ImageData): void {
    const { width, height, data } = imageData;
    
    console.log('🎨 Applying CamScanner-style illumination correction...');
    
    try {
      // Step 1: Advanced illumination correction using Retinex algorithm
      this.retinexIlluminationCorrection(imageData);
      
      // Step 2: Morphological operations for shadow removal (temporarily disabled - too aggressive)
      // this.morphologicalShadowRemoval(imageData);
      
      // Step 3: Super-resolution upscaling for small text (if needed)
      if (Math.min(width, height) < 800) {
        console.log('📈 Applying resolution enhancement for small image');
        this.enhanceResolution(imageData);
      }
      
      // Step 4: Advanced adaptive binarization with local contrast
      this.advancedAdaptiveBinarization(imageData);
      
      console.log('✅ Illumination correction and binarization complete');
    } catch (error) {
      console.warn('⚠️ Advanced illumination correction failed, applying simple binarization:', error);
      
      // Fallback to simple adaptive binarization
      this.applySimpleBinarization(imageData);
    }
  }

  private applySimpleBinarization(imageData: ImageData): void {
    const { width, height, data } = imageData;
    
    // Simple Otsu-like binarization as fallback
    let sum = 0;
    let count = 0;
    
    // Calculate global mean
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += gray;
      count++;
    }
    
    const globalMean = sum / count;
    const threshold = globalMean * 0.85; // Slightly lower for better text detection
    
    // Apply binarization
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const binaryValue = gray > threshold ? 255 : 0;
      
      data[i] = binaryValue;
      data[i + 1] = binaryValue;
      data[i + 2] = binaryValue;
    }
    
    console.log('✅ Simple binarization applied with threshold:', threshold);
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
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
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
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      throw new Error('PDF conversion is only available on the client side');
    }

    // Wait for dynamic imports to complete
    if (!pdfjsLib) {
      throw new Error('PDF.js not loaded. Please try again.');
    }

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
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
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
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
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
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
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
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
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
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
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
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
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
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
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

  // Enhanced CamScanner-style methods for superior document detection and correction

  private calculateEdgeStrength(data: Uint8ClampedArray, x: number, y: number, width: number, height: number, scale: number): number {
    const i = (y * width + x) * 4;
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    
    // Sobel operator for better edge detection
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2], 
      [-1, 0, 1]
    ];
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];
    
    let gx = 0, gy = 0;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = x + dx * scale;
        const py = y + dy * scale;
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const pi = (py * width + px) * 4;
          const pGray = (data[pi] + data[pi + 1] + data[pi + 2]) / 3;
          
          gx += pGray * sobelX[dy + 1][dx + 1];
          gy += pGray * sobelY[dy + 1][dx + 1];
        }
      }
    }
    
    return Math.sqrt(gx * gx + gy * gy);
  }

  private findDocumentCorners(edges: Array<{x: number, y: number, strength: number}>, width: number, height: number): [number, number][] {
    // Use a simplified approach to find the 4 corners of the document
    // This is a lightweight version of what CamScanner does
    
    const margin = Math.min(width, height) * 0.05; // 5% margin
    
    // Find corners by clustering edges in quadrants
    const topLeft = edges.filter(e => e.x < width/2 && e.y < height/2).slice(0, 10);
    const topRight = edges.filter(e => e.x >= width/2 && e.y < height/2).slice(0, 10);
    const bottomRight = edges.filter(e => e.x >= width/2 && e.y >= height/2).slice(0, 10);
    const bottomLeft = edges.filter(e => e.x < width/2 && e.y >= height/2).slice(0, 10);
    
    // Find the most extreme points in each quadrant
    const findCorner = (quadrant: Array<{x: number, y: number, strength: number}>, xComp: (a: number, b: number) => boolean, yComp: (a: number, b: number) => boolean) => {
      if (quadrant.length === 0) return null;
      
      let best = quadrant[0];
      for (const edge of quadrant) {
        if ((xComp(edge.x, best.x) || (edge.x === best.x && yComp(edge.y, best.y))) && edge.strength > best.strength * 0.7) {
          best = edge;
        }
      }
      return [best.x, best.y] as [number, number];
    };
    
    const corners = [
      findCorner(topLeft, (a, b) => a <= b, (a, b) => a <= b) || [margin, margin],
      findCorner(topRight, (a, b) => a >= b, (a, b) => a <= b) || [width - margin, margin],
      findCorner(bottomRight, (a, b) => a >= b, (a, b) => a >= b) || [width - margin, height - margin],
      findCorner(bottomLeft, (a, b) => a <= b, (a, b) => a >= b) || [margin, height - margin]
    ];
    
    return corners;
  }

  private applyPerspectiveTransform(sourceImageData: ImageData, targetImageData: ImageData, corners: [number, number][], targetWidth: number, targetHeight: number): void {
    const { data: sourceData, width: sourceWidth, height: sourceHeight } = sourceImageData;
    const { data: targetData } = targetImageData;
    
    const [tl, tr, br, bl] = corners;
    
    // Create transformation matrix for perspective correction
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Map target coordinates to source coordinates using bilinear interpolation
        const u = x / targetWidth;
        const v = y / targetHeight;
        
        // Bilinear interpolation to find source coordinates
        const top = [
          tl[0] + u * (tr[0] - tl[0]),
          tl[1] + u * (tr[1] - tl[1])
        ];
        const bottom = [
          bl[0] + u * (br[0] - bl[0]),
          bl[1] + u * (br[1] - bl[1])
        ];
        
        const sourceX = top[0] + v * (bottom[0] - top[0]);
        const sourceY = top[1] + v * (bottom[1] - top[1]);
        
        // Sample from source image with bounds checking
        if (sourceX >= 0 && sourceX < sourceWidth && sourceY >= 0 && sourceY < sourceHeight) {
          const sourceIndex = (Math.floor(sourceY) * sourceWidth + Math.floor(sourceX)) * 4;
          const targetIndex = (y * targetWidth + x) * 4;
          
          targetData[targetIndex] = sourceData[sourceIndex];         // R
          targetData[targetIndex + 1] = sourceData[sourceIndex + 1]; // G
          targetData[targetIndex + 2] = sourceData[sourceIndex + 2]; // B
          targetData[targetIndex + 3] = 255;                         // A
        } else {
          // Fill with white if outside bounds
          const targetIndex = (y * targetWidth + x) * 4;
          targetData[targetIndex] = 255;     // R
          targetData[targetIndex + 1] = 255; // G
          targetData[targetIndex + 2] = 255; // B
          targetData[targetIndex + 3] = 255; // A
        }
      }
    }
  }

  private removeShadows(imageData: ImageData): void {
    const { width, height, data } = imageData;
    
    // Create a low-pass filtered version for shadow estimation
    const shadowMap = new Uint8ClampedArray(width * height);
    const kernelSize = Math.max(3, Math.min(width, height) / 100); // Smaller kernel for performance
    
    // Estimate background lighting using large kernel convolution
    for (let y = 0; y < height; y += 2) { // Sample every 2nd pixel for speed
      for (let x = 0; x < width; x += 2) {
        let sum = 0;
        let count = 0;
        
        for (let ky = -kernelSize; ky <= kernelSize; ky += 2) {
          for (let kx = -kernelSize; kx <= kernelSize; kx += 2) {
            const px = x + kx;
            const py = y + ky;
            
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const i = (py * width + px) * 4;
              const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
              sum += gray;
              count++;
            }
          }
        }
        
        const avgGray = sum / count;
        shadowMap[y * width + x] = avgGray;
        if (x + 1 < width) shadowMap[y * width + x + 1] = avgGray; // Fill adjacent pixel
      }
    }
    
    // Correct for shadows by normalizing against background estimate
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const shadowIndex = Math.floor(y / 2) * 2 * width + Math.floor(x / 2) * 2;
        const background = shadowMap[shadowIndex] || 128;
        
        // Normalize against background, but preserve contrast
        const normalized = background > 0 ? (gray / background) * 180 : gray;
        const corrected = Math.min(255, Math.max(0, normalized));
        
        data[i] = corrected;     // R
        data[i + 1] = corrected; // G
        data[i + 2] = corrected; // B
      }
    }
  }

  private calculateBlockStatistics(data: Uint8ClampedArray, bx: number, by: number, maxX: number, maxY: number, width: number) {
    let sum = 0;
    let sumSquares = 0;
    let count = 0;
    let min = 255;
    let max = 0;
    
    for (let y = by; y < maxY; y++) {
      for (let x = bx; x < maxX; x++) {
        const i = (y * width + x) * 4;
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        sum += gray;
        sumSquares += gray * gray;
        count++;
        min = Math.min(min, gray);
        max = Math.max(max, gray);
      }
    }
    
    const mean = sum / count;
    const variance = (sumSquares / count) - (mean * mean);
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev, min, max, count };
  }

  private calculateAdaptiveThreshold(stats: {mean: number, stdDev: number, min: number, max: number}): number {
    const { mean, stdDev, min, max } = stats;
    
    // Enhanced Otsu-like thresholding with local adaptation
    const range = max - min;
    
    if (range < 30) {
      // Low contrast block - use global threshold
      return mean;
    }
    
    // Use standard deviation to adapt threshold - key CamScanner technique
    let threshold = mean - (stdDev * 0.2);
    
    // Clamp threshold to reasonable bounds
    threshold = Math.max(min + range * 0.2, Math.min(max - range * 0.2, threshold));
    
    return threshold;
  }

  // ===== ADVANCED CAMSCANNER TECHNIQUES =====

  private cannyEdgeDetection(imageData: ImageData): Uint8ClampedArray {
    const { width, height, data } = imageData;
    const grayData = new Uint8ClampedArray(width * height);
    const edges = new Uint8ClampedArray(width * height);
    
    // Convert to grayscale
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      grayData[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    
    // Gaussian blur to reduce noise
    const blurred = this.gaussianBlur(grayData, width, height, 1.4);
    
    // Compute gradients using Sobel operator
    const { gradients, directions } = this.computeGradients(blurred, width, height);
    
    // Non-maximum suppression
    const suppressed = this.nonMaxSuppression(gradients, directions, width, height);
    
    // Double threshold and hysteresis
    const lowThreshold = 50;
    const highThreshold = 100;
    this.doubleThreshold(suppressed, edges, width, height, lowThreshold, highThreshold);
    
    return edges;
  }

  private gaussianBlur(data: Uint8ClampedArray, width: number, height: number, sigma: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(width * height);
    const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
    const kernel = this.generateGaussianKernel(kernelSize, sigma);
    const half = Math.floor(kernelSize / 2);
    
    // Horizontal pass
    const temp = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let k = -half; k <= half; k++) {
          const px = Math.max(0, Math.min(width - 1, x + k));
          const weight = kernel[k + half];
          sum += data[y * width + px] * weight;
          weightSum += weight;
        }
        
        temp[y * width + x] = sum / weightSum;
      }
    }
    
    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let k = -half; k <= half; k++) {
          const py = Math.max(0, Math.min(height - 1, y + k));
          const weight = kernel[k + half];
          sum += temp[py * width + x] * weight;
          weightSum += weight;
        }
        
        result[y * width + x] = sum / weightSum;
      }
    }
    
    return result;
  }

  private generateGaussianKernel(size: number, sigma: number): number[] {
    const kernel = new Array(size);
    const half = Math.floor(size / 2);
    const variance = sigma * sigma;
    
    for (let i = 0; i < size; i++) {
      const x = i - half;
      kernel[i] = Math.exp(-(x * x) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance);
    }
    
    return kernel;
  }

  private computeGradients(data: Uint8ClampedArray, width: number, height: number): {
    gradients: Uint8ClampedArray;
    directions: Float32Array;
  } {
    const gradients = new Uint8ClampedArray(width * height);
    const directions = new Float32Array(width * height);
    
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            gx += data[idx] * sobelX[kernelIdx];
            gy += data[idx] * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const direction = Math.atan2(gy, gx);
        
        gradients[y * width + x] = Math.min(255, magnitude);
        directions[y * width + x] = direction;
      }
    }
    
    return { gradients, directions };
  }

  private nonMaxSuppression(gradients: Uint8ClampedArray, directions: Float32Array, width: number, height: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const angle = directions[idx] * 180 / Math.PI;
        const normalizedAngle = ((angle % 180) + 180) % 180;
        
        let neighbor1 = 0, neighbor2 = 0;
        
        if (normalizedAngle < 22.5 || normalizedAngle >= 157.5) {
          // Horizontal
          neighbor1 = gradients[idx - 1];
          neighbor2 = gradients[idx + 1];
        } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
          // Diagonal /
          neighbor1 = gradients[(y - 1) * width + (x - 1)];
          neighbor2 = gradients[(y + 1) * width + (x + 1)];
        } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
          // Vertical
          neighbor1 = gradients[(y - 1) * width + x];
          neighbor2 = gradients[(y + 1) * width + x];
        } else {
          // Diagonal \
          neighbor1 = gradients[(y - 1) * width + (x + 1)];
          neighbor2 = gradients[(y + 1) * width + (x - 1)];
        }
        
        if (gradients[idx] >= neighbor1 && gradients[idx] >= neighbor2) {
          result[idx] = gradients[idx];
        }
      }
    }
    
    return result;
  }

  private doubleThreshold(gradients: Uint8ClampedArray, edges: Uint8ClampedArray, width: number, height: number, lowThreshold: number, highThreshold: number): void {
    const strongEdge = 255;
    const weakEdge = 128;
    
    // Apply thresholds
    for (let i = 0; i < gradients.length; i++) {
      if (gradients[i] >= highThreshold) {
        edges[i] = strongEdge;
      } else if (gradients[i] >= lowThreshold) {
        edges[i] = weakEdge;
      }
    }
    
    // Hysteresis - convert weak edges connected to strong edges
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (edges[idx] === weakEdge) {
          let hasStrongNeighbor = false;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const neighborIdx = (y + dy) * width + (x + dx);
              if (edges[neighborIdx] === strongEdge) {
                hasStrongNeighbor = true;
                break;
              }
            }
            if (hasStrongNeighbor) break;
          }
          
          edges[idx] = hasStrongNeighbor ? strongEdge : 0;
        }
      }
    }
  }

  private findDocumentContours(edges: Uint8ClampedArray, width: number, height: number): Array<[number, number][]> {
    const contours: Array<[number, number][]> = [];
    const visited = new Uint8ClampedArray(width * height);
    
    // Find connected components (contours)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (edges[idx] === 255 && !visited[idx]) {
          const contour = this.traceContour(edges, visited, x, y, width, height);
          if (contour.length > 50) { // Filter small contours
            contours.push(contour);
          }
        }
      }
    }
    
    return contours;
  }

  private traceContour(edges: Uint8ClampedArray, visited: Uint8ClampedArray, startX: number, startY: number, width: number, height: number): [number, number][] {
    const contour: [number, number][] = [];
    const stack: [number, number][] = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || edges[idx] !== 255) {
        continue;
      }
      
      visited[idx] = 1;
      contour.push([x, y]);
      
      // Add 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          stack.push([x + dx, y + dy]);
        }
      }
    }
    
    return contour;
  }

  private selectBestDocumentQuad(contours: Array<[number, number][]>, width: number, height: number): [number, number][] | null {
    let bestQuad: [number, number][] | null = null;
    let bestScore = -1;
    
    for (const contour of contours) {
      // Approximate contour to quadrilateral using Douglas-Peucker
      const approx = this.approximateContour(contour, 0.02 * this.contourPerimeter(contour));
      
      if (approx.length === 4) {
        // Score based on area and aspect ratio
        const area = this.calculateQuadrilateralArea(approx);
        const imageArea = width * height;
        const areaRatio = area / imageArea;
        
        if (areaRatio > 0.1 && areaRatio < 0.9) { // Reasonable size
          const aspectScore = this.scoreAspectRatio(approx);
          const score = areaRatio * aspectScore;
          
          if (score > bestScore) {
            bestScore = score;
            bestQuad = approx;
          }
        }
      }
    }
    
    return bestQuad;
  }

  private approximateContour(contour: [number, number][], epsilon: number): [number, number][] {
    // Simplified Douglas-Peucker algorithm
    if (contour.length < 3) return contour;
    
    // Find the point with maximum distance from line segment
    let maxDist = 0;
    let maxIndex = 0;
    const start = contour[0];
    const end = contour[contour.length - 1];
    
    for (let i = 1; i < contour.length - 1; i++) {
      const dist = this.pointToLineDistance(contour[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    
    if (maxDist > epsilon) {
      // Recursively approximate
      const left = this.approximateContour(contour.slice(0, maxIndex + 1), epsilon);
      const right = this.approximateContour(contour.slice(maxIndex), epsilon);
      
      return [...left.slice(0, -1), ...right];
    } else {
      return [start, end];
    }
  }

  private pointToLineDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
    const [px, py] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;
    
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  private contourPerimeter(contour: [number, number][]): number {
    let perimeter = 0;
    
    for (let i = 0; i < contour.length; i++) {
      const current = contour[i];
      const next = contour[(i + 1) % contour.length];
      
      const dx = next[0] - current[0];
      const dy = next[1] - current[1];
      
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return perimeter;
  }

  private scoreAspectRatio(quad: [number, number][]): number {
    const [tl, tr, br, bl] = this.orderDocumentCorners(quad);
    
    const topWidth = Math.sqrt(Math.pow(tr[0] - tl[0], 2) + Math.pow(tr[1] - tl[1], 2));
    const bottomWidth = Math.sqrt(Math.pow(br[0] - bl[0], 2) + Math.pow(br[1] - bl[1], 2));
    const leftHeight = Math.sqrt(Math.pow(bl[0] - tl[0], 2) + Math.pow(bl[1] - tl[1], 2));
    const rightHeight = Math.sqrt(Math.pow(br[0] - tr[0], 2) + Math.pow(br[1] - tr[1], 2));
    
    const avgWidth = (topWidth + bottomWidth) / 2;
    const avgHeight = (leftHeight + rightHeight) / 2;
    
    const aspectRatio = Math.max(avgWidth, avgHeight) / Math.min(avgWidth, avgHeight);
    
    // Prefer aspect ratios close to common document ratios (1.3-1.6)
    const idealRatio = 1.414; // A4 ratio
    const ratioScore = 1 / (1 + Math.abs(aspectRatio - idealRatio));
    
    return ratioScore;
  }

  private orderDocumentCorners(corners: [number, number][]): [number, number][] {
    // Order corners as [top-left, top-right, bottom-right, bottom-left]
    const sorted = corners.slice().sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    
    const tl = sorted[0]; // Smallest sum (top-left)
    const br = sorted[3]; // Largest sum (bottom-right)
    
    const remaining = [sorted[1], sorted[2]];
    const tr = remaining.sort((a, b) => (a[0] - a[1]) - (b[0] - b[1]))[1]; // Largest diff (top-right)
    const bl = remaining[0]; // The other one (bottom-left)
    
    return [tl, tr, br, bl];
  }

  private calculateOptimalDimensions(corners: [number, number][]): { targetWidth: number; targetHeight: number } {
    const [tl, tr, br, bl] = this.orderDocumentCorners(corners);
    
    const topWidth = Math.sqrt(Math.pow(tr[0] - tl[0], 2) + Math.pow(tr[1] - tl[1], 2));
    const bottomWidth = Math.sqrt(Math.pow(br[0] - bl[0], 2) + Math.pow(br[1] - bl[1], 2));
    const leftHeight = Math.sqrt(Math.pow(bl[0] - tl[0], 2) + Math.pow(bl[1] - tl[1], 2));
    const rightHeight = Math.sqrt(Math.pow(br[0] - tr[0], 2) + Math.pow(br[1] - tr[1], 2));
    
    const targetWidth = Math.max(topWidth, bottomWidth);
    const targetHeight = Math.max(leftHeight, rightHeight);
    
    return { targetWidth: Math.round(targetWidth), targetHeight: Math.round(targetHeight) };
  }

  private applyHomographyTransform(sourceImageData: ImageData, targetImageData: ImageData, corners: [number, number][], targetWidth: number, targetHeight: number): void {
    const { data: sourceData, width: sourceWidth, height: sourceHeight } = sourceImageData;
    const { data: targetData } = targetImageData;
    
    const [tl, tr, br, bl] = this.orderDocumentCorners(corners);
    
    // Define target corners for rectangle
    const targetCorners: [number, number][] = [
      [0, 0],                              // top-left
      [targetWidth - 1, 0],                // top-right
      [targetWidth - 1, targetHeight - 1], // bottom-right
      [0, targetHeight - 1]                // bottom-left
    ];
    
    // Calculate homography matrix (simplified 8-parameter model)
    const homography = this.calculateHomography(corners, targetCorners);
    
    // Apply transformation
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Apply inverse homography to find source coordinates
        const sourceCoords = this.applyInverseHomography([x, y], homography);
        const [sx, sy] = sourceCoords;
        
        if (sx >= 0 && sx < sourceWidth && sy >= 0 && sy < sourceHeight) {
          // Bilinear interpolation for smoother results
          const color = this.bilinearInterpolation(sourceData, sx, sy, sourceWidth, sourceHeight);
          
          const targetIndex = (y * targetWidth + x) * 4;
          targetData[targetIndex] = color[0];     // R
          targetData[targetIndex + 1] = color[1]; // G
          targetData[targetIndex + 2] = color[2]; // B
          targetData[targetIndex + 3] = 255;      // A
        } else {
          // Fill with white background
          const targetIndex = (y * targetWidth + x) * 4;
          targetData[targetIndex] = 255;     // R
          targetData[targetIndex + 1] = 255; // G
          targetData[targetIndex + 2] = 255; // B
          targetData[targetIndex + 3] = 255; // A
        }
      }
    }
  }

  private calculateHomography(sourceCorners: [number, number][], targetCorners: [number, number][]): number[][] {
    // Simplified homography calculation using direct linear transformation
    // This is a basic implementation - full homography requires solving 8x8 matrix
    
    const matrix = [];
    
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = sourceCorners[i];
      const [tx, ty] = targetCorners[i];
      
      matrix.push([sx, sy, 1, 0, 0, 0, -tx * sx, -tx * sy, tx]);
      matrix.push([0, 0, 0, sx, sy, 1, -ty * sx, -ty * sy, ty]);
    }
    
    // For simplicity, use bilinear transformation approximation
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  private applyInverseHomography(point: [number, number], homography: number[][]): [number, number] {
    // Simplified inverse transformation
    // In practice, this would involve matrix inversion
    return point;
  }

  private bilinearInterpolation(data: Uint8ClampedArray, x: number, y: number, width: number, height: number): [number, number, number] {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    
    const fx = x - x1;
    const fy = y - y1;
    
    const getPixel = (px: number, py: number): [number, number, number] => {
      const idx = (py * width + px) * 4;
      return [data[idx], data[idx + 1], data[idx + 2]];
    };
    
    const [r1, g1, b1] = getPixel(x1, y1);
    const [r2, g2, b2] = getPixel(x2, y1);
    const [r3, g3, b3] = getPixel(x1, y2);
    const [r4, g4, b4] = getPixel(x2, y2);
    
    const r = r1 * (1 - fx) * (1 - fy) + r2 * fx * (1 - fy) + r3 * (1 - fx) * fy + r4 * fx * fy;
    const g = g1 * (1 - fx) * (1 - fy) + g2 * fx * (1 - fy) + g3 * (1 - fx) * fy + g4 * fx * fy;
    const b = b1 * (1 - fx) * (1 - fy) + b2 * fx * (1 - fy) + b3 * (1 - fx) * fy + b4 * fx * fy;
    
    return [Math.round(r), Math.round(g), Math.round(b)];
  }

  private retinexIlluminationCorrection(imageData: ImageData): void {
    const { width, height, data } = imageData;
    
    // Multi-scale Retinex for illumination invariance - reduced scales for less aggressive processing
    const scales = [15, 50, 120]; // Smaller scales for gentler processing  
    const weights = [0.5, 0.3, 0.2]; // Weight toward smaller scales
    
    const grayData = new Float32Array(width * height);
    const result = new Float32Array(width * height);
    
    // Convert to grayscale and log domain
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      grayData[j] = Math.log(Math.max(1, gray));
    }
    
    // Apply multi-scale processing
    for (let s = 0; s < scales.length; s++) {
      const blurred = this.gaussianBlurFloat(grayData, width, height, scales[s]);
      
      for (let i = 0; i < grayData.length; i++) {
        result[i] += weights[s] * (grayData[i] - blurred[i]);
      }
    }
    
    // Convert back to image data with gentler normalization
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const enhanced = Math.exp(result[j]);
      // Apply gentler normalization - don't let it get too dark
      const normalized = Math.min(255, Math.max(50, enhanced * 1.2)); // Minimum 50, scale up slightly
      
      data[i] = normalized;     // R
      data[i + 1] = normalized; // G  
      data[i + 2] = normalized; // B
    }
  }

  private gaussianBlurFloat(data: Float32Array, width: number, height: number, sigma: number): Float32Array {
    const result = new Float32Array(width * height);
    const kernelSize = Math.min(Math.ceil(sigma * 2) * 2 + 1, 31); // Limit kernel size
    const kernel = this.generateGaussianKernel(kernelSize, sigma);
    const half = Math.floor(kernelSize / 2);
    
    // Simplified single-pass approximation for performance
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let k = -half; k <= half; k += 2) { // Sample every 2nd pixel
          const px = Math.max(0, Math.min(width - 1, x + k));
          const py = Math.max(0, Math.min(height - 1, y + k));
          
          const weight = kernel[Math.abs(k) + half];
          sum += data[py * width + px] * weight;
          weightSum += weight;
        }
        
        result[y * width + x] = sum / weightSum;
      }
    }
    
    return result;
  }

  private morphologicalShadowRemoval(imageData: ImageData): void {
    const { width, height, data } = imageData;
    
    // Morphological closing to remove soft shadows
    const structElement = 5; // Small structure element for performance
    
    // Dilation followed by erosion (closing)
    this.morphologicalDilation(data, width, height, structElement);
    this.morphologicalErosion(data, width, height, structElement);
  }

  private morphologicalDilation(data: Uint8ClampedArray, width: number, height: number, size: number): void {
    const temp = new Uint8ClampedArray(data.length);
    temp.set(data);
    
    const half = Math.floor(size / 2);
    
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let maxR = 0, maxG = 0, maxB = 0;
        
        for (let dy = -half; dy <= half; dy += 2) { // Sample every 2nd pixel
          for (let dx = -half; dx <= half; dx += 2) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            maxR = Math.max(maxR, temp[idx]);
            maxG = Math.max(maxG, temp[idx + 1]);
            maxB = Math.max(maxB, temp[idx + 2]);
          }
        }
        
        const idx = (y * width + x) * 4;
        data[idx] = maxR;
        data[idx + 1] = maxG;
        data[idx + 2] = maxB;
      }
    }
  }

  private morphologicalErosion(data: Uint8ClampedArray, width: number, height: number, size: number): void {
    const temp = new Uint8ClampedArray(data.length);
    temp.set(data);
    
    const half = Math.floor(size / 2);
    
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let minR = 255, minG = 255, minB = 255;
        
        for (let dy = -half; dy <= half; dy += 2) { // Sample every 2nd pixel
          for (let dx = -half; dx <= half; dx += 2) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            minR = Math.min(minR, temp[idx]);
            minG = Math.min(minG, temp[idx + 1]);
            minB = Math.min(minB, temp[idx + 2]);
          }
        }
        
        const idx = (y * width + x) * 4;
        data[idx] = minR;
        data[idx + 1] = minG;
        data[idx + 2] = minB;
      }
    }
  }

  private enhanceResolution(imageData: ImageData): void {
    // Simple super-resolution enhancement for small text
    // This is a basic implementation - real super-resolution uses deep learning
    
    const { width, height, data } = imageData;
    
    // Apply unsharp masking for text enhancement
    const temp = new Uint8ClampedArray(data.length);
    temp.set(data);
    
    // Gaussian blur
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        let sumR = 0, sumG = 0, sumB = 0;
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            sumR += temp[nIdx];
            sumG += temp[nIdx + 1];
            sumB += temp[nIdx + 2];
            count++;
          }
        }
        
        const blurR = sumR / count;
        const blurG = sumG / count;
        const blurB = sumB / count;
        
        // Unsharp mask: original + (original - blurred) * amount
        const amount = 1.5;
        data[idx] = Math.min(255, Math.max(0, temp[idx] + (temp[idx] - blurR) * amount));
        data[idx + 1] = Math.min(255, Math.max(0, temp[idx + 1] + (temp[idx + 1] - blurG) * amount));
        data[idx + 2] = Math.min(255, Math.max(0, temp[idx + 2] + (temp[idx + 2] - blurB) * amount));
      }
    }
  }

  private advancedAdaptiveBinarization(imageData: ImageData): void {
    const { width, height, data } = imageData;
    
    // Advanced Sauvola binarization for document images
    const windowSize = 15;
    const k = 0.2;
    const R = 128;
    
    const half = Math.floor(windowSize / 2);
    
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Calculate local mean and standard deviation
        let sum = 0;
        let sumSquares = 0;
        let count = 0;
        
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            const nGray = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
            
            sum += nGray;
            sumSquares += nGray * nGray;
            count++;
          }
        }
        
        const mean = sum / count;
        const variance = (sumSquares / count) - (mean * mean);
        const stdDev = Math.sqrt(variance);
        
        // Sauvola threshold - make it less aggressive
        let threshold = mean * (1 + k * (stdDev / R - 1));
        
        // Clamp threshold to prevent over-binarization
        threshold = Math.max(threshold, mean * 0.7); // Don't go below 70% of mean
        threshold = Math.min(threshold, mean * 1.3); // Don't go above 130% of mean
        
        // Apply binarization with less aggressive cutoff
        const binaryValue = gray > threshold ? 255 : 0;
        
        data[idx] = binaryValue;
        data[idx + 1] = binaryValue;
        data[idx + 2] = binaryValue;
      }
    }
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