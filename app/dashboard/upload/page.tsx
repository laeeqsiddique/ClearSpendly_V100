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
import { useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// PDF.js dynamic import for client-side PDF to image conversion
let pdfjsLib: any = null;

// Client-side PDF to image conversion (same as original working version)
async function convertPdfToImage(pdfFile: File): Promise<string> {
  // Only run on client side
  if (typeof window === 'undefined') {
    throw new Error('PDF conversion only available in browser');
  }

  // Lazy load PDF.js only when needed
  if (!pdfjsLib) {
    try {
      const module = await import('pdfjs-dist');
      pdfjsLib = module;
      // Set up worker
      module.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
    } catch (error) {
      console.error('Failed to load PDF.js:', error);
      throw new Error('PDF processing library not available');
    }
  }

  try {
    console.log('🔄 Converting PDF to image...');
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

// Types for extracted receipt data

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

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // processReceiptOCR is stable (defined below with empty deps)

  const processReceiptOCR = useCallback(async (receiptId: string, file: File, imageUrl?: string) => {
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
      
      // Handle both images and PDFs
      if (file.type === 'application/pdf') {
        updateProgress('Converting PDF to image...', 30);
        try {
          // Convert PDF to image on client-side for better OCR processing
          imageData = await convertPdfToImage(file);
          updateProgress('PDF converted successfully...', 40);
        } catch (pdfError) {
          console.error('PDF conversion failed:', pdfError);
          updateProgress('PDF conversion failed, using server fallback...', 35);
          // Fall back to sending PDF URL to server
          imageData = ''; // Will use imageUrl instead
        }
      } else {
        updateProgress('Converting image to base64...', 30);
        
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
      }
      
      updateProgress('Processing with AI...', 40);
      
      // Call unified OCR API (v2)
      const response = await fetch('/api/process-receipt-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageData: imageData || null, // Send converted PDF image data or regular image data
          imageUrl: imageData ? null : imageUrl, // Only send URL if no image data (PDF conversion failed)
          fileType: file.type,
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
  }, []);

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
  }, [handleFileUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎯 File input changed!', e.target.files?.length, 'files selected');
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files);
    }
  }, [handleFileUpload]);

  // Ref for the file input element
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEditModal = (receipt: UploadedReceipt) => {
    if (receipt.extractedData) {
      setSelectedReceipt(receipt);
      setEditingData({ ...receipt.extractedData });
      // Initialize tags from extracted data if they exist
      setSelectedTags(receipt.extractedData.tags || []);
      
      // On mobile, prevent body scroll when modal opens
      if (window.innerWidth < 1024) {
        document.body.style.overflow = 'hidden';
      } else {
        // On desktop, scroll the selected receipt into view
        setTimeout(() => {
          const receiptElement = document.querySelector(`[data-receipt-id="${receipt.id}"]`);
          if (receiptElement) {
            const sidePanelWidth = 512; // max-w-2xl = 512px
            const viewportWidth = window.innerWidth;
            const availableWidth = viewportWidth - sidePanelWidth;
            
            const rect = receiptElement.getBoundingClientRect();
            const receiptCenter = rect.left + rect.width / 2;
            
            if (receiptCenter > availableWidth) {
              receiptElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'start' 
              });
            } else {
              receiptElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest' 
              });
            }
          }
        }, 150);
      }
    }
  };

  const closeEditModal = () => {
    setSelectedReceipt(null);
    setEditingData(null);
    setSelectedTags([]); // Reset tags when closing
    
    // Restore body scroll on mobile
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = 'unset';
    }
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
      {/* Mobile-First Layout */}
      <div className="min-h-screen bg-gray-50 lg:bg-gradient-to-br lg:from-purple-50 lg:via-white lg:to-blue-50">
        <div className="w-full lg:max-w-6xl lg:mx-auto">
          <div className="flex flex-col space-y-6 p-4 lg:p-8">
            {/* Mobile Header */}
            <div className="text-center lg:text-left">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 lg:bg-gradient-to-r lg:from-purple-600 lg:to-blue-600 lg:bg-clip-text lg:text-transparent">
                Add Receipt
              </h1>
              <p className="text-gray-600 lg:text-muted-foreground mt-2">
                Upload receipts and let AI extract the data
              </p>
            </div>
            

            {/* Upload Area */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <div>
                  <div>
                    <input
                      id="receipt-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleInputChange}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all duration-300 ${
                        dragActive
                          ? "border-purple-400 bg-purple-50/50 scale-105"
                          : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                    <div className="space-y-6 text-center">
                      <div className="w-20 h-20 lg:w-24 lg:h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-4 border-white border-t-transparent"></div>
                        ) : (
                          <Upload className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-xl lg:text-2xl font-bold text-gray-900">
                          {dragActive ? "Drop files here" : "Upload Receipt"}
                        </h3>
                        <p className="text-gray-600">
                          Click the button below or drag files here
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="mx-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Select Files
                        </button>
                        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 bg-gray-50 rounded-lg py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileImage className="h-4 w-4" />
                            <span>JPG, PNG, PDF</span>
                          </div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Up to 10MB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>

                  {uploading && (
                    <div className="mt-8 bg-purple-50 rounded-2xl p-6 border border-purple-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Brain className="h-6 w-6 text-purple-600 animate-pulse" />
                          <span className="text-lg font-semibold text-gray-900">Processing with AI</span>
                        </div>
                        <span className="text-xl font-bold text-purple-600">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-3 bg-purple-100" />
                      <p className="text-sm text-purple-700 mt-3 text-center">This usually takes 10-30 seconds</p>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>

          {/* Receipt Results Section */}
          {console.log('uploadedReceipts.length:', uploadedReceipts.length) || (uploadedReceipts.length > 0 || true) && (
            <div className="block bg-white rounded-2xl shadow-sm border border-gray-100 lg:bg-white lg:backdrop-blur-sm lg:border lg:shadow-lg lg:rounded-lg">
              <div className="p-6">
                <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                        Processed Receipts
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {uploadedReceipts.length} {uploadedReceipts.length === 1 ? 'receipt' : 'receipts'} ready
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
                    <div className="flex items-center justify-center sm:justify-start gap-2 bg-green-50 rounded-lg px-3 py-2 sm:bg-transparent sm:p-0">
                      <span className="text-xs sm:text-sm text-muted-foreground">Total: </span>
                      <span className="text-lg sm:text-xl font-bold text-green-600">
                        ${uploadedReceipts.reduce((sum, receipt) => 
                          sum + (receipt.extractedData?.totalAmount || 0), 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    {uploadedReceipts.some(r => r.ocrStatus === 'completed' && !r.saved) && (
                      <Button
                        onClick={saveAllReceipts}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm py-2 sm:py-1.5"
                      >
                        <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                        {saving ? "Saving..." : "Save All"}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Recommendation Message */}
                {uploadedReceipts.some(r => r.ocrStatus === 'completed' && !r.saved) && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Sparkles className="h-2 w-2 sm:h-3 sm:w-3 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs sm:text-sm font-medium text-blue-900 mb-1">
                          💡 Pro Tip: Review Before Saving
                        </h4>
                        <p className="text-xs sm:text-sm text-blue-700">
                          Review and edit line items for accuracy before saving. 
                          Tap "Review" to verify data and add tags.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Mobile: Single column, Desktop: Multiple columns */}
                <div className="space-y-4 md:grid md:gap-4 md:grid-cols-2 lg:grid-cols-3 md:space-y-0">
                  {uploadedReceipts.map((receipt) => (
                    <div 
                      key={receipt.id} 
                      data-receipt-id={receipt.id}
                      className={`group bg-white rounded-xl overflow-hidden transition-all duration-300 border-2 shadow-sm hover:shadow-lg ${
                        selectedReceipt?.id === receipt.id 
                          ? 'border-purple-500 bg-purple-50 shadow-xl ring-2 ring-purple-200' 
                          : receipt.ocrStatus === 'completed' && !receipt.saved
                          ? 'border-green-400 bg-green-50'
                          : receipt.ocrStatus === 'completed' && receipt.saved
                          ? 'border-purple-400 bg-purple-50'
                          : receipt.ocrStatus === 'processing'
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200'
                      }`}>
                      <div className="aspect-[4/3] md:aspect-[3/2] lg:aspect-[4/3] relative bg-gray-100">
                        {receipt.type.startsWith('image/') ? (
                          <Image
                            src={receipt.url}
                            alt={receipt.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                              <FileImage className="h-6 w-6 text-red-600" />
                            </div>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex flex-col gap-1 z-10">
                          {selectedReceipt?.id === receipt.id && (
                            <div className="bg-purple-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs flex items-center gap-1 animate-pulse">
                              <PenTool className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="hidden sm:inline">Editing</span>
                            </div>
                          )}
                          {receipt.ocrStatus === 'processing' && (
                            <div className="bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs flex items-center gap-1">
                              <div className="animate-spin rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border-2 border-white border-t-transparent"></div>
                              <span className="hidden sm:inline">Processing</span>
                            </div>
                          )}
                          {receipt.ocrStatus === 'completed' && selectedReceipt?.id !== receipt.id && (
                            <div className="bg-green-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs flex items-center gap-1">
                              <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="hidden sm:inline">Ready</span>
                            </div>
                          )}
                          {receipt.ocrStatus === 'failed' && (
                            <div className="bg-red-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs flex items-center gap-1">
                              <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="hidden sm:inline">Failed</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Indicator */}
                        {receipt.ocrStatus === 'processing' && ocrProgress[receipt.id] && (
                          <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 right-1.5 sm:right-2">
                            <div className="bg-white/95 backdrop-blur-sm rounded p-1.5 sm:p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] sm:text-xs font-medium text-gray-800 truncate">
                                  {ocrProgress[receipt.id].step}
                                </span>
                                <span className="text-[10px] sm:text-xs text-gray-600 ml-1">
                                  {ocrProgress[receipt.id].progress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-0.5 sm:h-1">
                                <div 
                                  className="bg-blue-500 h-0.5 sm:h-1 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${ocrProgress[receipt.id].progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}

                        <Button
                          variant="secondary"
                          onClick={() => removeFile(receipt.id)}
                          className="absolute top-2 right-2 h-8 w-8 p-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-white/95 hover:bg-white border border-gray-200 shadow-sm touch-target"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                        <div>
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate" title={receipt.name}>
                            {receipt.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {formatFileSize(receipt.size)}
                          </p>
                        </div>
                        
                        {receipt.ocrStatus === 'completed' && receipt.extractedData && (
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Store className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                              <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {receipt.extractedData.vendor}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                              <span className="text-sm sm:text-base font-medium text-green-600">
                                ${receipt.extractedData.totalAmount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                {receipt.extractedData.tags?.length ? `${receipt.extractedData.tags.length} tags` : 'No tags'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 sm:gap-3">
                          <Button
                            variant="outline"
                            onClick={() => window.open(receipt.url, "_blank")}
                            className="flex-1 h-12 text-sm px-3 font-medium touch-target border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                          >
                            View
                          </Button>
                          {receipt.ocrStatus === 'completed' && (
                            <>
                              <Button
                                onClick={() => openEditModal(receipt)}
                                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-sm px-3 font-medium text-white touch-target"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                              <Button
                                onClick={() => saveIndividualReceipt(receipt)}
                                disabled={saving || receipt.saved}
                                className="flex-1 h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-sm px-3 font-medium text-white touch-target"
                              >
                                <Save className="h-4 w-4 mr-2" />
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
        
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 bg-white lg:bg-black/50 lg:backdrop-blur-sm mobile-modal">
            {/* True Mobile-First Edit Panel */}
            <div className="w-full h-full bg-white flex flex-col lg:max-w-3xl lg:mx-auto lg:mt-4 lg:mb-4 lg:rounded-2xl lg:shadow-2xl lg:border lg:border-gray-200 lg:h-auto lg:max-h-[calc(100vh-2rem)] lg:overflow-hidden safe-area-inset">
              {/* Mobile-First Header with Proper Safe Area */}
              <div className="px-4 py-3 safe-area-inset-top border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 lg:bg-white lg:border-purple-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Button 
                      variant="ghost" 
                      onClick={closeEditModal} 
                      className="text-white hover:bg-white/20 lg:text-gray-600 lg:hover:bg-gray-100 h-10 w-10 p-0 touch-target-large rounded-full"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0 text-center lg:text-left">
                      <h2 className="text-lg lg:text-xl font-bold text-white lg:text-gray-900">Edit Receipt</h2>
                      <p className="text-sm text-purple-100 lg:text-gray-600 truncate">
                        {editingData?.vendor || 'Unknown Vendor'}
                      </p>
                    </div>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 lg:bg-purple-100 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-5 w-5 lg:h-6 lg:w-6 text-white lg:text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Content - Mobile Optimized with Better Spacing */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-gray-50 lg:bg-transparent">
                {editingData && (
                  <>
                    {/* Basic Info Card - Mobile-First */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-4">
                      <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                          <Store className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Receipt Details</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="vendor" className="text-sm font-medium text-gray-700">Vendor Name</Label>
                          <Input
                            id="vendor"
                            value={editingData.vendor}
                            onChange={(e) => setEditingData({...editingData, vendor: e.target.value})}
                            className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500 mobile-input"
                            placeholder="Enter vendor name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="date" className="text-sm font-medium text-gray-700">Date</Label>
                            <Input
                              id="date"
                              type="date"
                              value={editingData.date}
                              onChange={(e) => setEditingData({...editingData, date: e.target.value})}
                              className="h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="total" className="text-sm font-medium text-gray-700">Total Amount</Label>
                            <Input
                              id="total"
                              type="number"
                              step="0.01"
                              value={editingData.totalAmount}
                              onChange={(e) => setEditingData({...editingData, totalAmount: parseFloat(e.target.value) || 0})}
                              className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500 mobile-input"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tax" className="text-sm font-medium text-gray-700">Tax Amount</Label>
                          <Input
                            id="tax"
                            type="number"
                            step="0.01"
                            value={editingData.tax}
                            onChange={(e) => setEditingData({...editingData, tax: parseFloat(e.target.value) || 0})}
                            className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500 mobile-input"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tags Card - Mobile Optimized */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-4">
                      <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                          <Tag className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Tags</h3>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Add tags to organize and categorize this receipt
                        </p>
                        <TagInput
                          selectedTags={selectedTags}
                          onTagsChange={(tags) => {
                            const prevTagIds = selectedTags.map(tag => typeof tag === 'string' ? tag : tag.id);
                            const newTagIds = tags.map(tag => typeof tag === 'string' ? tag : tag.id);
                            
                            const addedTags = newTagIds.filter(id => !prevTagIds.includes(id));
                            const removedTags = prevTagIds.filter(id => !newTagIds.includes(id));
                            
                            setSelectedTags(tags);
                            
                            if (editingData) {
                              setEditingData({ ...editingData, tags });
                              
                              if (addedTags.length > 0) {
                                const firstAddedTag = addedTags[0];
                                const updatedLineItems = editingData.lineItems.map(item => {
                                  if (!item.tag || removedTags.includes(item.tag)) {
                                    return { ...item, tag: firstAddedTag };
                                  }
                                  return item;
                                });
                                
                                setEditingData(prev => ({ ...prev, lineItems: updatedLineItems }));
                              } else if (removedTags.length > 0) {
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
                          placeholder="Search or create tags..."
                        />
                      </div>
                    </div>

                    {/* Line Items Card */}
                    <div className="bg-white/80 backdrop-blur-sm border border-purple-200 rounded-xl shadow-lg p-4 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Line Items</h3>
                        </div>
                        <Button onClick={addLineItem} className="h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 text-sm px-4 font-medium touch-target">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                      <div className="space-y-3 sm:space-y-4">
                        {editingData.lineItems.map((item) => (
                          <div key={item.id} className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center justify-between gap-2">
                              <Input
                                value={item.description}
                                onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                placeholder="Item description"
                                className="flex-1 text-sm"
                              />
                              <Button
                                variant="ghost"
                                onClick={() => removeLineItem(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0 touch-target"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
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

              {/* Mobile-First Footer with Perfect Touch Targets */}
              <div className="px-4 py-4 lg:px-6 lg:py-5 border-t border-gray-200 bg-white lg:bg-gray-50 flex gap-3 flex-shrink-0 safe-area-inset-bottom">
                <Button 
                  variant="outline" 
                  onClick={closeEditModal}
                  className="flex-1 lg:flex-none h-12 lg:h-10 text-base lg:text-sm border-2 border-gray-300 lg:border-gray-400 text-gray-700 hover:bg-gray-50 font-medium touch-target-large"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveReceipt} 
                  disabled={saving}
                  className="flex-[2] lg:flex-1 h-12 lg:h-10 text-base lg:text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white border-0 font-medium shadow-lg touch-target-large"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Receipt"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}