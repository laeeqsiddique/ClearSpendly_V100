// Simplified OCR processing function for upload page
// This replaces the complex client-side processing with unified server API

const processReceiptOCR = async (receiptId: string, file: File, imageUrl?: string) => {
  const updateProgress = (step: string, progress: number) => {
    setOcrProgress(prev => ({
      ...prev,
      [receiptId]: { step, progress }
    }));
  };

  try {
    setUploadedReceipts((prev) =>
      prev.map((receipt) =>
        receipt.id === receiptId
          ? { ...receipt, ocrStatus: 'processing' }
          : receipt
      )
    );

    updateProgress('Preparing image data...', 20);
    
    // Convert file to base64 for server processing
    let imageData: string;
    
    // For PDFs, inform user they need to convert
    if (file.type === 'application/pdf') {
      updateProgress('PDF detected - please convert to image format', 0);
      throw new Error('PDF files need to be converted to images. Please use a PDF to image converter and upload the image.');
    }
    
    // Convert image to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(file);
    imageData = await base64Promise;
    
    updateProgress('Processing with AI...', 40);
    
    // Call unified OCR API (v2)
    const response = await fetch('/api/process-receipt-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        imageData, 
        imageUrl,
        saveToDatabase: false // We'll save after user reviews
      }),
    });
    
    updateProgress('Analyzing receipt...', 60);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Processing failed: ${error}`);
    }
    
    updateProgress('Extracting data...', 80);
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }
    
    const { data, metadata } = result;
    
    // Show provider info
    const provider = metadata?.provider || 'unknown';
    const confidence = metadata?.confidence || data?.confidence || 0;
    const cost = metadata?.cost || 0;
    
    console.log(`✅ Receipt processed by ${provider} (${confidence}% confidence, cost: $${cost.toFixed(4)})`);
    
    updateProgress(`✅ Processing complete (${provider})`, 100);

    const extractedData: ExtractedData = {
      vendor: data.vendor,
      date: data.date,
      totalAmount: data.totalAmount,
      subtotal: data.subtotal,
      tax: data.tax,
      notes: data.notes || '',
      lineItems: data.lineItems || [],
      tags: [], // Initialize with empty tags array
    };

    setUploadedReceipts((prev) =>
      prev.map((receipt) =>
        receipt.id === receiptId
          ? {
              ...receipt,
              ocrStatus: 'completed',
              extractedData,
            }
          : receipt
      )
    );
    
    // Success notification
    const providerEmoji = provider === 'mistral' ? '⚡' : provider === 'openai' ? '🔥' : '🤖';
    toast.success(`Receipt processed ${providerEmoji} ${Math.round(confidence)}% confidence. Click "Review & Edit" to verify.`);
    
    // Clean up progress tracking
    setOcrProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[receiptId];
      return newProgress;
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    setUploadedReceipts((prev) =>
      prev.map((receipt) =>
        receipt.id === receiptId
          ? { ...receipt, ocrStatus: 'failed' }
          : receipt
      )
    );
    
    // Clean up progress tracking
    setOcrProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[receiptId];
      return newProgress;
    });
    
    toast.error('Failed to process receipt: ' + (error as Error).message);
  }
};