"use client";

export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TagInput } from "@/components/ui/tag-input";
import { 
  Receipt, 
  Upload, 
  Brain, 
  Check, 
  X, 
  Edit,
  Save,
  FileImage,
  Calendar,
  DollarSign,
  Store,
  Tag,
  Plus,
  Trash2,
  Sparkles,
  PenTool
} from "lucide-react";
import Image from "next/image";
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";

// Railway-specific: Type-only import to prevent server-side bundling issues
import type { ExtractedReceiptData } from "@/lib/ocr-processor";

interface ExtractedLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  tag?: string; // Single tag ID (changed from tags array)
}

interface ExtractedData {
  vendor: string;
  date: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  lineItems: ExtractedLineItem[];
  notes: string;
  tags?: string[]; // Array of tag IDs for receipt-level tags
}

interface UploadedReceipt {
  id: string;
  name: string;
  url: string;
  imageUrl?: string; // For storing Supabase storage URL separately
  size: number;
  type: string;
  uploadedAt: Date;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: ExtractedData;
  saved?: boolean; // Track if receipt has been saved to database
  dbReceiptId?: string; // Database receipt ID for updates
}

interface TagCategory {
  id: string;
  name: string;
  color: string;
  required: boolean;
  multiple: boolean;
}

interface SelectedTag {
  id: string;
  name: string;
  description?: string;
  color: string;
  category: {
    id: string;
    name: string;
  };
  categoryName: string;
}

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<UploadedReceipt | null>(null);
  const [editingData, setEditingData] = useState<ExtractedData | null>(null);
  const [saving, setSaving] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{[key: string]: {step: string, progress: number}}>({});
  const [vendorSuggestions, setVendorSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [vendorInputFocused, setVendorInputFocused] = useState(false);
  const [similarVendorWarning, setSimilarVendorWarning] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  
  // Tag-related state
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [allTags, setAllTags] = useState<SelectedTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);

  // Load tag categories on mount
  useEffect(() => {
    const loadTagData = async () => {
      try {
        // Load tag categories
        const categoriesResponse = await fetch('/api/tags/categories');
        if (categoriesResponse.ok) {
          const categoriesResult = await categoriesResponse.json();
          setTagCategories(categoriesResult.data || []);
        }

        // Load all tags
        const tagsResponse = await fetch('/api/tags');
        if (tagsResponse.ok) {
          const tagsResult = await tagsResponse.json();
          setAllTags(tagsResult.data || []);
        }
      } catch (error) {
        console.error('Error loading tag data:', error);
      }
    };

    loadTagData();
  }, []);

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        toast.error(`${file.name} must be an image or PDF file`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 20;
          });
        }, 200);

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { url, path, filename } = await response.json();

        const uploadedReceipt: UploadedReceipt = {
          id: crypto.randomUUID(),
          name: file.name,
          url,
          imageUrl: url, // Store the Supabase storage URL
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          ocrStatus: 'pending',
        };

        setUploadedReceipts((prev) => [uploadedReceipt, ...prev]);
        toast.success(`${file.name} uploaded successfully`);
        
        // Process OCR with the original file for better quality and pass image URL
        processReceiptOCR(uploadedReceipt.id, file, url);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

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

      let result: any = null;
      let processingMethod = '';
      
      // Try client-side OCR first (privacy-first approach)
      try {
        updateProgress('Initializing browser OCR...', 10);
        const isPdf = file.type === 'application/pdf';
        // Starting processing silently
        
        // Railway-specific: Dynamic import with error handling to avoid server-side issues
        const module = await import('@/lib/ai-ocr/enhanced-processor').catch(err => {
          console.warn('Failed to load OCR processor, falling back to server processing:', err);
          throw new Error('Client OCR unavailable');
        });
        const { SimplifiedOCRProcessor } = module;
        const ocrProcessor = new SimplifiedOCRProcessor(); // Uses OpenAI for AI enhancement
        
        if (isPdf) {
          updateProgress('Converting PDF to image...', 20);
          await new Promise(resolve => setTimeout(resolve, 500)); // Allow UI update
          updateProgress('Extracting text from PDF...', 40);
        } else {
          updateProgress('Preprocessing image...', 30);
          await new Promise(resolve => setTimeout(resolve, 500)); // Allow UI update
          updateProgress('Extracting text...', 40);
        }
        
        // Smart processing with automatic AI enhancement
        updateProgress('🧠 Processing with smart AI enhancement...', 50);
        
        result = await ocrProcessor.processImage(file);
        processingMethod = ocrProcessor.isAIEnabled() ? 'ai-enhanced' : 'browser';
        
        updateProgress('Analyzing results...', 90);
        
        // Update progress with confidence level
        const confidenceEmoji = result.confidence > 85 ? '🎯' : result.confidence > 70 ? '✓' : '⚠️';
        updateProgress(`${confidenceEmoji} Processing complete (${result.confidence}% confidence)`, 95);
        
        // Special handling for PDFs - always use Vision API since OCR struggles with PDFs
        if (file.type === 'application/pdf') {
          console.log(`📄 PDF detected - forcing Vision API for better accuracy`);
          updateProgress('PDF detected, using OpenAI Vision API...', 95);
          throw new Error('PDF requires Vision API processing');
        }
        
        // If confidence is too low OR few items detected, try server-side processing
        const itemCount = result.lineItems?.length || 0;
        const avgItemPrice = result.totalAmount / Math.max(itemCount, 1);
        const shouldUseFallback = result.confidence < 75 || (itemCount <= 5 && avgItemPrice > 6);
        
        if (shouldUseFallback) {
          const reason = result.confidence < 75 ? 'low confidence' : 'suspicious item count/pricing detected';
          console.log(`🔍 Fallback trigger: ${itemCount} items, $${result.totalAmount} total, avg $${avgItemPrice.toFixed(2)} per item`);
          updateProgress(`${reason.charAt(0).toUpperCase() + reason.slice(1)}, trying OpenAI Vision API...`, 95);
          throw new Error(`${reason}, attempting server-side processing`);
        }
        
        updateProgress('Processing complete!', 100);
      } catch (clientError) {
        console.warn('Client-side OCR failed or low confidence, trying server-side:', clientError);
        
        try {
          updateProgress('🔥 Upgrading to OpenAI Vision API...', 20);
          
          // Convert file to base64 for server processing
          updateProgress('Preparing image data...', 40);
          
          let imageData: string;
          
          // If it's a PDF, we need to convert it to image first
          if (file.type === 'application/pdf') {
            console.log('📄 Converting PDF to image for Vision API...');
            updateProgress('Converting PDF to image...', 45);
            
            try {
              // Railway-specific: Use the same PDF conversion as the OCR processor with error handling
              const module = await import('@/lib/ai-ocr/enhanced-processor').catch(err => {
                console.error('Failed to load OCR processor for PDF conversion:', err);
                throw new Error('PDF processor unavailable');
              });
              const { SimplifiedOCRProcessor } = module;
              const tempProcessor = new SimplifiedOCRProcessor();
              await tempProcessor.initialize();
              
              // Convert PDF to image (this returns a data URL)
              imageData = await tempProcessor.convertPdfToImage(file);
              console.log('✅ PDF converted to image for Vision API');
              console.log('🔍 Converted image type:', imageData.substring(0, 50) + '...');
              
              // Verify it's actually an image now
              if (!imageData.startsWith('data:image/')) {
                throw new Error('PDF conversion did not produce a valid image');
              }
            } catch (pdfError) {
              console.error('❌ PDF conversion failed:', pdfError);
              throw new Error(`PDF conversion failed: ${pdfError.message}`);
            }
          } else {
            // For regular images, just convert to base64
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
          }
          
          updateProgress('Sending to AI processor...', 60);
          
          // Call server-side processing API
          const response = await fetch('/api/process-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageData, imageUrl }),
          });
          
          if (!response.ok) {
            throw new Error(`Server processing failed: ${response.status}`);
          }
          
          updateProgress('Receiving AI results...', 80);
          
          const serverResult = await response.json();
          if (serverResult.success) {
            result = serverResult.data;
            processingMethod = 'openai-vision';
            updateProgress('🔥 OpenAI Vision API processing complete!', 100);
          } else {
            throw new Error('Server processing returned unsuccessful result');
          }
        } catch (serverError) {
          console.error('Server-side OCR also failed:', serverError);
          updateProgress('Processing failed', 0);
          throw new Error('Both client-side and server-side OCR processing failed. Please try with a clearer image.');
        }
      }

      const extractedData: ExtractedData = {
        vendor: result.vendor,
        date: result.date,
        totalAmount: result.totalAmount,
        subtotal: result.subtotal,
        tax: result.tax,
        notes: result.notes || '',
        lineItems: result.lineItems || [],
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
      
      const confidenceMsg = result.confidence < 50 
        ? ' (Low confidence - please review carefully)'
        : result.confidence > 80 
        ? ' (High confidence)'
        : '';
      
      const methodMsg = processingMethod === 'browser' 
        ? ' (Smart OCR)'
        : processingMethod === 'ai-enhanced'
        ? ' (AI Enhanced)'
        : processingMethod === 'openai-vision'
        ? ' 🔥 (Vision AI)'
        : ' (AI Processed)';
      
      // Final success notification
      updateProgress('✅ Receipt processed successfully!', 100);
      
      // Clean, concise success message
      const shortMethodMsg = processingMethod === 'openai-vision' ? ' 🔥' : '';
      toast.success(`Receipt processed${shortMethodMsg} - ${Math.round(result.confidence)}% confidence. Click "Review & Edit" to verify.`);
      
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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files);
    }
  };

  const openEditModal = (receipt: UploadedReceipt) => {
    if (receipt.extractedData) {
      setSelectedReceipt(receipt);
      setEditingData({ ...receipt.extractedData });
      // Initialize tags from extracted data if they exist
      setSelectedTags(receipt.extractedData.tags || []);
      
      // Scroll the selected receipt into view (with some delay to allow state to update)
      setTimeout(() => {
        const receiptElement = document.querySelector(`[data-receipt-id="${receipt.id}"]`);
        if (receiptElement) {
          // Calculate the visible area considering the side panel width
          const sidePanelWidth = 512; // max-w-2xl = 512px
          const viewportWidth = window.innerWidth;
          const availableWidth = viewportWidth - sidePanelWidth;
          
          // Get the receipt's position
          const rect = receiptElement.getBoundingClientRect();
          const receiptCenter = rect.left + rect.width / 2;
          
          // If receipt is not visible in the available space, scroll it into view
          if (receiptCenter > availableWidth) {
            receiptElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'start' 
            });
          } else {
            // Just center it vertically if it's horizontally visible
            receiptElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest' 
            });
          }
        }
      }, 150);
    }
  };

  const closeEditModal = () => {
    setSelectedReceipt(null);
    setEditingData(null);
    setSelectedTags([]); // Reset tags when closing
  };

  const addLineItem = () => {
    if (!editingData) return;
    
    const newItem: ExtractedLineItem = {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    
    setEditingData({
      ...editingData,
      lineItems: [...editingData.lineItems, newItem]
    });
  };

  const removeLineItem = (itemId: string) => {
    if (!editingData) return;
    
    setEditingData({
      ...editingData,
      lineItems: editingData.lineItems.filter(item => item.id !== itemId)
    });
  };

  const updateLineItem = (itemId: string, field: keyof ExtractedLineItem, value: any) => {
    if (!editingData) return;
    
    setEditingData({
      ...editingData,
      lineItems: editingData.lineItems.map(item =>
        item.id === itemId 
          ? { ...item, [field]: value, totalPrice: field === 'quantity' || field === 'unitPrice' 
              ? (field === 'quantity' ? value : item.quantity) * (field === 'unitPrice' ? value : item.unitPrice)
              : item.totalPrice }
          : item
      )
    });
  };

  const updateLineItemTag = (itemId: string, tagId: string | undefined) => {
    updateLineItem(itemId, 'tag', tagId);
  };

  const saveReceipt = async () => {
    if (!editingData || !selectedReceipt) return;
    
    // Prevent duplicate saves
    if (saving) {
      toast.warning("Please wait for the current save to complete");
      return;
    }

    // Validate date is not in the future
    const receiptDate = new Date(editingData.date + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (receiptDate > today) {
      toast.error("Receipt date cannot be in the future");
      return;
    }
    
    setSaving(true);
    try {
      // Clean line items to ensure they're serializable
      const cleanLineItems = editingData.lineItems.map(item => ({
        description: String(item.description || ''),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || 0),
        category: 'Other', // Default category since we're using tags instead
        tag: item.tag || undefined // Single tag ID
      }));

      // Prepare data for saving
      const saveData = {
        vendor: String(editingData.vendor || ''),
        date: String(editingData.date || ''),
        totalAmount: Number(editingData.totalAmount || 0),
        subtotal: Number(editingData.subtotal || 0),
        tax: Number(editingData.tax || 0),
        currency: 'USD',
        category: 'Other', // Default vendor category
        lineItems: cleanLineItems,
        notes: String(editingData.notes || ''),
        tags: selectedTags.map(tag => typeof tag === 'string' ? tag : tag.id) // Include selected tag IDs
      };

      console.log('Saving receipt data:', saveData);

      // Generate a unique request ID to prevent duplicate submissions
      const requestId = `${selectedReceipt.id}-${Date.now()}`;

      // Call the save-receipt API
      const response = await fetch('/api/save-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({
          ...saveData,
          imageUrl: selectedReceipt.imageUrl || 'placeholder',
          confidence: 85, // Default confidence score
          forceSave: false, // Can be set to true to bypass similar vendor warnings
          requestId, // Include in body as well for extra safety
          isUpdate: selectedReceipt.saved, // Flag to indicate this is an update
          uploadReceiptId: selectedReceipt.id, // Original upload receipt ID for reference
          dbReceiptId: selectedReceipt.dbReceiptId, // Database receipt ID for updates
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save receipt');
      }

      // Check if there's a similar vendor warning
      if (result.warning === 'similar_vendors') {
        // TODO: Show a dialog to handle similar vendors
        console.warn('Similar vendors found:', result.similarVendors);
        // For now, force save
        const forceSaveResponse = await fetch('/api/save-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId + '-force',
          },
          body: JSON.stringify({
            ...saveData,
            imageUrl: selectedReceipt.imageUrl || 'placeholder',
            confidence: 85,
            forceSave: true,
            requestId: requestId + '-force',
            isUpdate: selectedReceipt.saved,
            uploadReceiptId: selectedReceipt.id,
            dbReceiptId: selectedReceipt.dbReceiptId,
          }),
        });
        
        const forceSaveResult = await forceSaveResponse.json();
        if (!forceSaveResponse.ok) {
          throw new Error(forceSaveResult.error || 'Failed to save receipt');
        }
      }
      
      // Update local state to reflect the saved data
      setUploadedReceipts(prev =>
        prev.map(receipt =>
          receipt.id === selectedReceipt.id
            ? { 
                ...receipt, 
                extractedData: { ...editingData, tags: selectedTags.map(tag => typeof tag === 'string' ? tag : tag.id) }, 
                saved: true,
                dbReceiptId: result.data?.receiptId || receipt.dbReceiptId // Store the database receipt ID
              }
            : receipt
        )
      );
      
      toast.success("Receipt saved successfully!");
      setSelectedTags([]); // Reset tags after save
      closeEditModal();
    } catch (error) {
      console.error('Save receipt error:', error);
      toast.error("Failed to save receipt");
    } finally {
      setSaving(false);
    }
  };

  const saveAllReceipts = async () => {
    const completedReceipts = uploadedReceipts.filter(r => r.ocrStatus === 'completed' && r.extractedData && !r.saved);
    
    if (completedReceipts.length === 0) {
      const alreadySavedCount = uploadedReceipts.filter(r => r.saved).length;
      if (alreadySavedCount > 0) {
        toast.info("All completed receipts have already been saved");
      } else {
        toast.error("No completed receipts to save");
      }
      return;
    }

    // Check for future dates in any receipt
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const futureReceipts = completedReceipts.filter(receipt => {
      const receiptDate = new Date(receipt.extractedData!.date + 'T00:00:00');
      return receiptDate > today;
    });

    if (futureReceipts.length > 0) {
      toast.error(`Cannot save ${futureReceipts.length} receipt(s) with future dates. Please edit them first.`);
      return;
    }

    setSaving(true);
    let savedCount = 0;
    let errorCount = 0;

    try {
      for (const receipt of completedReceipts) {
        try {
          const extractedData = receipt.extractedData!;
          
          // Clean line items to ensure they're serializable
          const cleanLineItems = extractedData.lineItems.map(item => ({
            description: String(item.description || ''),
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            totalPrice: Number(item.totalPrice || 0),
            category: 'Other', // Default category since we're using tags instead
            tag: item.tag || undefined // Single tag ID
          }));

          // Prepare data for saving
          const saveData = {
            vendor: String(extractedData.vendor || ''),
            date: String(extractedData.date || ''),
            totalAmount: Number(extractedData.totalAmount || 0),
            subtotal: Number(extractedData.subtotal || 0),
            tax: Number(extractedData.tax || 0),
            currency: 'USD',
            category: 'Other', // Default vendor category
            lineItems: cleanLineItems,
            notes: String(extractedData.notes || ''),
            tags: extractedData.tags?.map(tag => typeof tag === 'string' ? tag : tag.id) || [] // Include selected tag IDs
          };

          // Call the save-receipt API
          const response = await fetch('/api/save-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...saveData,
              imageUrl: receipt.imageUrl || 'placeholder',
              confidence: 85, // Default confidence score
              forceSave: true // Force save for bulk operations
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to save receipt');
          }

          // Update local state to mark as saved
          setUploadedReceipts(prev =>
            prev.map(r =>
              r.id === receipt.id
                ? { ...r, saved: true }
                : r
            )
          );

          savedCount++;
        } catch (error) {
          console.error(`Failed to save receipt ${receipt.name}:`, error);
          errorCount++;
        }
      }

      if (savedCount > 0) {
        toast.success(`Successfully saved ${savedCount} ${savedCount === 1 ? 'receipt' : 'receipts'}!`);
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to save ${errorCount} ${errorCount === 1 ? 'receipt' : 'receipts'}`);
      }
    } catch (error) {
      console.error('Bulk save error:', error);
      toast.error("Failed to save receipts");
    } finally {
      setSaving(false);
    }
  };

  const saveIndividualReceipt = async (receipt: UploadedReceipt) => {
    if (!receipt.extractedData) return;
    
    // Check if already saved
    if (receipt.saved) {
      toast.info("This receipt has already been saved");
      return;
    }
    
    // Validate date is not in the future
    const receiptDate = new Date(receipt.extractedData.date + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (receiptDate > today) {
      toast.error("Receipt date cannot be in the future. Please edit the receipt first.");
      return;
    }
    
    setSaving(true);
    try {
      const extractedData = receipt.extractedData;
      
      // Clean line items to ensure they're serializable
      const cleanLineItems = extractedData.lineItems.map(item => ({
        description: String(item.description || ''),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || 0),
        category: 'Other', // Default category since we're using tags instead
        tag: item.tag || undefined // Single tag ID
      }));

      // Prepare data for saving
      const saveData = {
        vendor: String(extractedData.vendor || ''),
        date: String(extractedData.date || ''),
        totalAmount: Number(extractedData.totalAmount || 0),
        subtotal: Number(extractedData.subtotal || 0),
        tax: Number(extractedData.tax || 0),
        currency: 'USD',
        category: 'Other', // Default vendor category
        lineItems: cleanLineItems,
        notes: String(extractedData.notes || ''),
        tags: extractedData.tags?.map(tag => typeof tag === 'string' ? tag : tag.id) || [] // Include selected tag IDs
      };

      // Call the save-receipt API
      const response = await fetch('/api/save-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...saveData,
          imageUrl: receipt.imageUrl || 'placeholder',
          confidence: 85, // Default confidence score
          forceSave: true // Force save for individual operations
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save receipt');
      }

      // Update local state to mark as saved
      setUploadedReceipts(prev =>
        prev.map(r =>
          r.id === receipt.id
            ? { ...r, saved: true }
            : r
        )
      );

      toast.success(`${receipt.extractedData.vendor} receipt saved successfully!`);
    } catch (error) {
      console.error('Save individual receipt error:', error);
      toast.error("Failed to save receipt");
    } finally {
      setSaving(false);
    }
  };

  const removeFile = (id: string) => {
    setUploadedReceipts((prev) => prev.filter((file) => file.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="w-full">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-col items-start justify-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Add Receipt
                </h1>
                <p className="text-muted-foreground">
                  Upload and scan receipts with AI-powered data extraction
                </p>
              </div>
              
              {/* AI processing now integrated seamlessly */}
            </div>
            

            {/* Upload Area */}
            <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg overflow-hidden">
              <div className="p-6">
                <div>
                  <div>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                        dragActive
                          ? "border-purple-400 bg-purple-50/50 scale-105"
                          : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                        ) : (
                          <Upload className="h-8 w-8 text-white" />
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {dragActive ? "Drop your receipts here" : "Upload your receipts"}
                        </h3>
                        <p className="text-muted-foreground">
                          Drag and drop or click to select files
                        </p>
                        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileImage className="h-4 w-4" />
                            <span>PNG, JPG, PDF</span>
                          </div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>Max 10MB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {uploading && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-600 animate-pulse" />
                          <span className="font-medium text-gray-900">Processing with AI...</span>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>

          {/* Receipt Grid */}
          {uploadedReceipts.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Processed Receipts
                      </h3>
                      <p className="text-muted-foreground">
                        {uploadedReceipts.length} {uploadedReceipts.length === 1 ? 'receipt' : 'receipts'} ready for review
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Total: </span>
                      <span className="text-lg font-bold text-green-600">
                        ${uploadedReceipts.reduce((sum, receipt) => 
                          sum + (receipt.extractedData?.totalAmount || 0), 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    {uploadedReceipts.some(r => r.ocrStatus === 'completed' && !r.saved) && (
                      <Button
                        onClick={saveAllReceipts}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save All"}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Recommendation Message */}
                {uploadedReceipts.some(r => r.ocrStatus === 'completed' && !r.saved) && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                        <Sparkles className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                          💡 Pro Tip: Review Before Saving
                        </h4>
                        <p className="text-sm text-blue-700">
                          It's recommended to review and edit line items for accuracy before saving. 
                          Click "Review" on each receipt to verify extracted data and add tags.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {uploadedReceipts.map((receipt) => (
                    <div 
                      key={receipt.id} 
                      data-receipt-id={receipt.id}
                      className={`group bg-white rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 border ${
                        selectedReceipt?.id === receipt.id 
                          ? 'border-purple-500 bg-purple-50 shadow-md ring-1 ring-purple-200 transform scale-105' 
                          : 'border-gray-200'
                      }`}>
                      <div className="aspect-[4/3] relative bg-gray-100">
                        {receipt.type.startsWith('image/') ? (
                          <Image
                            src={receipt.url}
                            alt={receipt.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                              <FileImage className="h-6 w-6 text-red-600" />
                            </div>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {selectedReceipt?.id === receipt.id && (
                            <div className="bg-purple-500 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 animate-pulse">
                              <PenTool className="h-3 w-3" />
                              Editing
                            </div>
                          )}
                          {receipt.ocrStatus === 'processing' && (
                            <div className="bg-blue-500 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              Processing
                            </div>
                          )}
                          {receipt.ocrStatus === 'completed' && selectedReceipt?.id !== receipt.id && (
                            <div className="bg-green-500 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Ready
                            </div>
                          )}
                          {receipt.ocrStatus === 'failed' && (
                            <div className="bg-red-500 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                              <X className="h-3 w-3" />
                              Failed
                            </div>
                          )}
                        </div>

                        {/* Progress Indicator */}
                        {receipt.ocrStatus === 'processing' && ocrProgress[receipt.id] && (
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="bg-white/95 backdrop-blur-sm rounded-md p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-800">
                                  {ocrProgress[receipt.id].step}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {ocrProgress[receipt.id].progress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1">
                                <div 
                                  className="bg-blue-500 h-1 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${ocrProgress[receipt.id].progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => removeFile(receipt.id)}
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 truncate" title={receipt.name}>
                            {receipt.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(receipt.size)}
                          </p>
                        </div>
                        
                        {receipt.ocrStatus === 'completed' && receipt.extractedData && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {receipt.extractedData.vendor}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="text-base font-medium text-green-600">
                                ${receipt.extractedData.totalAmount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-muted-foreground">
                                {receipt.extractedData.tags?.length ? `${receipt.extractedData.tags.length} tags` : 'No tags'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(receipt.url, "_blank")}
                            className="flex-1"
                          >
                            View
                          </Button>
                          {receipt.ocrStatus === 'completed' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openEditModal(receipt)}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveIndividualReceipt(receipt)}
                                disabled={saving || receipt.saved}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                {receipt.saved ? "Saved" : "Save"}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </section>

    {/* Side Panel */}
    {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop - only covers the left side */}
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={closeEditModal} />
          
          {/* Side Panel */}
          <div className="w-full max-w-2xl bg-gradient-to-br from-purple-50 via-white to-blue-50 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-6 border-b border-purple-100 bg-gradient-to-r from-purple-600 to-blue-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Edit Receipt</h2>
                    <p className="text-purple-100">
                      {editingData?.vendor || 'Unknown Vendor'} • {editingData?.date ? new Date(editingData.date + 'T00:00:00').toLocaleDateString() : 'No Date'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={closeEditModal} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {editingData && (
                <>
                  {/* Basic Info Card */}
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200 rounded-xl shadow-lg p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                        <Store className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Receipt Details</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="vendor" className="text-sm font-medium text-purple-700 flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Vendor
                        </Label>
                        <Input
                          id="vendor"
                          value={editingData.vendor}
                          onChange={(e) => setEditingData({...editingData, vendor: e.target.value})}
                          className="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date" className="text-sm font-medium text-purple-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={editingData.date}
                          onChange={(e) => setEditingData({...editingData, date: e.target.value})}
                          className="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="total" className="text-sm font-medium text-purple-700 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Total Amount
                        </Label>
                        <Input
                          id="total"
                          type="number"
                          step="0.01"
                          value={editingData.totalAmount}
                          onChange={(e) => setEditingData({...editingData, totalAmount: parseFloat(e.target.value) || 0})}
                          className="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax" className="text-sm font-medium text-purple-700 flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Tax
                        </Label>
                        <Input
                          id="tax"
                          type="number"
                          step="0.01"
                          value={editingData.tax}
                          onChange={(e) => setEditingData({...editingData, tax: parseFloat(e.target.value) || 0})}
                          className="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags Card */}
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200 rounded-xl shadow-lg p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                        <Tag className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Tags</h3>
                    </div>
                    <TagInput
                      selectedTags={selectedTags}
                      onTagsChange={(tags) => {
                        // Get previous and new tag IDs
                        const prevTagIds = selectedTags.map(tag => typeof tag === 'string' ? tag : tag.id);
                        const newTagIds = tags.map(tag => typeof tag === 'string' ? tag : tag.id);
                        
                        // Find added and removed tags
                        const addedTags = newTagIds.filter(id => !prevTagIds.includes(id));
                        const removedTags = prevTagIds.filter(id => !newTagIds.includes(id));
                        
                        setSelectedTags(tags);
                        
                        // Also update the editing data
                        if (editingData) {
                          setEditingData({ ...editingData, tags });
                          
                          // Update line items based on header tag changes
                          // For single tag per item, apply the first added tag to items without tags
                          if (addedTags.length > 0) {
                            const firstAddedTag = addedTags[0]; // Use only the first tag for line items
                            const updatedLineItems = editingData.lineItems.map(item => {
                              // Only update items that don't have a tag yet
                              if (!item.tag || removedTags.includes(item.tag)) {
                                return { ...item, tag: firstAddedTag };
                              }
                              return item;
                            });
                            
                            setEditingData(prev => ({ ...prev, lineItems: updatedLineItems }));
                          } else if (removedTags.length > 0) {
                            // Remove tags from items that have any of the removed tags
                            const updatedLineItems = editingData.lineItems.map(item => {
                              if (item.tag && removedTags.includes(item.tag)) {
                                return { ...item, tag: undefined };
                              }
                              return item;
                            });
                            
                            setEditingData(prev => ({ ...prev, lineItems: updatedLineItems }));
                          }
                        }
                      }}
                      categories={tagCategories}
                      placeholder="Add tags to this receipt..."
                    />
                  </div>

                  {/* Line Items Card */}
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200 rounded-xl shadow-lg p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                          <Receipt className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Line Items</h3>
                      </div>
                      <Button onClick={addLineItem} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {editingData.lineItems.map((item) => (
                        <div key={item.id} className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 space-y-3 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <Input
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              placeholder="Item description"
                              className="flex-1 mr-2"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs font-medium text-purple-700">Quantity</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-purple-700">Unit Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-purple-700">Total</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.totalPrice}
                                onChange={(e) => updateLineItem(item.id, 'totalPrice', parseFloat(e.target.value) || 0)}
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-purple-700">Tag (Choose one)</Label>
                            <Select
                              value={item.tag || "none"}
                              onValueChange={(value) => updateLineItemTag(item.id, value === "none" ? undefined : value)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Select a tag..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No tag</SelectItem>
                                {tagCategories.map((category) => (
                                  <div key={category.id}>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      {category.name}
                                    </div>
                                    {allTags
                                      .filter(tag => tag.category.id === category.id)
                                      .map((tag) => (
                                        <SelectItem key={tag.id} value={tag.id}>
                                          <div className="flex items-center gap-2">
                                            <div 
                                              className="w-3 h-3 rounded-full" 
                                              style={{ backgroundColor: tag.color || category.color }}
                                            />
                                            {tag.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={closeEditModal}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveReceipt} 
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 px-8"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Receipt"}
              </Button>
            </div>
          </div>
        </div>
    )}
    
{/* AI Chat Agent - Temporarily disabled for build */}
    </>
  );
}