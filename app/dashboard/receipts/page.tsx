"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Calendar,
  DollarSign,
  Store,
  Filter,
  Eye,
  Receipt,
  Package,
  Download,
  RefreshCw,
  X,
  FileSpreadsheet,
  MapPin,
  Clock,
  Tag,
  TrendingUp,
  Archive,
  Tags,
  Plus,
  Grid3X3,
  List,
  CalendarDays,
  CreditCard,
  Building2,
  Hash,
  AlertCircle,
  CheckCircle2,
  Zap,
  Edit3,
  Save,
  RotateCcw,
  ImageIcon,
  ExternalLink,
  Trash2,
  Copy,
  AlertTriangle,
  Check,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Image as ImageLucide
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import AIChatAgent from '@/components/ai-chat-agent';
import { TagInput } from '@/components/ui/tag-input';
import { toast } from "sonner";

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}

interface ReceiptData {
  id: string;
  receipt_date: string;
  total_amount: number;
  tax_amount: number;
  currency: string;
  notes: string;
  confidence: number;
  ocr_status: string;
  created_at: string;
  vendor: {
    id: string;
    name: string;
    category: string;
  };
  lineItems: Array<{
    id: string;
    line_number: number;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    sku: string;
    tags: Array<{
      id: string;
      name: string;
      color: string;
      category: {
        id: string;
        name: string;
        color: string;
      };
    }>;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
    category: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface TagCategory {
  id: string;
  name: string;
  color: string;
  required: boolean;
  multiple: boolean;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  category: {
    id: string;
    name: string;
  };
}

interface SelectedTag extends Tag {
  categoryName: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Edit mode states
  const [editingReceipt, setEditingReceipt] = useState<string | null>(null);
  const [editingLineItem, setEditingLineItem] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  
  // Enhanced edit states
  const [editingReceiptData, setEditingReceiptData] = useState<any>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [editingTags, setEditingTags] = useState<SelectedTag[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Image viewer states
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [showImageFullscreen, setShowImageFullscreen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Enhanced tag filtering
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedTagCategory, setSelectedTagCategory] = useState<string>("all");
  
  // Date range presets
  const [datePreset, setDatePreset] = useState<string>('custom');

  // Search function
  const searchReceipts = async (query: string, start?: string, end?: string, tagIds?: string[], tagCategoryId?: string) => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);
      if (tagIds && tagIds.length > 0) params.append('tags', tagIds.join(','));
      if (tagCategoryId && tagCategoryId !== 'all') params.append('tagCategory', tagCategoryId);

      const response = await fetch(`/api/receipts/search?${params}`);
      if (response.ok) {
        const result = await response.json();
        setReceipts(result.data || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string, start?: string, end?: string, tagIds?: string[], tagCategoryId?: string) => {
      searchReceipts(query, start, end, tagIds, tagCategoryId);
    }, 300),
    []
  );

  // Load tag data on mount
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

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await searchReceipts("", "", "");
      setLoading(false);
    };
    loadInitialData();
  }, []);

  // Handle date preset changes
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    switch (preset) {
      case 'today':
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case 'this-week':
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        setStartDate(formatDate(weekStart));
        setEndDate(formatDate(new Date()));
        break;
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(formatDate(monthStart));
        setEndDate(formatDate(new Date()));
        break;
      case 'last-30-days':
        const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
        setStartDate(formatDate(thirtyDaysAgo));
        setEndDate(formatDate(new Date()));
        break;
      case 'this-year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setStartDate(formatDate(yearStart));
        setEndDate(formatDate(new Date()));
        break;
      case 'custom':
        // Keep current dates
        break;
    }
  };

  // Search when filters change
  useEffect(() => {
    debouncedSearch(searchQuery, startDate, endDate, selectedTagIds, selectedTagCategory);
  }, [searchQuery, startDate, endDate, selectedTagIds, selectedTagCategory, debouncedSearch]);


  // Edit functionality handlers
  const handleEditReceipt = (receipt: ReceiptData) => {
    setEditingReceipt(receipt.id);
    setEditingReceiptData(receipt);
    setEditingNotes(receipt.notes || "");
    
    // Convert receipt tags to SelectedTag format
    const selectedTags: SelectedTag[] = receipt.tags.map(tag => ({
      ...tag,
      categoryName: tag.category.name
    }));
    setEditingTags(selectedTags);
  };

  const handleSaveReceipt = async () => {
    if (!editingReceiptData) return;
    
    setSaving(true);
    try {
      const updates = {
        // Receipt-level fields
        vendor: editingReceiptData.vendor.name,
        receipt_date: editingReceiptData.receipt_date,
        total_amount: editingReceiptData.total_amount,
        tax_amount: editingReceiptData.tax_amount,
        notes: editingNotes,
        tags: editingTags.map(tag => typeof tag === 'string' ? tag : tag.id),
        
        // Line items with their tags
        lineItems: editingReceiptData.lineItems.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sku: item.sku || null,
          tags: item.tag ? [item.tag] : (item.tags ? item.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.id) : [])
        }))
      };

      console.log('Saving receipt with updates:', updates);
      
      const response = await fetch(`/api/receipts/${editingReceiptData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh the receipts list
          await searchReceipts(searchQuery, startDate, endDate, selectedTagIds, selectedTagCategory);
          handleCancelEdit();
          
          // Show success message
          toast.success("Receipt updated successfully!");
          console.log('Receipt updated successfully');
        } else {
          console.error('Server returned error:', result.error);
          toast.error('Failed to update receipt: ' + (result.error || 'Unknown error'));
        }
      } else {
        const errorText = await response.text();
        console.error('HTTP error:', response.status, errorText);
        toast.error('Failed to update receipt: HTTP ' + response.status);
      }
    } catch (error) {
      console.error('Failed to update receipt:', error);
      toast.error('Failed to update receipt: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingReceipt(null);
    setEditingLineItem(null);
    setEditingReceiptData(null);
    setEditingNotes("");
    setEditingTags([]);
  };

  // Line item editing functions (similar to upload page)
  const addLineItem = () => {
    if (!editingReceiptData) return;
    
    const newItem = {
      id: crypto.randomUUID(),
      line_number: editingReceiptData.lineItems.length + 1,
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      sku: "",
      tag: undefined // Single tag for line items
    };
    
    setEditingReceiptData({
      ...editingReceiptData,
      lineItems: [...editingReceiptData.lineItems, newItem]
    });
  };

  const removeLineItem = (itemId: string) => {
    if (!editingReceiptData) return;
    
    setEditingReceiptData({
      ...editingReceiptData,
      lineItems: editingReceiptData.lineItems.filter((item: any) => item.id !== itemId)
    });
  };

  const updateLineItem = (itemId: string, field: string, value: any) => {
    if (!editingReceiptData) return;
    
    setEditingReceiptData({
      ...editingReceiptData,
      lineItems: editingReceiptData.lineItems.map((item: any) =>
        item.id === itemId 
          ? { 
              ...item, 
              [field]: value,
              // Auto-calculate total_price when quantity or unit_price changes
              total_price: field === 'quantity' || field === 'unit_price' 
                ? (field === 'quantity' ? value : item.quantity) * (field === 'unit_price' ? value : item.unit_price)
                : item.total_price 
            }
          : item
      )
    });
  };

  const updateLineItemTag = (itemId: string, tagId: string | undefined) => {
    updateLineItem(itemId, 'tag', tagId);
  };

  // Image viewing handlers
  const handleViewImage = (imageUrl: string) => {
    setCurrentImageUrl(imageUrl);
    setShowImageViewer(true);
    setImageZoom(1);
    setImageRotation(0);
  };
  
  const handleCloseImageViewer = () => {
    setShowImageViewer(false);
    setShowImageFullscreen(false);
    setCurrentImageUrl(null);
    setImageZoom(1);
    setImageRotation(0);
  };
  
  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.25));
  };
  
  const handleRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };
  
  const handleResetImage = () => {
    setImageZoom(1);
    setImageRotation(0);
  };

  // Bulk actions handlers
  const handleSelectReceipt = (receiptId: string, selected: boolean) => {
    if (selected) {
      setSelectedReceiptIds(prev => [...prev, receiptId]);
    } else {
      setSelectedReceiptIds(prev => prev.filter(id => id !== receiptId));
    }
  };

  const handleBulkTagUpdate = async (tagId: string) => {
    if (selectedReceiptIds.length === 0) return;
    
    try {
      const response = await fetch('/api/receipts/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptIds: selectedReceiptIds,
          action: 'add_tag',
          tagId,
        }),
      });

      if (response.ok) {
        await searchReceipts(searchQuery, startDate, endDate, selectedTagIds, selectedTagCategory);
        setSelectedReceiptIds([]);
      }
    } catch (error) {
      console.error('Bulk update failed:', error);
    }
  };

  const handleDuplicateDetection = async () => {
    try {
      const response = await fetch('/api/receipts/duplicates');
      if (response.ok) {
        const duplicates = await response.json();
        // Handle duplicate detection results
        console.log('Duplicates found:', duplicates);
      }
    } catch (error) {
      console.error('Duplicate detection failed:', error);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Helper function to format tags for Excel
      const formatTagsForExcel = (tags: any[]) => {
        if (tags.length === 0) return { tagNames: '', tagCategories: '', tagColors: '' };
        
        return {
          tagNames: tags.map(tag => tag.name).join('; '),
          tagCategories: tags.map(tag => tag.category.name).join('; '),
          tagColors: tags.map(tag => tag.color).join('; ')
        };
      };

      // Prepare flattened data for Excel with comprehensive tag information
      const flattenedData = receipts.flatMap(receipt => {
        const tagData = formatTagsForExcel(receipt.tags);
        
        // Group tags by category for detailed breakdown
        const tagsByCategory = receipt.tags.reduce((acc, tag) => {
          const categoryName = tag.category.name;
          if (!acc[categoryName]) {
            acc[categoryName] = [];
          }
          acc[categoryName].push(tag.name);
          return acc;
        }, {} as Record<string, string[]>);

        // Create category-specific tag columns
        const categoryTagColumns = tagCategories.reduce((acc, category) => {
          const categoryTags = tagsByCategory[category.name] || [];
          acc[`Tags: ${category.name}`] = categoryTags.join('; ');
          return acc;
        }, {} as Record<string, string>);

        if (receipt.lineItems.length === 0) {
          // Receipt with no line items
          return [{
            'Receipt ID': receipt.id,
            'Receipt Date': format(new Date(receipt.receipt_date), 'yyyy-MM-dd'),
            'Vendor Name': receipt.vendor.name,
            'Vendor Category': receipt.vendor.category,
            'Receipt Total': receipt.total_amount,
            'Tax Amount': receipt.tax_amount,
            'Currency': receipt.currency,
            'Notes': receipt.notes || '',
            'OCR Status': receipt.ocr_status,
            'OCR Confidence': `${receipt.confidence}%`,
            'Created Date': format(new Date(receipt.created_at), 'yyyy-MM-dd HH:mm:ss'),
            
            // Tag information
            'All Tags': tagData.tagNames,
            'Tag Categories': tagData.tagCategories,
            'Tag Colors': tagData.tagColors,
            'Total Tags': receipt.tags.length,
            ...categoryTagColumns,
            
            // Line item columns (empty for receipt-only rows)
            'Line Number': '',
            'Item Description': '',
            'Item Quantity': '',
            'Item Unit Price': '',
            'Item Total Price': '',
            'Item Category': '',
            'Item SKU': ''
          }];
        }
        
        // Receipt with line items
        return receipt.lineItems.map(item => ({
          'Receipt ID': receipt.id,
          'Receipt Date': format(new Date(receipt.receipt_date), 'yyyy-MM-dd'),
          'Vendor Name': receipt.vendor.name,
          'Vendor Category': receipt.vendor.category,
          'Receipt Total': receipt.total_amount,
          'Tax Amount': receipt.tax_amount,
          'Currency': receipt.currency,
          'Notes': receipt.notes || '',
          'OCR Status': receipt.ocr_status,
          'OCR Confidence': `${receipt.confidence}%`,
          'Created Date': format(new Date(receipt.created_at), 'yyyy-MM-dd HH:mm:ss'),
          
          // Tag information (repeated for each line item)
          'All Tags': tagData.tagNames,
          'Tag Categories': tagData.tagCategories,
          'Tag Colors': tagData.tagColors,
          'Total Tags': receipt.tags.length,
          ...categoryTagColumns,
          
          // Line item details
          'Line Number': item.line_number,
          'Item Description': item.description,
          'Item Quantity': item.quantity,
          'Item Unit Price': item.unit_price,
          'Item Total Price': item.total_price,
          'Item Tags': item.tags ? item.tags.map(tag => tag.name).join('; ') : '',
          'Item SKU': item.sku || ''
        }));
      });

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();

      // Main detailed sheet with all data
      const detailedSheet = XLSX.utils.json_to_sheet(flattenedData);
      XLSX.utils.book_append_sheet(wb, detailedSheet, "Detailed Export");

      // Summary sheet - one row per receipt
      const summaryData = receipts.map(receipt => {
        const tagData = formatTagsForExcel(receipt.tags);
        const tagsByCategory = receipt.tags.reduce((acc, tag) => {
          const categoryName = tag.category.name;
          if (!acc[categoryName]) {
            acc[categoryName] = [];
          }
          acc[categoryName].push(tag.name);
          return acc;
        }, {} as Record<string, string[]>);

        const categoryTagColumns = tagCategories.reduce((acc, category) => {
          const categoryTags = tagsByCategory[category.name] || [];
          acc[`Tags: ${category.name}`] = categoryTags.join('; ');
          return acc;
        }, {} as Record<string, string>);

        return {
          'Receipt ID': receipt.id,
          'Receipt Date': format(new Date(receipt.receipt_date), 'yyyy-MM-dd'),
          'Vendor Name': receipt.vendor.name,
          'Vendor Category': receipt.vendor.category,
          'Receipt Total': receipt.total_amount,
          'Tax Amount': receipt.tax_amount,
          'Currency': receipt.currency,
          'Notes': receipt.notes || '',
          'OCR Status': receipt.ocr_status,
          'OCR Confidence': `${receipt.confidence}%`,
          'Created Date': format(new Date(receipt.created_at), 'yyyy-MM-dd HH:mm:ss'),
          'Line Items Count': receipt.lineItems.length,
          
          // Tag summary
          'All Tags': tagData.tagNames,
          'Tag Categories': tagData.tagCategories,
          'Total Tags': receipt.tags.length,
          ...categoryTagColumns
        };
      });

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Receipt Summary");

      // Tags analysis sheet
      const tagAnalysis = tagCategories.map(category => {
        const categoryTags = allTags.filter(tag => tag.category.id === category.id);
        const usedTags = receipts.flatMap(r => r.tags).filter(tag => tag.category.id === category.id);
        const uniqueUsedTags = [...new Set(usedTags.map(t => t.id))];
        
        return {
          'Category': category.name,
          'Total Available Tags': categoryTags.length,
          'Used Tags': uniqueUsedTags.length,
          'Usage Rate': categoryTags.length > 0 ? `${Math.round((uniqueUsedTags.length / categoryTags.length) * 100)}%` : '0%',
          'Used Tag Names': uniqueUsedTags.map(id => {
            const tag = categoryTags.find(t => t.id === id);
            return tag ? tag.name : '';
          }).filter(name => name).join('; '),
          'Required': category.required ? 'Yes' : 'No',
          'Multiple Allowed': category.multiple ? 'Yes' : 'No'
        };
      });

      const tagAnalysisSheet = XLSX.utils.json_to_sheet(tagAnalysis);
      XLSX.utils.book_append_sheet(wb, tagAnalysisSheet, "Tag Analysis");

      // Generate filename with current date and filter info
      let filename = `ClearSpendly_Receipts_${format(new Date(), 'yyyy-MM-dd')}`;
      if (selectedTagIds.length > 0) {
        filename += `_FilteredBy${selectedTagIds.length}Tags`;
      }
      if (startDate && endDate) {
        filename += `_${startDate}_to_${endDate}`;
      }
      filename += '.xlsx';

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Processed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-300 text-yellow-800 bg-yellow-50">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-300 text-red-800 bg-red-50">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-gray-300 text-gray-600">
            {status}
          </Badge>
        );
    }
  };

  const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.total_amount, 0);
  const totalReceipts = receipts.length;

  // Card View Component
  const ReceiptCard = ({ receipt }: { receipt: ReceiptData }) => {
    return (
      <Card 
        className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-0 bg-white/90 backdrop-blur-sm hover:shadow-md"
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 truncate">{receipt.vendor.name}</h3>
                <p className="text-xs text-muted-foreground">{receipt.vendor.category}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 font-bold text-lg text-green-700">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(receipt.total_amount, receipt.currency)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          
          {/* Status and Items */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getStatusBadge(receipt.ocr_status)}
              <Badge variant="outline" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                {receipt.lineItems.length} items
              </Badge>
            </div>
            <div className="text-xs text-purple-600 font-medium">
              {receipt.confidence}% confidence
            </div>
          </div>
          
          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tags className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium text-gray-700">Tags:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {receipt.tags.length > 0 ? (
                receipt.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-xs px-2 py-1 h-auto"
                    style={{
                      borderColor: tag.color,
                      color: tag.color,
                      backgroundColor: `${tag.color}10`
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full mr-1" 
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">No tags</span>
              )}
            </div>
          </div>
          
          {/* Notes */}
          {receipt.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 italic">"{receipt.notes}"</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Receipt Management
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Organize, search, and export your expense data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
            <Receipt className="h-4 w-4 text-purple-600" />
            <span className="font-semibold text-gray-900">{totalReceipts}</span>
            <span className="text-muted-foreground text-sm">receipts</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
            <span className="text-muted-foreground text-sm">total</span>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-8 px-3 ${viewMode === 'table' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className={`h-8 px-3 ${viewMode === 'cards' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={exportToExcel}
            disabled={exporting || receipts.length === 0}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
            title={`Export ${receipts.length} receipts with tags to Excel (3 sheets: Detailed, Summary, Tag Analysis)`}
          >
            {exporting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Export Excel
            {selectedTagIds.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                {selectedTagIds.length} tag{selectedTagIds.length > 1 ? 's' : ''} filtered
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search receipts by vendor, notes, or amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 h-12 px-6 border-purple-200 hover:bg-purple-50"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters && <X className="h-3 w-3 ml-1" />}
              </Button>
              {searching && (
                <div className="flex items-center gap-2 text-purple-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Searching...</span>
                </div>
              )}
            </div>
            
            {showFilters && (
              <div className="space-y-4 pt-4 border-t border-purple-100">
                {/* Enhanced Date Range Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Date Range:</span>
                    </div>
                    <Select value={datePreset} onValueChange={handleDatePresetChange}>
                      <SelectTrigger className="w-40 border-purple-200 focus:border-purple-500">
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this-week">This Week</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                        <SelectItem value="this-year">This Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {datePreset === 'custom' && (
                      <>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setDatePreset('custom');
                          }}
                          className="w-auto border-purple-200 focus:border-purple-500"
                          placeholder="Start date"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setDatePreset('custom');
                          }}
                          className="w-auto border-purple-200 focus:border-purple-500"
                          placeholder="End date"
                        />
                      </>
                    )}
                  </div>
                  
                  {(startDate || endDate) && (
                    <div className="text-xs text-purple-600 pl-6">
                      {startDate && endDate 
                        ? `${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}`
                        : startDate 
                        ? `From ${format(new Date(startDate), 'MMM d, yyyy')}`
                        : `Until ${format(new Date(endDate), 'MMM d, yyyy')}`
                      }
                    </div>
                  )}
                </div>

                {/* Enhanced Tag Filters */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Filter by Tags:</span>
                    </div>
                    <Select value={selectedTagCategory} onValueChange={setSelectedTagCategory}>
                      <SelectTrigger className="w-48 border-purple-200 focus:border-purple-500">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
                            All Categories
                          </div>
                        </SelectItem>
                        {tagCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                              {category.name}
                              {category.required && <span className="text-xs text-red-500">*</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTagIds.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTagIds([])}
                        className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear Tags
                      </Button>
                    )}
                  </div>
                  
                  {/* Tag Selection Grid */}
                  <div className="pl-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {allTags
                        .filter(tag => selectedTagCategory === 'all' || tag.category.id === selectedTagCategory)
                        .map((tag) => {
                          const isSelected = selectedTagIds.includes(tag.id);
                          return (
                            <Button
                              key={tag.id}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedTagIds(prev => prev.filter(id => id !== tag.id));
                                } else {
                                  setSelectedTagIds(prev => [...prev, tag.id]);
                                }
                              }}
                              className={`text-xs h-8 w-full justify-start transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md' 
                                  : 'border-purple-200 hover:bg-purple-50 hover:scale-105'
                              }`}
                              style={isSelected ? {} : { borderColor: tag.color, color: tag.color }}
                            >
                              <div 
                                className="w-2 h-2 rounded-full mr-2 flex-shrink-0" 
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="truncate">{tag.name}</span>
                              {isSelected && (
                                <CheckCircle2 className="h-3 w-3 ml-auto flex-shrink-0" />
                              )}
                            </Button>
                          );
                        })}
                    </div>
                    
                    {selectedTagIds.length > 0 && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800">
                            Active Filters ({selectedTagIds.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedTagIds.map(tagId => {
                            const tag = allTags.find(t => t.id === tagId);
                            if (!tag) return null;
                            return (
                              <Badge
                                key={tagId}
                                variant="secondary"
                                className="text-xs bg-white border"
                                style={{ borderColor: tag.color, color: tag.color }}
                              >
                                <div 
                                  className="w-2 h-2 rounded-full mr-1" 
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                                <X 
                                  className="h-3 w-3 ml-1 cursor-pointer hover:bg-red-200 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
                                  }}
                                />
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex items-center justify-between pt-4 border-t border-purple-100">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {(searchQuery || startDate || endDate || selectedTagIds.length > 0) && (
                      <div className="flex items-center gap-4">
                        {searchQuery && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            Search: "{searchQuery}"
                          </span>
                        )}
                        {(startDate || endDate) && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                            Date: {datePreset !== 'custom' ? datePreset : 'custom range'}
                          </span>
                        )}
                        {selectedTagIds.length > 0 && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                            {selectedTagIds.length} tag{selectedTagIds.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setSearchQuery("");
                      setSelectedTagIds([]);
                      setSelectedTagCategory("all");
                      setDatePreset('custom');
                      // Trigger search with cleared filters
                      searchReceipts("", "", "", [], "all");
                    }}
                    className="text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                    disabled={!searchQuery && !startDate && !endDate && selectedTagIds.length === 0}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Receipts Display */}
      <div className="h-[calc(100vh-350px)]">
          {viewMode === 'table' ? (
            /* Enhanced Table View */
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm h-full flex flex-col">
              <CardHeader className="pb-4 border-b border-purple-100">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                    <List className="h-5 w-5 text-white" />
                  </div>
                  All Receipts ({receipts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="overflow-auto h-full">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-purple-50 to-blue-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Date
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Vendor
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Amount
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <div className="flex items-center gap-2">
                            <Tags className="h-4 w-4" />
                            Tags
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Status
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Items
                          </div>
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-64">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <div className="p-4 bg-purple-50 rounded-full mb-4">
                                <Receipt className="h-12 w-12 text-purple-400" />
                              </div>
                              <h3 className="font-medium text-lg mb-2">No receipts found</h3>
                              <p className="text-sm text-center max-w-md">
                                {searchQuery || startDate || endDate || selectedTagIds.length > 0 
                                  ? 'No receipts match your current filters. Try adjusting your search criteria.' 
                                  : 'Start by uploading your first receipt to get organized.'}
                              </p>
                              {(searchQuery || startDate || endDate || selectedTagIds.length > 0) && (
                                <Button 
                                  variant="outline" 
                                  className="mt-4 text-purple-600 border-purple-200 hover:bg-purple-50"
                                  onClick={() => {
                                    setSearchQuery('');
                                    setStartDate('');
                                    setEndDate('');
                                    setSelectedTagIds([]);
                                    setSelectedTagCategory('all');
                                    setDatePreset('custom');
                                    // Trigger search with cleared filters
                                    searchReceipts('', '', '', [], 'all');
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Clear Filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        receipts.map((receipt) => (
                          <TableRow
                            key={receipt.id}
                            className="cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 border-b border-gray-100"
                          >
                            <TableCell className="font-medium py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                {format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <Store className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                  <span className="font-medium truncate block">{receipt.vendor.name}</span>
                                  <span className="text-xs text-muted-foreground">{receipt.vendor.category}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-1 font-bold text-green-700">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(receipt.total_amount, receipt.currency)}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-wrap gap-1 max-w-40">
                                {receipt.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag.id}
                                    variant="outline"
                                    className="text-xs px-2 py-1 h-auto"
                                    style={{
                                      borderColor: tag.color,
                                      color: tag.color,
                                      backgroundColor: `${tag.color}10`
                                    }}
                                  >
                                    <div 
                                      className="w-2 h-2 rounded-full mr-1" 
                                      style={{ backgroundColor: tag.color }}
                                    />
                                    {tag.name}
                                  </Badge>
                                ))}
                                {receipt.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs px-2 py-1 h-auto border-purple-200 text-purple-600">
                                    +{receipt.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              {getStatusBadge(receipt.ocr_status)}
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">
                                <Package className="h-3 w-3 mr-1" />
                                {receipt.lineItems.length}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                {/* View Image Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // For now, we'll use a placeholder image URL
                                    // In real implementation, this would come from receipt.image_url
                                    handleViewImage(`https://via.placeholder.com/800x600?text=Receipt+${receipt.id}`);
                                  }}
                                  className="h-8 w-8 p-0 border-purple-200 hover:bg-purple-50"
                                  title="View receipt image"
                                >
                                  <ImageLucide className="h-4 w-4 text-purple-600" />
                                </Button>
                                
                                {/* Edit Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditReceipt(receipt);
                                  }}
                                  className="h-8 w-8 p-0 border-blue-200 hover:bg-blue-50"
                                  title="Edit receipt"
                                >
                                  <Edit3 className="h-4 w-4 text-blue-600" />
                                </Button>
                                
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Card View */
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm h-full flex flex-col">
              <CardHeader className="pb-4 border-b border-purple-100">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                    <Grid3X3 className="h-5 w-5 text-white" />
                  </div>
                  All Receipts ({receipts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-6">
                <div className="overflow-auto h-full">
                  {receipts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <div className="p-8 bg-purple-50 rounded-full mb-6">
                        <Receipt className="h-16 w-16 text-purple-400" />
                      </div>
                      <h3 className="font-medium text-xl mb-3">No receipts found</h3>
                      <p className="text-sm text-center max-w-md mb-6">
                        {searchQuery || startDate || endDate || selectedTagIds.length > 0 
                          ? 'No receipts match your current filters. Try adjusting your search criteria.' 
                          : 'Start by uploading your first receipt to get organized.'}
                      </p>
                      {(searchQuery || startDate || endDate || selectedTagIds.length > 0) && (
                        <Button 
                          variant="outline" 
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={() => {
                            setSearchQuery('');
                            setStartDate('');
                            setEndDate('');
                            setSelectedTagIds([]);
                            setSelectedTagCategory('all');
                            setDatePreset('custom');
                            // Trigger search with cleared filters
                            searchReceipts('', '', '', [], 'all');
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {receipts.map((receipt) => (
                        <div key={receipt.id} className="relative group">
                          <ReceiptCard receipt={receipt} />
                          
                          {/* Floating Action Buttons */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewImage(`https://via.placeholder.com/800x600?text=Receipt+${receipt.id}`);
                              }}
                              className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-md"
                              title="View receipt image"
                            >
                              <ImageLucide className="h-4 w-4 text-purple-600" />
                            </Button>
                            
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditReceipt(receipt);
                              }}
                              className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-md"
                              title="Edit receipt"
                            >
                              <Edit3 className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        }
      </div>

      {/* Enhanced Image Viewer Modal */}
      <Dialog open={showImageViewer} onOpenChange={handleCloseImageViewer}>
        <DialogContent className={`max-w-6xl max-h-[90vh] overflow-hidden ${
          showImageFullscreen ? 'w-screen h-screen max-w-none max-h-none' : ''
        }`}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageLucide className="h-5 w-5 text-purple-600" />
                Receipt Image
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 0.25}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 3}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetImage}
                  className="h-8 w-8 p-0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImageFullscreen(!showImageFullscreen)}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt="Receipt"
                className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-move"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`
                }}
                draggable={false}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageLucide className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No image available</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImageViewer}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Enhanced Edit Receipt Modal */}
      <Dialog open={!!editingReceipt} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-blue-600" />
              Edit Receipt
            </DialogTitle>
            <DialogDescription>
              {editingReceiptData && (
                <span>
                  {editingReceiptData.vendor.name} • {format(new Date(editingReceiptData.receipt_date), 'MMM d, yyyy')} • {formatCurrency(editingReceiptData.total_amount)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {editingReceiptData && (
            <div className="space-y-6">
              {/* Receipt Image Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-900">Receipt Image</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewImage(`https://via.placeholder.com/800x600?text=Receipt+${editingReceiptData.id}`)}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Full Size
                  </Button>
                </div>
                <div className="bg-white rounded border p-2 h-32 flex items-center justify-center">
                  <img
                    src={`https://via.placeholder.com/200x150?text=Receipt+${editingReceiptData.id}`}
                    alt="Receipt preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              
              {/* Receipt Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Receipt Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vendor" className="text-sm font-medium">Vendor</Label>
                    <Input
                      id="vendor"
                      value={editingReceiptData.vendor.name}
                      onChange={(e) => setEditingReceiptData({
                        ...editingReceiptData,
                        vendor: { ...editingReceiptData.vendor, name: e.target.value }
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date" className="text-sm font-medium">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={editingReceiptData.receipt_date}
                      onChange={(e) => setEditingReceiptData({
                        ...editingReceiptData,
                        receipt_date: e.target.value
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total" className="text-sm font-medium">Total Amount</Label>
                    <Input
                      id="total"
                      type="number"
                      step="0.01"
                      value={editingReceiptData.total_amount}
                      onChange={(e) => setEditingReceiptData({
                        ...editingReceiptData,
                        total_amount: parseFloat(e.target.value) || 0
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax" className="text-sm font-medium">Tax</Label>
                    <Input
                      id="tax"
                      type="number"
                      step="0.01"
                      value={editingReceiptData.tax_amount}
                      onChange={(e) => setEditingReceiptData({
                        ...editingReceiptData,
                        tax_amount: parseFloat(e.target.value) || 0
                      })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Notes</h3>
                <Textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Add notes about this receipt..."
                  className="min-h-[80px]"
                />
              </div>
              
              {/* Tags */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Tags</h3>
                <TagInput
                  selectedTags={editingTags}
                  onTagsChange={(tags) => {
                    setEditingTags(tags as SelectedTag[]);
                  }}
                  categories={tagCategories}
                  placeholder="Search or create tags for this receipt..."
                />
              </div>

              {/* Line Items */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Line Items</h3>
                  <Button onClick={addLineItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {editingReceiptData.lineItems.map((item: any) => (
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
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Total</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.total_price}
                            onChange={(e) => updateLineItem(item.id, 'total_price', parseFloat(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Tag (Choose one)</Label>
                        <Select
                          value={item.tag || (item.tags && item.tags.length > 0 ? item.tags[0].id : "none")}
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
            </div>
          )}
          
          <DialogFooter className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {editingReceiptData && (
                <span>
                  {editingReceiptData.lineItems.length} line items • Total: {formatCurrency(editingReceiptData.total_amount)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveReceipt}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Receipt"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Chat Agent */}
      <AIChatAgent
        filters={{
          startDate,
          endDate,
          tags: selectedTagIds,
          search: searchQuery
        }}
      />
    </div>
  );
}