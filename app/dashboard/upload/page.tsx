"use client";

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
import AIChatAgent from '@/components/ai-chat-agent';
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
// Dynamic import of OCR processor to avoid server-side issues
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
  size: number;
  type: string;
  uploadedAt: Date;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: ExtractedData;
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

        const { url } = await response.json();

        const uploadedReceipt: UploadedReceipt = {
          id: crypto.randomUUID(),
          name: file.name,
          url,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          ocrStatus: 'pending',
        };

        setUploadedReceipts((prev) => [uploadedReceipt, ...prev]);
        toast.success(`${file.name} uploaded successfully`);
        
        // Process OCR with the original file for better quality
        processReceiptOCR(uploadedReceipt.id, file);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const processReceiptOCR = async (receiptId: string, file: File) => {
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
        toast.info(isPdf ? 'Converting PDF and starting OCR processing...' : 'Starting browser-based OCR processing...');
        
        // Dynamic import to avoid server-side issues
        const { getOCRProcessor } = await import('@/lib/ocr-processor');
        const ocrProcessor = getOCRProcessor();
        
        if (isPdf) {
          updateProgress('Converting PDF to image...', 20);
          await new Promise(resolve => setTimeout(resolve, 500)); // Allow UI update
          updateProgress('Extracting text from PDF...', 60);
        } else {
          updateProgress('Preprocessing image...', 30);
          await new Promise(resolve => setTimeout(resolve, 500)); // Allow UI update
          updateProgress('Extracting text...', 60);
        }
        
        result = await ocrProcessor.processImage(file);
        processingMethod = 'browser';
        
        updateProgress('Analyzing results...', 90);
        
        // If confidence is too low, try server-side processing
        if (result.confidence < 50) {
          updateProgress('Low confidence detected, switching to AI...', 95);
          throw new Error('Low confidence, attempting server-side processing');
        }
        
        updateProgress('Processing complete!', 100);
      } catch (clientError) {
        console.warn('Client-side OCR failed or low confidence, trying server-side:', clientError);
        
        try {
          updateProgress('Connecting to AI server...', 20);
          toast.info('Switching to AI-powered server processing...');
          
          // Convert file to base64 for server processing
          updateProgress('Preparing image data...', 40);
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          
          const imageData = await base64Promise;
          
          updateProgress('Sending to AI processor...', 60);
          
          // Call server-side processing API
          const response = await fetch('/api/process-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageData }),
          });
          
          if (!response.ok) {
            throw new Error(`Server processing failed: ${response.status}`);
          }
          
          updateProgress('Receiving AI results...', 80);
          
          const serverResult = await response.json();
          if (serverResult.success) {
            result = serverResult.data;
            processingMethod = serverResult.source === 'ollama' ? 'local-ai' : 'cloud-ai';
            updateProgress('AI processing complete!', 100);
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
        ? ' (Browser OCR)'
        : processingMethod === 'local-ai'
        ? ' (Local AI)'
        : ' (Cloud AI)';
      
      toast.success(`Receipt processed with ${Math.round(result.confidence)}% confidence!${confidenceMsg}${methodMsg} Click "Review & Edit" to verify data.`);
      
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

      // Call the save-receipt API
      const response = await fetch('/api/save-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...saveData,
          imageUrl: selectedReceipt.imageUrl || 'placeholder',
          confidence: 85, // Default confidence score
          forceSave: false // Can be set to true to bypass similar vendor warnings
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
          },
          body: JSON.stringify({
            ...saveData,
            imageUrl: selectedReceipt.imageUrl || 'placeholder',
            confidence: 85,
            forceSave: true
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
            ? { ...receipt, extractedData: { ...editingData, tags: selectedTags }, saved: true }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Modern Header */}
      <div className="px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Receipt className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Receipt Processing
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg mt-1">
                  Upload, extract, and categorize receipts with AI-powered precision
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Upload Area */}
      <div className="px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Upload Zone */}
            <div className="p-8">
              <div className="grid lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2">
                  <div
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                      dragActive
                        ? "border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 scale-105"
                        : "border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                        ) : (
                          <Upload className="h-10 w-10 text-white" />
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {dragActive ? "Drop your receipts here" : "Upload your receipts"}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          Drag and drop or click to select files
                        </p>
                        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
                    <div className="mt-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-600 animate-pulse" />
                          <span className="font-medium text-gray-900 dark:text-white">Processing with AI...</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>

                {/* Modern Features */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Powered by AI</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Universal File Support</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Images + PDFs with smart processing</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Check className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Auto Categorization</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Intelligent expense sorting</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <Check className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">100% Private</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Never leaves your browser</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                          <Check className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Price Tracking</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Anomaly detection</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Receipt Grid */}
      {uploadedReceipts.length > 0 && (
        <div className="px-8 pb-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Receipt className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Processed Receipts
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {uploadedReceipts.length} {uploadedReceipts.length === 1 ? 'receipt' : 'receipts'} ready for review
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total: </span>
                    <span className="text-xl font-bold text-green-600">
                      ${uploadedReceipts.reduce((sum, receipt) => 
                        sum + (receipt.extractedData?.totalAmount || 0), 0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {uploadedReceipts.map((receipt) => (
                    <div 
                      key={receipt.id} 
                      data-receipt-id={receipt.id}
                      className={`group bg-gray-50 dark:bg-gray-900/50 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 border ${
                        selectedReceipt?.id === receipt.id 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg ring-2 ring-purple-200 dark:ring-purple-800 transform scale-105' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                      <div className="aspect-[4/3] relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
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
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                              <FileImage className="h-8 w-8 text-red-600" />
                            </div>
                          </div>
                        )}
                        
                        {/* Modern Status Badge */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {selectedReceipt?.id === receipt.id && (
                            <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg animate-pulse">
                              <PenTool className="h-3 w-3" />
                              Editing
                            </div>
                          )}
                          {receipt.ocrStatus === 'processing' && (
                            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg">
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              Processing
                            </div>
                          )}
                          {receipt.ocrStatus === 'completed' && selectedReceipt?.id !== receipt.id && (
                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg">
                              <Check className="h-3 w-3" />
                              Ready
                            </div>
                          )}
                          {receipt.ocrStatus === 'failed' && (
                            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg">
                              <X className="h-3 w-3" />
                              Failed
                            </div>
                          )}
                        </div>

                        {/* Progress Indicator */}
                        {receipt.ocrStatus === 'processing' && ocrProgress[receipt.id] && (
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-800">
                                  {ocrProgress[receipt.id].step}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {ocrProgress[receipt.id].progress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
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
                          className="absolute top-3 right-3 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white shadow-lg"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate" title={receipt.name}>
                            {receipt.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(receipt.size)}
                          </p>
                        </div>
                        
                        {receipt.ocrStatus === 'completed' && receipt.extractedData && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {receipt.extractedData.vendor}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="text-lg font-bold text-green-600">
                                ${receipt.extractedData.totalAmount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-gray-600 dark:text-gray-300">
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
                            <Button
                              size="sm"
                              onClick={() => openEditModal(receipt)}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Side Panel */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop - only covers the left side */}
          <div className="flex-1 bg-black/20" onClick={closeEditModal} />
          
          {/* Side Panel */}
          <div className="w-full max-w-2xl bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-purple-600" />
                  <div>
                    <h2 className="text-lg font-semibold">Edit Receipt</h2>
                    <p className="text-sm text-gray-600">
                      {editingData?.vendor || 'Unknown Vendor'} • {editingData?.date ? new Date(editingData.date).toLocaleDateString() : 'No Date'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={closeEditModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {editingData && (
                <>
                  {/* Basic Info Card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-medium text-gray-900">Receipt Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vendor" className="text-sm font-medium">Vendor</Label>
                        <Input
                          id="vendor"
                          value={editingData.vendor}
                          onChange={(e) => setEditingData({...editingData, vendor: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="date" className="text-sm font-medium">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={editingData.date}
                          onChange={(e) => setEditingData({...editingData, date: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="total" className="text-sm font-medium">Total Amount</Label>
                        <Input
                          id="total"
                          type="number"
                          step="0.01"
                          value={editingData.totalAmount}
                          onChange={(e) => setEditingData({...editingData, totalAmount: parseFloat(e.target.value) || 0})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tax" className="text-sm font-medium">Tax</Label>
                        <Input
                          id="tax"
                          type="number"
                          step="0.01"
                          value={editingData.tax}
                          onChange={(e) => setEditingData({...editingData, tax: parseFloat(e.target.value) || 0})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags Card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-medium text-gray-900">Tags</h3>
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
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Line Items</h3>
                      <Button onClick={addLineItem} size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {editingData.lineItems.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
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
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Unit Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Total</Label>
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
                            <Label className="text-xs">Tag (Choose one)</Label>
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
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
              <Button variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button onClick={saveReceipt} disabled={saving}>
                {saving ? "Saving..." : "Save Receipt"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Chat Agent */}
      <AIChatAgent />
    </div>
  );
}