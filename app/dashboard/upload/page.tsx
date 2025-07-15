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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Trash2
} from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getOCRProcessor } from "@/lib/ocr-processor";

interface ExtractedLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

interface ExtractedData {
  vendor: string;
  date: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  lineItems: ExtractedLineItem[];
  notes: string;
  category: string;
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

// Smart category system with common business categories
const CATEGORY_GROUPS = {
  "Common": [
    "Office Supplies",
    "Travel & Transportation",
    "Meals & Entertainment",
    "Equipment & Software",
    "Professional Services",
  ],
  "Operations": [
    "Rent & Facilities",
    "Utilities",
    "Insurance",
    "Maintenance & Repairs",
    "Shipping & Delivery",
  ],
  "Marketing": [
    "Marketing & Advertising",
    "Social Media",
    "Content Creation",
    "Events & Promotions",
  ],
  "HR & Development": [
    "Salaries & Wages",
    "Training & Education",
    "Employee Benefits",
    "Recruitment",
  ],
  "Financial": [
    "Banking Fees",
    "Accounting & Legal",
    "Taxes & Licenses",
    "Interest & Loans",
  ],
  "Industry Specific": [
    "Raw Materials",
    "Inventory",
    "Research & Development",
    "Other",
  ],
};

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<UploadedReceipt | null>(null);
  const [editingData, setEditingData] = useState<ExtractedData | null>(null);
  const [saving, setSaving] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [ocrProgress, setOcrProgress] = useState<{[key: string]: {step: string, progress: number}}>({});

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
        category: result.category,
        notes: result.notes || '',
        lineItems: result.lineItems || [],
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
    }
  };

  const closeEditModal = () => {
    setSelectedReceipt(null);
    setEditingData(null);
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

  const saveReceipt = async () => {
    if (!editingData || !selectedReceipt) return;
    
    setSaving(true);
    try {
      // TODO: Call actual save API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUploadedReceipts(prev =>
        prev.map(receipt =>
          receipt.id === selectedReceipt.id
            ? { ...receipt, extractedData: editingData }
            : receipt
        )
      );
      
      toast.success("Receipt saved successfully!");
      closeEditModal();
    } catch (error) {
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
                    <div key={receipt.id} className="group bg-gray-50 dark:bg-gray-900/50 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700">
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
                        <div className="absolute top-3 left-3">
                          {receipt.ocrStatus === 'processing' && (
                            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg">
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              Processing
                            </div>
                          )}
                          {receipt.ocrStatus === 'completed' && (
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
                                {receipt.extractedData.category}
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

      {/* Modern Edit Modal */}
      <Dialog open={!!selectedReceipt} onOpenChange={closeEditModal}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-6 border-b bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Review Receipt</h2>
                  <p className="text-muted-foreground">Verify and adjust the extracted data</p>
                </div>
              </div>
              {editingData && (
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="gap-2 px-3 py-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(editingData.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </Badge>
                  <Badge className="gap-2 px-3 py-1 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                    <DollarSign className="h-4 w-4" />
                    ${editingData.totalAmount.toFixed(2)}
                  </Badge>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {editingData && (
              <div className="space-y-8">
                {/* Modern Basic Info Section */}
                <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <Store className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Details</h3>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-3">
                      <Label htmlFor="vendor" className="text-sm font-medium">Vendor</Label>
                      <div className="relative">
                        <Store className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="vendor"
                          value={editingData.vendor}
                          onChange={(e) => setEditingData({...editingData, vendor: e.target.value})}
                          className="pl-10 h-12 text-base"
                          placeholder="Business name"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="date" className="text-sm font-medium">Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="date"
                          type="date"
                          value={editingData.date}
                          onChange={(e) => setEditingData({...editingData, date: e.target.value})}
                          className="pl-10 h-12 text-base"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="total" className="text-sm font-medium">Total Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="total"
                          type="number"
                          step="0.01"
                          value={editingData.totalAmount}
                          onChange={(e) => setEditingData({...editingData, totalAmount: parseFloat(e.target.value) || 0})}
                          className="pl-10 h-12 text-base font-medium"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Category Row */}
                  <div className="grid gap-6 md:grid-cols-1 mt-6">
                    <div className="space-y-3">
                      <Label htmlFor="category" className="text-sm font-medium">Primary Category</Label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground z-10" />
                        <Select
                          value={editingData.category}
                          onValueChange={(value) => setEditingData({...editingData, category: value})}
                        >
                          <SelectTrigger className="pl-10 h-12 text-base">
                            <SelectValue placeholder="Select primary category" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {/* Custom Categories */}
                            {customCategories.length > 0 && (
                              <>
                                <SelectItem value="_custom_header" disabled className="text-xs font-semibold text-muted-foreground">
                                  Custom Categories
                                </SelectItem>
                                {customCategories.map((category) => (
                                  <SelectItem key={`custom-${category}`} value={category} className="pl-6">
                                    {category}
                                  </SelectItem>
                                ))}
                                <Separator className="my-2" />
                              </>
                            )}
                            {/* Grouped Categories */}
                            {Object.entries(CATEGORY_GROUPS).map(([group, categories]) => (
                              <div key={group}>
                                <SelectItem value={`_${group}_header`} disabled className="text-xs font-semibold text-muted-foreground">
                                  {group}
                                </SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category} className="pl-6">
                                    {category}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                            <Separator className="my-2" />
                            <div className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  const newCategory = prompt("Enter new category name:");
                                  if (newCategory && !customCategories.includes(newCategory)) {
                                    setCustomCategories([...customCategories, newCategory]);
                                    setEditingData({...editingData, category: newCategory});
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Custom Category
                              </Button>
                            </div>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="grid gap-4 md:grid-cols-3 mt-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm">Subtotal</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={editingData.subtotal}
                          onChange={(e) => setEditingData({...editingData, subtotal: parseFloat(e.target.value) || 0})}
                          className="text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Tax</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={editingData.tax}
                          onChange={(e) => setEditingData({...editingData, tax: parseFloat(e.target.value) || 0})}
                          className="text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Currency</Label>
                      <Select value="USD" disabled>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Modern Line Items Section */}
                <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <FileImage className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h3>
                        <p className="text-sm text-muted-foreground">{editingData.lineItems.length} items • ${editingData.lineItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)} total</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={addLineItem}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                
                  {/* Modern Card-based Line Items */}
                  <div className="space-y-4">
                    {editingData.lineItems.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Plus className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No items added yet</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Click "Add Item" to start adding line items</p>
                      </div>
                    ) : (
                      editingData.lineItems.map((item, index) => (
                        <div key={item.id} className="group bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 space-y-4">
                              {/* Item Description */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                  placeholder="Enter item description"
                                  className="h-11 text-base font-medium border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-purple-500"
                                />
                              </div>
                              
                              {/* Category and Quantity Row - Stacked for better spacing */}
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                                  <Select
                                    value={item.category || ""}
                                    onValueChange={(value) => updateLineItem(item.id, 'category', value)}
                                  >
                                    <SelectTrigger className="h-11 text-base border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-purple-500">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {/* Custom Categories */}
                                      {customCategories.length > 0 && (
                                        <>
                                          <SelectItem value="_custom_header" disabled className="text-xs font-semibold text-muted-foreground">
                                            Custom Categories
                                          </SelectItem>
                                          {customCategories.map((category) => (
                                            <SelectItem key={`custom-${category}`} value={category} className="pl-6">
                                              {category}
                                            </SelectItem>
                                          ))}
                                          <Separator className="my-2" />
                                        </>
                                      )}
                                      {/* Grouped Categories */}
                                      {Object.entries(CATEGORY_GROUPS).map(([group, categories]) => (
                                        <div key={group}>
                                          <SelectItem value={`_${group}_header`} disabled className="text-xs font-semibold text-muted-foreground">
                                            {group}
                                          </SelectItem>
                                          {categories.map((category) => (
                                            <SelectItem key={category} value={category} className="pl-6">
                                              {category}
                                            </SelectItem>
                                          ))}
                                        </div>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</Label>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="1"
                                    className="h-11 text-base border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-purple-500"
                                    placeholder="1"
                                  />
                                </div>
                              </div>
                              
                              {/* Pricing Row - Better spacing */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price</Label>
                                  <div className="relative">
                                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="0.01"
                                      className="pl-10 h-11 text-base border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-purple-500"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Price</Label>
                                  <div className="flex items-center h-11 px-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                    <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                                    <span className="font-semibold text-base text-green-700 dark:text-green-400">
                                      {item.totalPrice.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Delete Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeLineItem(item.id)}
                              className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Items Summary */}
                    {editingData.lineItems.length > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                              <Receipt className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-green-800 dark:text-green-300">Line Items Total</p>
                              <p className="text-sm text-green-600 dark:text-green-400">{editingData.lineItems.length} items</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                              ${editingData.lineItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modern Notes Section */}
                <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <FileImage className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Notes</h3>
                  </div>
                  <Textarea
                    id="notes"
                    value={editingData.notes}
                    onChange={(e) => setEditingData({...editingData, notes: e.target.value})}
                    placeholder="Add any additional notes, special instructions, or reminders..."
                    rows={4}
                    className="resize-none text-base border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-6 border-t bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {editingData && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      editingData.lineItems.length > 0 ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Extracted with {editingData.lineItems.length > 0 ? 'high' : 'moderate'} confidence
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={closeEditModal}
                  className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveReceipt} 
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg px-6"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Receipt
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}