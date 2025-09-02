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
  PenTool,
  ArrowLeft,
  Camera,
  ImageIcon
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
  tag?: string; // Single tag ID
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
  imageUrl?: string;
  size: number;
  type: string;
  uploadedAt: Date;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: ExtractedData;
  saved?: boolean;
  dbReceiptId?: string;
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

export default function MobileUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<UploadedReceipt | null>(null);
  const [editingData, setEditingData] = useState<ExtractedData | null>(null);
  const [saving, setSaving] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{[key: string]: {step: string, progress: number}}>({});
  
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
          imageUrl: url,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          ocrStatus: 'pending',
        };

        setUploadedReceipts((prev) => [uploadedReceipt, ...prev]);
        toast.success(`${file.name} uploaded successfully`);
        
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

      updateProgress('Analyzing receipt...', 20);
      
      // For demo purposes, simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateProgress('Extracting text...', 50);
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateProgress('Processing with AI...', 80);
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgress('Complete!', 100);

      // Mock extracted data
      const extractedData: ExtractedData = {
        vendor: "Sample Store",
        date: new Date().toISOString().split('T')[0],
        totalAmount: 25.99,
        subtotal: 23.99,
        tax: 2.00,
        notes: '',
        lineItems: [
          {
            id: crypto.randomUUID(),
            description: "Sample Item",
            quantity: 1,
            unitPrice: 23.99,
            totalPrice: 23.99,
          }
        ],
        tags: [],
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
      
      toast.success(`Receipt processed - Click "Review" to verify data`);
      
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
      
      setOcrProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[receiptId];
        return newProgress;
      });
      
      toast.error('Failed to process receipt');
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
      setSelectedTags(receipt.extractedData.tags || []);
      
      // Prevent body scroll on mobile
      document.body.style.overflow = 'hidden';
    }
  };

  const closeEditModal = () => {
    setSelectedReceipt(null);
    setEditingData(null);
    setSelectedTags([]);
    document.body.style.overflow = 'unset';
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
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUploadedReceipts(prev =>
        prev.map(receipt =>
          receipt.id === selectedReceipt.id
            ? { 
                ...receipt, 
                extractedData: { ...editingData, tags: selectedTags.map(tag => typeof tag === 'string' ? tag : tag.id) }, 
                saved: true,
              }
            : receipt
        )
      );
      
      toast.success("Receipt saved successfully!");
      closeEditModal();
    } catch (error) {
      console.error('Save receipt error:', error);
      toast.error("Failed to save receipt");
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="safe-area-inset">
        {/* Mobile-First Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40">
          <div className="px-4 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl mb-3">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Upload Receipts
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                AI-powered receipt processing
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Mobile Upload Area */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="p-6">
              <div
                className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 touch-manipulation ${
                  dragActive
                    ? "border-purple-400 bg-purple-50/80 scale-[1.02]"
                    : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/30"
                } ${
                  uploading 
                    ? "border-blue-400 bg-blue-50/30" 
                    : ""
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
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={uploading}
                />
                
                <div className="relative z-0 p-8 text-center">
                  {/* Upload Icon with Responsive Animation */}
                  <div className="relative mx-auto mb-6">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      uploading 
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse" 
                        : dragActive 
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 scale-110" 
                        : "bg-gradient-to-r from-purple-600 to-blue-600"
                    }`}>
                      {uploading ? (
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                      ) : (
                        <Upload className={`text-white transition-all duration-300 ${
                          dragActive ? "h-12 w-12" : "h-10 w-10"
                        }`} />
                      )}
                    </div>
                    
                    {/* Floating Animation Dots */}
                    {dragActive && (
                      <>
                        <div className="absolute -top-2 -right-2 w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                        <div className="absolute top-1/2 -left-4 w-2.5 h-2.5 bg-purple-300 rounded-full animate-bounce" style={{animationDelay: '400ms'}}></div>
                      </>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className={`font-bold transition-all duration-300 ${
                      uploading 
                        ? "text-xl text-blue-600" 
                        : dragActive 
                        ? "text-2xl text-purple-600" 
                        : "text-xl text-gray-900"
                    }`}>
                      {uploading ? "Processing..." : dragActive ? "Drop here!" : "Upload Receipts"}
                    </h3>
                    
                    {!uploading && (
                      <>
                        <p className="text-gray-600 text-base">
                          {dragActive ? "Release to upload" : "Tap to browse or drag files here"}
                        </p>
                        
                        {/* File Format Info - Mobile Optimized */}
                        <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <FileImage className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">JPG, PNG, PDF files</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">10</span>
                            </div>
                            <span className="font-medium">Up to 10MB per file</span>
                          </div>
                        </div>
                        
                        {/* Mobile Camera Option */}
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.capture = 'environment';
                              input.multiple = true;
                              input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement).files;
                                if (files) handleFileUpload(files);
                              };
                              input.click();
                            }}
                          >
                            <Camera className="h-5 w-5 mr-2 text-purple-600" />
                            <span className="font-medium">Take Photo</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Upload Progress */}
              {uploading && (
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-200/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-gray-900">AI Processing</h4>
                      <p className="text-sm text-gray-600">Extracting receipt data...</p>
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {Math.round(uploadProgress)}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-3 bg-white/50" />
                    <p className="text-xs text-gray-600 text-center">
                      Usually takes 10-30 seconds • AI-powered extraction
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile-First Receipt Results */}
          {uploadedReceipts.length > 0 && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
              <div className="p-4">
                {/* Enhanced Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        Processed Receipts
                      </h3>
                      <p className="text-sm text-gray-600">
                        {uploadedReceipts.length} receipt{uploadedReceipts.length !== 1 ? 's' : ''} ready
                      </p>
                    </div>
                  </div>
                  
                  {/* Stats - Mobile Optimized */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                      <div className="text-xs text-gray-600 mb-1">Total Amount</div>
                      <div className="text-xl font-bold text-green-700">
                        ${uploadedReceipts.reduce((sum, receipt) => 
                          sum + (receipt.extractedData?.totalAmount || 0), 0
                        ).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-3 border border-purple-200">
                      <div className="text-xs text-gray-600 mb-1">Completed</div>
                      <div className="text-xl font-bold text-purple-700">
                        {uploadedReceipts.filter(r => r.ocrStatus === 'completed').length}
                      </div>
                    </div>
                  </div>
                  
                  {/* Pro Tip */}
                  {uploadedReceipts.some(r => r.ocrStatus === 'completed' && !r.saved) && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900 mb-1">
                            💡 Review for Accuracy
                          </h4>
                          <p className="text-sm text-gray-700">
                            Tap <strong>"Review"</strong> to verify data and add tags before saving.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Receipt Cards - Mobile Stack */}
                <div className="space-y-4">
                  {uploadedReceipts.map((receipt) => (
                    <div 
                      key={receipt.id}
                      className={`group bg-white rounded-xl overflow-hidden transition-all duration-300 border-2 shadow-sm ${
                        receipt.ocrStatus === 'completed' && !receipt.saved
                          ? 'border-green-400 bg-green-50/30'
                          : receipt.ocrStatus === 'completed' && receipt.saved
                          ? 'border-purple-400 bg-purple-50/30'
                          : receipt.ocrStatus === 'processing'
                          ? 'border-blue-400 bg-blue-50/30'
                          : 'border-gray-200'
                      }`}>
                      
                      {/* Image Section */}
                      <div className="relative h-48 bg-gray-100">
                        {receipt.type.startsWith('image/') ? (
                          <Image
                            src={receipt.url}
                            alt={receipt.name}
                            fill
                            className="object-cover"
                            sizes="100vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                              <FileImage className="h-8 w-8 text-red-600" />
                            </div>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <div className="absolute top-3 left-3">
                          {receipt.ocrStatus === 'processing' && (
                            <div className="bg-blue-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              Processing
                            </div>
                          )}
                          {receipt.ocrStatus === 'completed' && (
                            <div className="bg-green-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Ready
                            </div>
                          )}
                          {receipt.ocrStatus === 'failed' && (
                            <div className="bg-red-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                              <X className="h-3 w-3" />
                              Failed
                            </div>
                          )}
                        </div>

                        {/* Progress Indicator */}
                        {receipt.ocrStatus === 'processing' && ocrProgress[receipt.id] && (
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-800 truncate">
                                  {ocrProgress[receipt.id].step}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {ocrProgress[receipt.id].progress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1">
                                <div 
                                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${ocrProgress[receipt.id].progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className="text-base font-bold text-gray-900 truncate">
                            {receipt.name}
                          </h4>
                          <p className="text-sm text-gray-500">
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
                              <span className="text-base font-bold text-green-600">
                                ${receipt.extractedData.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons - Mobile Optimized */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(receipt.url, "_blank")}
                            className="flex-1 h-10 text-sm"
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          
                          {receipt.ocrStatus === 'completed' && (
                            <Button
                              size="sm"
                              onClick={() => openEditModal(receipt)}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 h-10 text-sm"
                            >
                              <Edit className="h-4 w-4 mr-2" />
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
          )}
        </div>
      </div>

      {/* Full-Screen Mobile Edit Modal */}
      {selectedReceipt && editingData && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full flex flex-col">
            {/* Mobile Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-4 flex items-center gap-3 shadow-lg">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={closeEditModal} 
                className="text-white hover:bg-white/20 p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h2 className="text-lg font-bold">Edit Receipt</h2>
                <p className="text-sm text-purple-100 truncate">
                  {editingData.vendor}
                </p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
              {/* Basic Info */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Store className="h-5 w-5 text-purple-600" />
                  Receipt Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Vendor</Label>
                    <Input
                      value={editingData.vendor}
                      onChange={(e) => setEditingData({...editingData, vendor: e.target.value})}
                      className="mt-1 h-12 text-base"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Date</Label>
                      <Input
                        type="date"
                        value={editingData.date}
                        onChange={(e) => setEditingData({...editingData, date: e.target.value})}
                        className="mt-1 h-12"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Total Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingData.totalAmount}
                        onChange={(e) => setEditingData({...editingData, totalAmount: parseFloat(e.target.value) || 0})}
                        className="mt-1 h-12"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-purple-600" />
                  Tags
                </h3>
                <TagInput
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  categories={tagCategories}
                  placeholder="Add tags..."
                />
              </div>

              {/* Line Items */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-purple-600" />
                    Items
                  </h3>
                  <Button onClick={addLineItem} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {editingData.lineItems.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                          className="flex-1 h-10 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600">Qty</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                            className="text-sm h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="text-sm h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Total</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.totalPrice}
                            onChange={(e) => updateLineItem(item.id, 'totalPrice', parseFloat(e.target.value) || 0)}
                            className="text-sm h-9"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="bg-white border-t border-gray-200 p-4 flex gap-3">
              <Button 
                variant="outline" 
                onClick={closeEditModal}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveReceipt} 
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-12"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}