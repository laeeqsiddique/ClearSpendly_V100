// Enhanced Client-Side Image Preprocessing for Receipt OCR
// CamScanner-level image enhancement with cost optimization

export interface ImageQualityMetrics {
  sharpness: number;
  contrast: number;
  brightness: number;
  textDensity: number;
  overallScore: number;
  processingRoute: 'simple' | 'standard' | 'complex';
  estimatedLineItems: number;
}

export interface ProcessingConfig {
  enableEnhancedPreprocessing: boolean;
  targetDPI: number;
  adaptiveBinarization: boolean;
  perspectiveCorrection: boolean;
  noiseReduction: boolean;
}

export class EnhancedImagePreprocessor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Analyze image quality and determine optimal processing route
   */
  async analyzeImageQuality(imageFile: File): Promise<ImageQualityMetrics> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available - client-side only');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);

      img.onload = () => {
        try {
          // Set canvas size
          this.canvas!.width = Math.min(img.width, 1000); // Limit analysis size
          this.canvas!.height = Math.min(img.height, 1000);
          
          const scaleX = this.canvas!.width / img.width;
          const scaleY = this.canvas!.height / img.height;
          
          this.ctx!.drawImage(img, 0, 0, this.canvas!.width, this.canvas!.height);
          const imageData = this.ctx!.getImageData(0, 0, this.canvas!.width, this.canvas!.height);
          
          // Calculate quality metrics
          const metrics = this.calculateQualityMetrics(imageData);
          
          URL.revokeObjectURL(url);
          resolve(metrics);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for analysis'));
      };

      img.src = url;
    });
  }

  /**
   * CamScanner-level image preprocessing with adaptive enhancement
   */
  async enhanceImage(imageFile: File, config: ProcessingConfig): Promise<string> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available - client-side only');
    }

    const qualityMetrics = await this.analyzeImageQuality(imageFile);

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);

      img.onload = async () => {
        try {
          // Optimal sizing for OCR (targeting 300 DPI equivalent)
          const optimalWidth = Math.min(img.width * 1.5, 2000);
          const optimalHeight = Math.min(img.height * 1.5, 2500);
          
          this.canvas!.width = optimalWidth;
          this.canvas!.height = optimalHeight;
          
          // Apply preprocessing pipeline based on quality analysis
          await this.applyPreprocessingPipeline(img, qualityMetrics, config);
          
          const dataURL = this.canvas!.toDataURL('image/png', 1.0);
          URL.revokeObjectURL(url);
          resolve(dataURL);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for preprocessing'));
      };

      img.src = url;
    });
  }

  private calculateQualityMetrics(imageData: ImageData): ImageQualityMetrics {
    const { width, height, data } = imageData;
    
    // Convert to grayscale for analysis
    const grayscale = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      grayscale[i / 4] = gray;
    }

    // Calculate sharpness using Laplacian variance
    const sharpness = this.calculateSharpness(grayscale, width, height);
    
    // Calculate contrast using standard deviation
    const contrast = this.calculateContrast(grayscale);
    
    // Calculate brightness (mean luminance)
    const brightness = this.calculateBrightness(grayscale);
    
    // Estimate text density (potential line items)
    const textDensity = this.estimateTextDensity(grayscale, width, height);
    
    // Calculate overall quality score
    const overallScore = this.calculateOverallScore(sharpness, contrast, brightness, textDensity);
    
    // Determine processing route based on metrics
    const processingRoute = this.determineProcessingRoute(overallScore, textDensity);
    
    // Estimate number of line items
    const estimatedLineItems = Math.max(1, Math.floor(textDensity / 10));

    return {
      sharpness,
      contrast,
      brightness,
      textDensity,
      overallScore,
      processingRoute,
      estimatedLineItems
    };
  }

  private calculateSharpness(grayscale: Uint8ClampedArray, width: number, height: number): number {
    // Laplacian operator for edge detection
    const laplacian = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
    let variance = 0;
    let mean = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            sum += grayscale[idx] * laplacian[(ky + 1) * 3 + (kx + 1)];
          }
        }
        mean += sum;
        count++;
      }
    }

    mean /= count;

    // Calculate variance
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            sum += grayscale[idx] * laplacian[(ky + 1) * 3 + (kx + 1)];
          }
        }
        variance += Math.pow(sum - mean, 2);
      }
    }

    return Math.min(100, (variance / count) / 100); // Normalize to 0-100
  }

  private calculateContrast(grayscale: Uint8ClampedArray): number {
    let sum = 0;
    let sumSquares = 0;
    
    for (let i = 0; i < grayscale.length; i++) {
      sum += grayscale[i];
      sumSquares += grayscale[i] * grayscale[i];
    }
    
    const mean = sum / grayscale.length;
    const variance = (sumSquares / grayscale.length) - (mean * mean);
    
    return Math.min(100, Math.sqrt(variance) / 2.55); // Normalize to 0-100
  }

  private calculateBrightness(grayscale: Uint8ClampedArray): number {
    let sum = 0;
    for (let i = 0; i < grayscale.length; i++) {
      sum += grayscale[i];
    }
    return (sum / grayscale.length) / 2.55; // Normalize to 0-100
  }

  private estimateTextDensity(grayscale: Uint8ClampedArray, width: number, height: number): number {
    // Simple edge-based text estimation
    let edgeCount = 0;
    const threshold = 30;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const current = grayscale[y * width + x];
        const right = grayscale[y * width + x + 1];
        const bottom = grayscale[(y + 1) * width + x];
        
        const gradientX = Math.abs(right - current);
        const gradientY = Math.abs(bottom - current);
        
        if (gradientX > threshold || gradientY > threshold) {
          edgeCount++;
        }
      }
    }

    return Math.min(100, (edgeCount / (width * height)) * 10000); // Normalize
  }

  private calculateOverallScore(sharpness: number, contrast: number, brightness: number, textDensity: number): number {
    // Weighted scoring favoring receipt-like characteristics
    const weights = {
      sharpness: 0.3,
      contrast: 0.3,
      brightness: 0.2, // Penalty for very dark/bright images
      textDensity: 0.2
    };

    // Brightness penalty for extremes
    const brightnessPenalty = Math.abs(brightness - 50) / 50; // Optimal around 50%
    const adjustedBrightness = brightness * (1 - brightnessPenalty * 0.5);

    return (
      sharpness * weights.sharpness +
      contrast * weights.contrast +
      adjustedBrightness * weights.brightness +
      textDensity * weights.textDensity
    );
  }

  private determineProcessingRoute(overallScore: number, textDensity: number): 'simple' | 'standard' | 'complex' {
    if (overallScore >= 70 && textDensity <= 30) {
      return 'simple'; // High quality, simple receipt
    } else if (overallScore >= 50 || textDensity <= 50) {
      return 'standard'; // Medium quality or moderate complexity
    } else {
      return 'complex'; // Low quality or complex receipt
    }
  }

  private async applyPreprocessingPipeline(
    img: HTMLImageElement, 
    metrics: ImageQualityMetrics, 
    config: ProcessingConfig
  ): Promise<void> {
    if (!this.ctx) return;

    // Step 1: Draw and scale image
    this.ctx.drawImage(img, 0, 0, this.canvas!.width, this.canvas!.height);
    
    // Step 2: Apply enhancements based on quality analysis
    let imageData = this.ctx.getImageData(0, 0, this.canvas!.width, this.canvas!.height);
    
    // Apply adaptive binarization for poor contrast
    if (metrics.contrast < 40 && config.adaptiveBinarization) {
      this.applyAdaptiveBinarization(imageData);
    }
    
    // Apply noise reduction for low sharpness
    if (metrics.sharpness < 30 && config.noiseReduction) {
      this.applyNoiseReduction(imageData);
    }
    
    // Apply brightness normalization
    if (metrics.brightness < 30 || metrics.brightness > 70) {
      this.applyBrightnessNormalization(imageData, metrics.brightness);
    }
    
    // Apply sharpening for blurry images
    if (metrics.sharpness < 50) {
      this.applySharpening(imageData);
    }
    
    // Put processed image back
    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyAdaptiveBinarization(imageData: ImageData): void {
    const { width, height, data } = imageData;
    const blockSize = 16;
    
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        const maxY = Math.min(by + blockSize, height);
        const maxX = Math.min(bx + blockSize, width);
        
        // Calculate local threshold
        let sum = 0;
        let count = 0;
        
        for (let y = by; y < maxY; y++) {
          for (let x = bx; x < maxX; x++) {
            const i = (y * width + x) * 4;
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            sum += gray;
            count++;
          }
        }
        
        const threshold = (sum / count) * 0.9; // Slightly lower for better text
        
        // Apply binarization to block
        for (let y = by; y < maxY; y++) {
          for (let x = bx; x < maxX; x++) {
            const i = (y * width + x) * 4;
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const value = gray < threshold ? 0 : 255;
            
            data[i] = value;     // R
            data[i + 1] = value; // G
            data[i + 2] = value; // B
            // Keep alpha unchanged
          }
        }
      }
    }
  }

  private applyNoiseReduction(imageData: ImageData): void {
    const { width, height, data } = imageData;
    const original = new Uint8ClampedArray(data);
    
    // Median filter for noise reduction
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        
        // Get 3x3 neighborhood
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = ((y + dy) * width + (x + dx)) * 4;
            const gray = 0.299 * original[ni] + 0.587 * original[ni + 1] + 0.114 * original[ni + 2];
            neighbors.push(gray);
          }
        }
        
        neighbors.sort((a, b) => a - b);
        const median = neighbors[4]; // Middle value
        
        data[i] = median;     // R
        data[i + 1] = median; // G
        data[i + 2] = median; // B
      }
    }
  }

  private applyBrightnessNormalization(imageData: ImageData, currentBrightness: number): void {
    const { data } = imageData;
    const targetBrightness = 50; // Target 50% brightness
    const adjustment = targetBrightness / currentBrightness;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * adjustment));         // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * adjustment)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * adjustment)); // B
    }
  }

  private applySharpening(imageData: ImageData): void {
    const { width, height, data } = imageData;
    const original = new Uint8ClampedArray(data);
    
    // Unsharp mask kernel
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const i = ((y - 1 + ky) * width + (x - 1 + kx)) * 4;
            const kernelValue = kernel[ky * 3 + kx];
            
            r += original[i] * kernelValue;
            g += original[i + 1] * kernelValue;
            b += original[i + 2] * kernelValue;
          }
        }
        
        const i = (y * width + x) * 4;
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }
    }
  }
}