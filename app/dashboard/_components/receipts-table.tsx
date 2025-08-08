"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Receipt, 
  Calendar, 
  DollarSign, 
  Store, 
  ArrowUpRight,
  Filter,
  Download,
  RefreshCw,
  X,
  User,
  PenTool,
  Search,
  FileSpreadsheet,
  Tags,
  Settings,
  GripVertical,
  Check,
  Trash2,
  Plus,
  CheckCircle2,
  Edit3,
  Save,
  Image as ImageIcon,
  ExternalLink,
  Repeat
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { TagInput } from '@/components/ui/tag-input';
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTeamContext } from '@/hooks/use-team-context';

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}

interface Receipt {
  id: string;
  vendor: string;
  date: string;
  amount: number;
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
  status: string;
  items: number;
  receipt_type?: 'scanned' | 'manual' | 'imported';
  manual_entry_reason?: string;
  business_purpose?: string;
  source_subscription_id?: string;
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
  created_by?: string;  // User ID who created the receipt
  created_by_user?: {   // User details for display
    id: string;
    email: string;
    full_name: string;
  };
  receipt_type?: 'scanned' | 'manual' | 'imported';
  manual_entry_reason?: string;
  business_purpose?: string;
  source_subscription_id?: string;
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

interface ReceiptStats {
  totalAmount: number;
  totalReceipts: number;
  uniqueVendors: number;
}


const statusColors = {
  "processed": "bg-green-100 text-green-800",
  "processing": "bg-yellow-100 text-yellow-800",
  "failed": "bg-red-100 text-red-800"
};

interface ReceiptsTableProps {
  startDate?: string;
  endDate?: string;
}

export function ReceiptsTable({ startDate: globalStartDate, endDate: globalEndDate }: ReceiptsTableProps = {}) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [rawReceiptData, setRawReceiptData] = useState<ReceiptData[]>([]);
  const [stats, setStats] = useState<ReceiptStats>({
    totalAmount: 0,
    totalReceipts: 0,
    uniqueVendors: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Pagination states
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(20); // Start with 20 items
  const [totalCount, setTotalCount] = useState<number | null>(null);
  
  // Team context for user filtering
  const isDevelopment = process.env.NODE_ENV === 'development';
  const teamContext = useTeamContext(isDevelopment);
  const [showMyDataOnly, setShowMyDataOnly] = useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedTagCategory, setSelectedTagCategory] = useState<string>("all");
  
  // Tag data
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  
  // Export configuration with sensible defaults
  const [exportConfig, setExportConfig] = useState({
    includeReceiptDetails: true,
    includeLineItems: true,
    includeTags: true,
    includeOCRData: false,
    createSummarySheet: true,
    columnOrder: [
      'Receipt ID',
      'Receipt Date', 
      'Vendor Name',
      'Receipt Total',
      'All Tags',
      'Line Number',
      'Item Description',
      'Item Quantity',
      'Item Unit Price',
      'Item Total Price'
    ]
  });
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReceiptData, setEditingReceiptData] = useState<ReceiptData | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [editingTags, setEditingTags] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Available columns (all possible columns)
  const allAvailableColumns = [
    'Receipt ID', 'Receipt Date', 'Vendor Name', 'Vendor Category',
    'Receipt Total', 'Tax Amount', 'Currency', 'Notes',
    'OCR Status', 'OCR Confidence', 'Created Date',
    'All Tags', 'Tag Categories', 'Tag Colors', 'Total Tags',
    'Line Number', 'Item Description', 'Item Quantity',
    'Item Unit Price', 'Item Total Price', 'Item Tags', 'Item SKU'
  ];
  
  // Get columns that are available to add (not currently in the order)
  const availableToAdd = allAvailableColumns.filter(col => 
    !exportConfig.columnOrder.includes(col)
  );

  // Load tag data on mount
  useEffect(() => {
    const loadTagData = async () => {
      try {
        // Load tag categories
        const categoriesResponse = await fetch('/api/tags/categories');
        if (categoriesResponse.ok) {
          const categoriesResult = await categoriesResponse.json();
          console.log('Loaded tag categories:', categoriesResult.data);
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

  useEffect(() => {
    fetchRecentReceipts();
  }, []);

  // Search function
  const searchReceipts = async (query: string, tagIds?: string[], tagCategoryId?: string, limit: number = 20, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setSearching(true);
    }
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      // Use global date range from props
      if (globalStartDate) params.append('startDate', globalStartDate);
      if (globalEndDate) params.append('endDate', globalEndDate);
      if (tagIds && tagIds.length > 0) params.append('tags', tagIds.join(','));
      if (tagCategoryId && tagCategoryId !== 'all') params.append('tagCategory', tagCategoryId);
      // Add user filtering for multi-user tenants
      if (teamContext.showUserFiltering && showMyDataOnly) params.append('myDataOnly', 'true');
      params.append('limit', limit.toString());

      const response = await fetch(`/api/receipts/search?${params}`);
      if (response.ok) {
        const result = await response.json();
        
        // Store raw data for export
        setRawReceiptData(result.data || []);
        
        // Transform for display
        const transformedReceipts = result.data?.map((receipt: any) => ({
          id: receipt.id,
          vendor: receipt.vendor?.name || 'Unknown Vendor',
          date: receipt.receipt_date,
          amount: receipt.total_amount,
          tags: receipt.tags || [],
          status: receipt.ocr_status || 'processed',
          items: receipt.lineItems?.length || 0,
          receipt_type: receipt.receipt_type || 'scanned',
          manual_entry_reason: receipt.manual_entry_reason,
          business_purpose: receipt.business_purpose,
          source_subscription_id: receipt.source_subscription_id
        })) || [];
        
        // Calculate stats
        const totalAmount = transformedReceipts.reduce((sum: number, receipt: any) => sum + receipt.amount, 0);
        const totalReceipts = transformedReceipts.length;
        const uniqueVendors = new Set(transformedReceipts.map((r: any) => r.vendor)).size;
        
        if (append) {
          setReceipts(prev => [...prev, ...transformedReceipts]);
          setRawReceiptData(prev => [...prev, ...(result.data || [])]);
        } else {
          setReceipts(transformedReceipts);
          setRawReceiptData(result.data || []);
        }
        
        setStats({
          totalAmount: append ? stats.totalAmount + totalAmount : totalAmount,
          totalReceipts: append ? stats.totalReceipts + totalReceipts : totalReceipts,
          uniqueVendors: append ? new Set([...receipts.map(r => r.vendor), ...transformedReceipts.map((r: any) => r.vendor)]).size : uniqueVendors
        });
        
        // Update pagination state
        setHasMore(transformedReceipts.length === limit);
        setError(null);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to load receipts');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setSearching(false);
      }
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string, tagIds?: string[], tagCategoryId?: string, limit?: number) => {
      searchReceipts(query, tagIds, tagCategoryId, limit);
    }, 300),
    [globalStartDate, globalEndDate]
  );

  const fetchRecentReceipts = async () => {
    setLoading(true);
    setCurrentLimit(20);
    setHasMore(true);
    await searchReceipts("", [], "all", 20);
    setLoading(false);
  };
  
  // Load more function
  const loadMoreReceipts = async () => {
    if (!hasMore || loadingMore) return;
    
    const newLimit = currentLimit + 20;
    setCurrentLimit(newLimit);
    await searchReceipts(searchQuery, selectedTagIds, selectedTagCategory, newLimit, true);
  };

  // Search when filters change
  useEffect(() => {
    if (!loading) {
      setCurrentLimit(20);
      setHasMore(true);
      debouncedSearch(searchQuery, selectedTagIds, selectedTagCategory, 20);
    }
  }, [searchQuery, selectedTagIds, selectedTagCategory, debouncedSearch, loading]);
  
  // Update when external date range changes
  useEffect(() => {
    setCurrentLimit(20);
    setHasMore(true);
    debouncedSearch(searchQuery, selectedTagIds, selectedTagCategory, 20);
  }, [globalStartDate, globalEndDate, debouncedSearch, searchQuery, selectedTagIds, selectedTagCategory, showMyDataOnly]);

  // Edit functions
  const handleEditReceipt = async (receiptId: string) => {
    try {
      const response = await fetch(`/api/receipts/${receiptId}`);
      if (response.ok) {
        const result = await response.json();
        console.log('Loaded receipt data:', result.data);
        console.log('Raw receipt_date from API:', result.data.receipt_date);
        
        // Process line items to handle existing tags
        const processedLineItems = result.data.lineItems?.map((item: any) => ({
          ...item,
          tag: item.tags && item.tags.length > 0 ? item.tags[0].id : undefined
        })) || [];
        
        // Fix the receipt_date timezone issue
        let correctedDate = result.data.receipt_date;
        if (correctedDate && correctedDate.includes('T')) {
          // If it's an ISO string, extract just the date part
          correctedDate = correctedDate.split('T')[0];
          console.log('Corrected date for display:', correctedDate);
        }
        
        setEditingReceiptData({
          ...result.data,
          receipt_date: correctedDate,
          lineItems: processedLineItems
        });
        setEditingNotes(result.data.notes || "");
        // Filter out any undefined, null, or invalid tags and ensure categoryName is set
        const validTags = (result.data.tags || [])
          .filter(tag => 
            tag && 
            typeof tag === 'object' && 
            tag.id && 
            tag.name && 
            tag.category &&
            tag.category.name
          )
          .map(tag => ({
            ...tag,
            categoryName: tag.category.name // Ensure categoryName is set
          }));
        setEditingTags(validTags);
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast.error('Failed to load receipt data');
    }
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
              total_price: field === 'quantity' || field === 'unit_price' 
                ? (field === 'quantity' ? value : item.quantity) * (field === 'unit_price' ? value : item.unit_price)
                : item.total_price 
            }
          : item
      )
    });
  };

  const updateLineItemTag = (itemId: string, tagId: string | undefined) => {
    updateLineItem(itemId, 'tag', tagId === "none" ? undefined : tagId);
  };

  // Auto-apply header tags to line items that don't have tags yet
  const autoApplyHeaderTagsToLineItems = (headerTags: any[]) => {
    if (!editingReceiptData || !headerTags.length) return;

    // Group header tags by category for single-tag categories
    const headerTagsByCategory = headerTags.reduce((acc: any, tag: any) => {
      const categoryName = tag.categoryName || tag.category?.name;
      if (categoryName) {
        acc[categoryName] = tag.id;
      }
      return acc;
    }, {});

    console.log('Auto-applying header tags to line items:', headerTagsByCategory);

    // Update line items that don't have tags from single-tag categories
    const updatedLineItems = editingReceiptData.lineItems.map((item: any) => {
      // If item already has a tag, don't override it
      if (item.tag) {
        return item;
      }

      // Apply the first available header tag from single-tag categories
      // Priority order: Project > Client > Department > Tax Status
      const priorityCategories = ['Project', 'Client', 'Department', 'Tax Status'];
      
      for (const categoryName of priorityCategories) {
        if (headerTagsByCategory[categoryName]) {
          console.log(`Auto-applying ${categoryName} tag ${headerTagsByCategory[categoryName]} to item ${item.id}`);
          return {
            ...item,
            tag: headerTagsByCategory[categoryName]
          };
        }
      }

      // If no priority category tags, apply any available header tag
      const firstHeaderTagId = Object.values(headerTagsByCategory)[0];
      if (firstHeaderTagId) {
        console.log(`Auto-applying fallback tag ${firstHeaderTagId} to item ${item.id}`);
        return {
          ...item,
          tag: firstHeaderTagId as string
        };
      }

      return item;
    });

    setEditingReceiptData({
      ...editingReceiptData,
      lineItems: updatedLineItems
    });
  };

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
      tag: undefined
    };
    
    const updatedLineItems = [...editingReceiptData.lineItems, newItem];
    
    setEditingReceiptData({
      ...editingReceiptData,
      lineItems: updatedLineItems
    });
    
    // Auto-apply header tags to the new line item if applicable
    if (editingTags.length > 0) {
      // Use a timeout to ensure state is updated first
      setTimeout(() => {
        autoApplyHeaderTagsToLineItems(editingTags);
      }, 100);
    }
  };

  const removeLineItem = (itemId: string) => {
    if (!editingReceiptData) return;
    
    setEditingReceiptData({
      ...editingReceiptData,
      lineItems: editingReceiptData.lineItems.filter((item: any) => item.id !== itemId)
    });
  };

  const handleDeleteReceipt = (receiptId: string) => {
    setDeletingReceiptId(receiptId);
    setShowDeleteModal(true);
  };

  const confirmDeleteReceipt = async () => {
    if (!deletingReceiptId) return;
    
    const receipt = receipts.find(r => r.id === deletingReceiptId);
    const entryType = receipt?.receipt_type === 'manual' ? 'expense' : 'receipt';
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/receipts/${deletingReceiptId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success("Entry deleted successfully");
        setShowDeleteModal(false);
        setDeletingReceiptId(null);
        // Refresh the receipts list
        setCurrentLimit(20);
        setHasMore(true);
        debouncedSearch(searchQuery, selectedTagIds, selectedTagCategory, 20);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete entry");
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error("Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  };

  const handleViewImage = async (receiptId: string) => {
    try {
      const response = await fetch(`/api/receipts/${receiptId}/image`);
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 404) {
          toast.error("No image available for this entry");
        } else {
          toast.error(error.message || "Failed to load image");
        }
        return;
      }

      const result = await response.json();
      
      // Open image in new tab
      window.open(result.imageUrl, '_blank');
      
    } catch (error) {
      console.error('Error viewing image:', error);
      toast.error("Failed to load image");
    }
  };

  const handleSaveReceipt = async () => {
    if (!editingReceiptData) return;
    
    // Validate tag constraints before saving
    const tagsByCategory = editingTags.reduce((acc: any, tag: any) => {
      const categoryName = tag.categoryName || tag.category?.name;
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(tag);
      return acc;
    }, {});

    // Check for constraint violations
    const violations = Object.entries(tagsByCategory).filter(([categoryName, tags]: [string, any]) => {
      const category = tagCategories.find(c => c.name === categoryName);
      return category && !category.multiple && tags.length > 1;
    });

    if (violations.length > 0) {
      const violatedCategories = violations.map(([categoryName]) => categoryName);
      toast.error(`Cannot save: Multiple tags in single-tag categories: ${violatedCategories.join(', ')}`);
      return;
    }
    
    setSaving(true);
    try {
      const updates = {
        vendor: editingReceiptData.vendor.name,
        receipt_date: editingReceiptData.receipt_date, // Date is already in YYYY-MM-DD format
        total_amount: editingReceiptData.total_amount,
        tax_amount: editingReceiptData.tax_amount,
        notes: editingNotes,
        tags: editingTags.map(tag => typeof tag === 'string' ? tag : tag.id),
        
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

      console.log('Saving receipt with updates:', JSON.stringify(updates, null, 2));
      
      const response = await fetch(`/api/receipts/${editingReceiptData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success('Receipt updated successfully');
        setShowEditModal(false);
        // Refresh the receipts list
        setCurrentLimit(20);
        setHasMore(true);
        debouncedSearch(searchQuery, selectedTagIds, selectedTagCategory, 20);
      } else {
        toast.error('Failed to update receipt');
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast.error('Failed to update receipt');
    } finally {
      setSaving(false);
    }
  };


  // Export to Excel function
  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Helper function to format tags for Excel
      const formatTagsForExcel = (tags: any[]) => {
        if (tags.length === 0 || !exportConfig.includeTags) return { tagNames: '', tagCategories: '', tagColors: '' };
        
        return {
          tagNames: tags.map(tag => tag.name).join('; '),
          tagCategories: tags.map(tag => tag.category.name).join('; '),
          tagColors: tags.map(tag => tag.color).join('; ')
        };
      };

      // Helper function to create row data based on selected columns
      const createRowData = (receipt: any, item?: any) => {
        const rowData: any = {};
        
        // Only add data for columns that are selected
        exportConfig.columnOrder.forEach(columnName => {
          switch (columnName) {
            case 'Receipt ID':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = receipt.id;
              break;
            case 'Receipt Date':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = format(new Date(receipt.receipt_date), 'yyyy-MM-dd');
              break;
            case 'Vendor Name':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = receipt.vendor.name;
              break;
            case 'Vendor Category':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = receipt.vendor.category;
              break;
            case 'Receipt Total':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = receipt.total_amount;
              break;
            case 'Tax Amount':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = receipt.tax_amount;
              break;
            case 'Currency':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = receipt.currency;
              break;
            case 'Notes':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = receipt.notes || '';
              break;
            case 'Created Date':
              if (exportConfig.includeReceiptDetails) rowData[columnName] = format(new Date(receipt.created_at), 'yyyy-MM-dd HH:mm:ss');
              break;
            case 'OCR Status':
              if (exportConfig.includeOCRData) rowData[columnName] = receipt.ocr_status;
              break;
            case 'OCR Confidence':
              if (exportConfig.includeOCRData) rowData[columnName] = `${receipt.confidence}%`;
              break;
            case 'All Tags':
              if (exportConfig.includeTags) rowData[columnName] = receipt.tags.map((tag: any) => tag.name).join('; ');
              break;
            case 'Tag Categories':
              if (exportConfig.includeTags) rowData[columnName] = receipt.tags.map((tag: any) => tag.category.name).join('; ');
              break;
            case 'Tag Colors':
              if (exportConfig.includeTags) rowData[columnName] = receipt.tags.map((tag: any) => tag.color).join('; ');
              break;
            case 'Total Tags':
              if (exportConfig.includeTags) rowData[columnName] = receipt.tags.length;
              break;
            case 'Line Number':
              if (exportConfig.includeLineItems && item) rowData[columnName] = item.line_number;
              else if (exportConfig.includeLineItems) rowData[columnName] = '';
              break;
            case 'Item Description':
              if (exportConfig.includeLineItems && item) rowData[columnName] = item.description;
              else if (exportConfig.includeLineItems) rowData[columnName] = '';
              break;
            case 'Item Quantity':
              if (exportConfig.includeLineItems && item) rowData[columnName] = item.quantity;
              else if (exportConfig.includeLineItems) rowData[columnName] = '';
              break;
            case 'Item Unit Price':
              if (exportConfig.includeLineItems && item) rowData[columnName] = item.unit_price;
              else if (exportConfig.includeLineItems) rowData[columnName] = '';
              break;
            case 'Item Total Price':
              if (exportConfig.includeLineItems && item) rowData[columnName] = item.total_price;
              else if (exportConfig.includeLineItems) rowData[columnName] = '';
              break;
            case 'Item Tags':
              if (exportConfig.includeLineItems && item && item.tags) rowData[columnName] = item.tags.map((tag: any) => tag.name).join('; ');
              else if (exportConfig.includeLineItems) rowData[columnName] = '';
              break;
            case 'Item SKU':
              if (exportConfig.includeLineItems && item) rowData[columnName] = item.sku || '';
              else if (exportConfig.includeLineItems) rowData[columnName] = '';
              break;
            default:
              // Handle dynamic tag category columns
              if (columnName.startsWith('Tags: ') && exportConfig.includeTags) {
                const categoryName = columnName.replace('Tags: ', '');
                const categoryTags = receipt.tags
                  .filter((tag: any) => tag.category.name === categoryName)
                  .map((tag: any) => tag.name);
                rowData[columnName] = categoryTags.join('; ');
              }
              break;
          }
        });
        
        return rowData;
      };

      // Prepare flattened data for Excel
      const flattenedData = rawReceiptData.flatMap(receipt => {

        if (receipt.lineItems.length === 0 || !exportConfig.includeLineItems) {
          // Receipt with no line items or line items excluded
          return [createRowData(receipt)];
        }
        
        // Receipt with line items
        return receipt.lineItems.map(item => createRowData(receipt, item));
      });

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();

      // Data is already in the correct order and filtered
      // If no columns are selected, return empty data
      if (exportConfig.columnOrder.length === 0) {
        alert('Please select at least one column to export.');
        return;
      }

      // Main detailed sheet with custom column order
      const detailedSheet = XLSX.utils.json_to_sheet(flattenedData);
      XLSX.utils.book_append_sheet(wb, detailedSheet, "Detailed Export");

      // Summary sheet - one row per receipt (if enabled)
      if (exportConfig.createSummarySheet) {
        const summaryData = rawReceiptData.map(receipt => {
          // Create summary row with special handling for line item count
          const summaryRow: any = {};
          
          exportConfig.columnOrder.forEach(columnName => {
            switch (columnName) {
              case 'Receipt ID':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = receipt.id;
                break;
              case 'Receipt Date':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = format(new Date(receipt.receipt_date), 'yyyy-MM-dd');
                break;
              case 'Vendor Name':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = receipt.vendor.name;
                break;
              case 'Vendor Category':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = receipt.vendor.category;
                break;
              case 'Receipt Total':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = receipt.total_amount;
                break;
              case 'Tax Amount':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = receipt.tax_amount;
                break;
              case 'Currency':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = receipt.currency;
                break;
              case 'Notes':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = receipt.notes || '';
                break;
              case 'Created Date':
                if (exportConfig.includeReceiptDetails) summaryRow[columnName] = format(new Date(receipt.created_at), 'yyyy-MM-dd HH:mm:ss');
                break;
              case 'OCR Status':
                if (exportConfig.includeOCRData) summaryRow[columnName] = receipt.ocr_status;
                break;
              case 'OCR Confidence':
                if (exportConfig.includeOCRData) summaryRow[columnName] = `${receipt.confidence}%`;
                break;
              case 'All Tags':
                if (exportConfig.includeTags) summaryRow[columnName] = receipt.tags.map((tag: any) => tag.name).join('; ');
                break;
              case 'Tag Categories':
                if (exportConfig.includeTags) summaryRow[columnName] = receipt.tags.map((tag: any) => tag.category.name).join('; ');
                break;
              case 'Tag Colors':
                if (exportConfig.includeTags) summaryRow[columnName] = receipt.tags.map((tag: any) => tag.color).join('; ');
                break;
              case 'Total Tags':
                if (exportConfig.includeTags) summaryRow[columnName] = receipt.tags.length;
                break;
              case 'Line Number':
                if (exportConfig.includeLineItems) summaryRow['Line Items Count'] = receipt.lineItems.length;
                break;
              default:
                // Handle dynamic tag category columns
                if (columnName.startsWith('Tags: ') && exportConfig.includeTags) {
                  const categoryName = columnName.replace('Tags: ', '');
                  const categoryTags = receipt.tags
                    .filter((tag: any) => tag.category.name === categoryName)
                    .map((tag: any) => tag.name);
                  summaryRow[columnName] = categoryTags.join('; ');
                }
                break;
            }
          });
          
          return summaryRow;
        });

        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Receipt Summary");
      }

      // Generate filename with current date and filter info
      let filename = `Dashboard_Receipts_${format(new Date(), 'yyyy-MM-dd')}`;
      if (selectedTagIds.length > 0) {
        filename += `_FilteredBy${selectedTagIds.length}Tags`;
      }
      if (globalStartDate && globalEndDate) {
        filename += `_${globalStartDate}_to_${globalEndDate}`;
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

  return (
    <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expenses & Receipts
            </CardTitle>
            <CardDescription>
              {stats.totalReceipts} entries • ${stats.totalAmount.toFixed(2)} total
              {(searchQuery || selectedTagIds.length > 0 || globalStartDate || globalEndDate) && (
                <span className="text-purple-600 ml-2">(filtered)</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchRecentReceipts}
              disabled={loading || searching}
              className="border-purple-200 hover:bg-purple-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || searching) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {/* User Filtering Toggle - only show in multi-user tenants */}
            {teamContext.showUserFiltering && (
              <Button
                variant={showMyDataOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMyDataOnly(!showMyDataOnly)}
                className={`${
                  showMyDataOnly 
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg" 
                    : "border-purple-200 hover:bg-purple-50"
                }`}
                title={showMyDataOnly ? "Showing only your data" : "Showing all team data"}
              >
                <User className="h-4 w-4 mr-2" />
                {showMyDataOnly ? "My Data" : "All Data"}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className="border-purple-200 hover:bg-purple-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {showFilters && <X className="h-3 w-3 ml-1" />}
            </Button>
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={receipts.length === 0}
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    Export Configuration
                  </DialogTitle>
                  <DialogDescription>
                    Configure your export settings. You're about to export {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} with detailed information.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Export Options */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-gray-900">Export Options</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeReceiptDetails"
                          checked={exportConfig.includeReceiptDetails}
                          onCheckedChange={(checked) => 
                            setExportConfig(prev => ({ ...prev, includeReceiptDetails: checked as boolean }))
                          }
                        />
                        <label htmlFor="includeReceiptDetails" className="text-sm font-medium">
                          Receipt Details
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeLineItems"
                          checked={exportConfig.includeLineItems}
                          onCheckedChange={(checked) => 
                            setExportConfig(prev => ({ ...prev, includeLineItems: checked as boolean }))
                          }
                        />
                        <label htmlFor="includeLineItems" className="text-sm font-medium">
                          Line Items
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeTags"
                          checked={exportConfig.includeTags}
                          onCheckedChange={(checked) => 
                            setExportConfig(prev => ({ ...prev, includeTags: checked as boolean }))
                          }
                        />
                        <label htmlFor="includeTags" className="text-sm font-medium">
                          Tags & Categories
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeOCRData"
                          checked={exportConfig.includeOCRData}
                          onCheckedChange={(checked) => 
                            setExportConfig(prev => ({ ...prev, includeOCRData: checked as boolean }))
                          }
                        />
                        <label htmlFor="includeOCRData" className="text-sm font-medium">
                          OCR Data
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 col-span-2">
                        <Checkbox
                          id="createSummarySheet"
                          checked={exportConfig.createSummarySheet}
                          onCheckedChange={(checked) => 
                            setExportConfig(prev => ({ ...prev, createSummarySheet: checked as boolean }))
                          }
                        />
                        <label htmlFor="createSummarySheet" className="text-sm font-medium">
                          Create Summary Sheet
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Column Order */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-gray-900">Column Order</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExportConfig(prev => ({ ...prev, columnOrder: [] }));
                          }}
                          className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={exportConfig.columnOrder.length === 0}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const defaultColumns = [
                              'Receipt ID', 'Receipt Date', 'Vendor Name', 'Vendor Category',
                              'Receipt Total', 'Tax Amount', 'Currency', 'Notes',
                              'OCR Status', 'OCR Confidence', 'Created Date',
                              'All Tags', 'Tag Categories', 'Tag Colors', 'Total Tags',
                              'Line Number', 'Item Description', 'Item Quantity',
                              'Item Unit Price', 'Item Total Price', 'Item Tags', 'Item SKU',
                              ...tagCategories.map(cat => `Tags: ${cat.name}`)
                            ];
                            setExportConfig(prev => ({ ...prev, columnOrder: defaultColumns }));
                          }}
                          className="text-xs h-7"
                        >
                          Reset All
                        </Button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {exportConfig.columnOrder.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">No columns selected</p>
                          <p className="text-xs">Add columns from the available list below or reset to default.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {exportConfig.columnOrder.map((column, index) => (
                          <div 
                            key={`${column}-${index}`}
                            draggable
                            onDragStart={(e) => {
                              setDraggedIndex(index);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverIndex(index);
                            }}
                            onDragLeave={() => {
                              setDragOverIndex(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedIndex !== null && draggedIndex !== index) {
                                const newOrder = [...exportConfig.columnOrder];
                                const [removed] = newOrder.splice(draggedIndex, 1);
                                newOrder.splice(index, 0, removed);
                                setExportConfig(prev => ({ ...prev, columnOrder: newOrder }));
                              }
                              setDraggedIndex(null);
                              setDragOverIndex(null);
                            }}
                            onDragEnd={() => {
                              setDraggedIndex(null);
                              setDragOverIndex(null);
                            }}
                            className={`group flex items-center gap-3 bg-white rounded px-3 py-2 border transition-all duration-200 cursor-move select-none ${
                              draggedIndex === index ? 'opacity-50 scale-95' : ''
                            } ${
                              dragOverIndex === index && draggedIndex !== index 
                                ? 'border-purple-400 bg-purple-50 transform scale-105' 
                                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                            }`}
                          >
                            <GripVertical className={`h-4 w-4 transition-colors ${
                              draggedIndex === index ? 'text-purple-600' : 'text-gray-400'
                            }`} />
                            <span className="text-sm flex-1 transition-colors">{column}</span>
                            <span className={`text-xs px-2 py-1 rounded transition-colors ${
                              draggedIndex === index 
                                ? 'bg-purple-200 text-purple-800' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {index + 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newOrder = exportConfig.columnOrder.filter((_, i) => i !== index);
                                setExportConfig(prev => ({ ...prev, columnOrder: newOrder }));
                              }}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Remove column"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Add Columns Section */}
                    {availableToAdd.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-800">Available Columns</span>
                          <span className="text-xs text-green-600">{availableToAdd.length} available</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availableToAdd.map((column) => (
                            <Button
                              key={column}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExportConfig(prev => ({
                                  ...prev,
                                  columnOrder: [...prev.columnOrder, column]
                                }));
                              }}
                              className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-100"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {column}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-purple-800">
                        <GripVertical className="h-3 w-3" />
                        <span className="font-medium">Pro Tip:</span>
                        <span>Drag to reorder, hover to remove columns, or add columns from the available list above.</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Export Preview */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h4 className="font-medium text-sm text-purple-900 mb-2">Export Preview</h4>
                    <div className="text-sm text-purple-700 space-y-1">
                      <div>• <span className="font-medium">{receipts.length}</span> receipt{receipts.length !== 1 ? 's' : ''} to export</div>
                      <div>• <span className="font-medium">{exportConfig.createSummarySheet ? '2' : '1'}</span> sheet{exportConfig.createSummarySheet ? 's' : ''} will be created</div>
                      <div>• Estimated file size: <span className="font-medium">~{Math.ceil(receipts.length * 0.05)}KB</span></div>
                      <div>• Column configuration: <span className="font-medium">{exportConfig.columnOrder.length} of {allAvailableColumns.length} columns selected</span></div>
                      {(searchQuery || selectedTagIds.length > 0) && (
                        <div className="text-purple-600">• Filtered data will be exported</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowExportDialog(false)}
                    disabled={exporting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      exportToExcel();
                      setShowExportDialog(false);
                    }}
                    disabled={exporting || exportConfig.columnOrder.length === 0}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {exporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Export Excel File
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button size="sm" asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Link href="/dashboard/receipts">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Filter Section */}
      {showFilters && (
        <div className="px-6 pb-4 border-b">
          <div className="space-y-4">
            {/* Info about global date filter */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-800">
                <span className="font-medium">Date Range:</span> Controlled by the date filter above. Use the filters below to refine by content and tags.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search receipts by vendor, notes, or amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-purple-200 focus:border-purple-500"
                />
              </div>
              {searching && (
                <div className="flex items-center gap-2 text-purple-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Searching...</span>
                </div>
              )}
            </div>
            
            
            {/* Tag Filters */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Filter by Tags:</span>
              </div>
              
              {/* Tag Category Filter */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-600 min-w-fit">Category:</span>
                <Select value={selectedTagCategory} onValueChange={setSelectedTagCategory}>
                  <SelectTrigger className="w-48 border-purple-200">
                    <SelectValue placeholder="All categories" />
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
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedTagIds.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('Clearing selected tags...');
                      setSelectedTagIds([]);
                      // Trigger search with cleared tag selection
                      searchReceipts(searchQuery, [], selectedTagCategory, 10);
                    }}
                    className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear ({selectedTagIds.length})
                  </Button>
                )}
              </div>
              
              {/* Individual Tags Grid */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-600">Select Tags:</span>
                <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {allTags
                    .filter(tag => selectedTagCategory === 'all' || tag.category.id === selectedTagCategory)
                    .length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
                                let newTagIds;
                                if (isSelected) {
                                  newTagIds = selectedTagIds.filter(id => id !== tag.id);
                                } else {
                                  newTagIds = [...selectedTagIds, tag.id];
                                }
                                setSelectedTagIds(newTagIds);
                                // Trigger search with updated tag selection
                                searchReceipts(searchQuery, newTagIds, selectedTagCategory, 10);
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
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No tags available</p>
                      <p className="text-xs">
                        {selectedTagCategory === 'all' 
                          ? 'Create tags to start filtering your receipts.'
                          : 'No tags in this category. Try selecting a different category.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Selected Tags Summary */}
              {selectedTagIds.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-purple-800">
                      Active Tag Filters ({selectedTagIds.length})
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
                          className="text-xs bg-white border flex items-center gap-1"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                          <button
                            type="button"
                            className="ml-1 h-3 w-3 rounded-full hover:bg-red-200 flex items-center justify-center cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Removing tag:', tagId, 'from', selectedTagIds);
                              const newIds = selectedTagIds.filter(id => id !== tagId);
                              setSelectedTagIds(newIds);
                              console.log('New selected tags:', newIds);
                              // Trigger search with updated tag selection
                              searchReceipts(searchQuery, newIds, selectedTagCategory, 10);
                            }}
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Clear Filters */}
            {(searchQuery || selectedTagIds.length > 0) && (
              <div className="flex items-center justify-end pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Clearing filters...');
                    setSearchQuery("");
                    setSelectedTagIds([]);
                    setSelectedTagCategory("all");
                    // Manually trigger search with cleared filters
                    searchReceipts("", [], "all", 10);
                  }}
                  className="text-purple-600 hover:bg-purple-50"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading receipts...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchRecentReceipts}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}
        
        {!loading && !error && receipts.length === 0 && (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No receipts found</p>
            <Button size="sm" asChild className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Link href="/dashboard/upload">
                Upload Your First Receipt
              </Link>
            </Button>
          </div>
        )}
        
        {!loading && !error && receipts.length > 0 && (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Vendor
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Amount
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Tags className="h-4 w-4" />
                        Tags
                      </div>
                    </TableHead>
                    {/* Show Created By column only in multi-user tenants */}
                    {teamContext.showCreatedBy && (
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Created By
                        </div>
                      </TableHead>
                    )}
                    <TableHead>Type</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow 
                      key={receipt.id} 
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        receipt.receipt_type === 'manual' && "bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-l-purple-400",
                        receipt.source_subscription_id && "bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-l-green-400"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                            receipt.source_subscription_id
                              ? "bg-gradient-to-r from-green-500 to-teal-500"
                              : receipt.receipt_type === 'manual' 
                                ? "bg-gradient-to-r from-purple-500 to-blue-500" 
                                : "bg-gradient-to-r from-purple-100 to-blue-100"
                          )}>
                            {receipt.source_subscription_id ? (
                              <Repeat className="h-5 w-5 text-white" />
                            ) : receipt.receipt_type === 'manual' ? (
                              <PenTool className="h-5 w-5 text-white" />
                            ) : (
                              <Store className="h-4 w-4 text-purple-600" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span>{receipt.vendor}</span>
                            {receipt.source_subscription_id && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                  Subscription
                                </span>
                                <span className="text-xs text-gray-500">
                                  • Auto-generated
                                </span>
                              </div>
                            )}
                            {receipt.receipt_type === 'manual' && receipt.manual_entry_reason && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                  Manual Entry
                                </span>
                                <span 
                                  className="text-xs text-gray-500" 
                                  title={`Reason: ${receipt.manual_entry_reason.replace(/_/g, ' ')}`}
                                >
                                  • {receipt.manual_entry_reason.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Fix timezone issue: parse date correctly to avoid day shift
                          const dateStr = receipt.date;
                          if (!dateStr) return "Invalid Date";
                          
                          // If it's in YYYY-MM-DD format, parse it as local date
                          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                            const [year, month, day] = dateStr.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day); // month is 0-indexed
                            return localDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric", 
                              year: "numeric"
                            });
                          }
                          
                          // If it contains 'T', extract date part and parse as local
                          if (dateStr.includes('T')) {
                            const datePart = dateStr.split('T')[0];
                            const [year, month, day] = datePart.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day);
                            return localDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            });
                          }
                          
                          // Fallback to regular parsing
                          return new Date(dateStr).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          });
                        })()}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        ${receipt.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {receipt.tags && receipt.tags.length > 0 ? (
                            receipt.tags.slice(0, 2).map((tag: any) => (
                              <Badge
                                key={tag.id}
                                variant="secondary"
                                className="text-xs px-2 py-1"
                                style={{ 
                                  backgroundColor: `${tag.color}20`,
                                  borderColor: tag.color,
                                  color: tag.color,
                                  fontSize: '10px'
                                }}
                              >
                                {tag.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No tags</span>
                          )}
                          {receipt.tags && receipt.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs px-1 py-1">
                              +{receipt.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {/* Show Created By cell only in multi-user tenants */}
                      {teamContext.showCreatedBy && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-purple-700">
                                {receipt.created_by_user?.full_name?.charAt(0).toUpperCase() || 
                                 receipt.created_by_user?.email?.charAt(0).toUpperCase() || 
                                 'U'}
                              </span>
                            </div>
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {receipt.created_by_user?.full_name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {receipt.created_by_user?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {receipt.source_subscription_id ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                                <Repeat className="h-3 w-3 text-white" />
                              </div>
                              <span className="text-sm font-medium text-green-700">Subscription</span>
                            </>
                          ) : receipt.receipt_type === 'manual' ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                                <PenTool className="h-3 w-3 text-white" />
                              </div>
                              <span className="text-sm font-medium text-purple-700">Manual</span>
                            </>
                          ) : (
                            <>
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center">
                                <Receipt className="h-3 w-3 text-green-600" />
                              </div>
                              <span className="text-sm font-medium text-green-700">Receipt</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {receipt.items} item{receipt.items !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        {receipt.source_subscription_id ? (
                          <Badge className="text-xs bg-gradient-to-r from-green-500 to-teal-500 text-white border-0 shadow-sm">
                            Subscription Auto
                          </Badge>
                        ) : receipt.receipt_type === 'manual' ? (
                          <Badge className="text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 shadow-sm">
                            Manual Entry
                          </Badge>
                        ) : (
                          <Badge 
                            variant="secondary"
                            className={statusColors[receipt.status as keyof typeof statusColors] || statusColors["processed"]}
                          >
                            {receipt.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(!receipt.receipt_type || receipt.receipt_type === 'scanned') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewImage(receipt.id)}
                              className="h-8 w-8 p-0 hover:bg-purple-50"
                              title="View Image"
                            >
                              <ImageIcon className="h-4 w-4 text-purple-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditReceipt(receipt.id)}
                            className="h-8 w-8 p-0 hover:bg-purple-50"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4 text-purple-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReceipt(receipt.id)}
                            className="h-8 w-8 p-0 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Load More Button */}
              {hasMore && receipts.length > 0 && (
                <div className="flex justify-center py-6 border-t">
                  <Button 
                    onClick={loadMoreReceipts}
                    disabled={loadingMore}
                    variant="outline"
                    className="border-purple-200 hover:bg-purple-50"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Load More ({totalCount ? `${receipts.length} of ${totalCount}` : 'Show more'})
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Results info */}
              {receipts.length > 0 && (
                <div className="text-center text-sm text-muted-foreground py-2 border-t">
                  {hasMore 
                    ? `Showing ${receipts.length} receipts${totalCount ? ` of ${totalCount}` : ''}` 
                    : `All ${receipts.length} receipts loaded`
                  }
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Edit Receipt Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-purple-600" />
              Edit Entry
            </DialogTitle>
            <DialogDescription>
              Update entry information, line items, and tags
            </DialogDescription>
          </DialogHeader>

          {editingReceiptData && (
            <div className="space-y-6">
              {/* Entry Header Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Entry Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      value={editingReceiptData.vendor?.name || ""}
                      onChange={(e) => setEditingReceiptData({
                        ...editingReceiptData,
                        vendor: { ...editingReceiptData.vendor, name: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="receipt_date">Date</Label>
                    <Input
                      id="receipt_date"
                      type="date"
                      value={editingReceiptData.receipt_date || ""}
                      onChange={(e) => {
                        setEditingReceiptData({
                          ...editingReceiptData,
                          receipt_date: e.target.value
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_amount">Total Amount</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={editingReceiptData.total_amount || 0}
                      onChange={(e) => setEditingReceiptData({
                        ...editingReceiptData,
                        total_amount: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_amount">Tax Amount</Label>
                    <Input
                      id="tax_amount"
                      type="number"
                      step="0.01"
                      value={editingReceiptData.tax_amount || 0}
                      onChange={(e) => setEditingReceiptData({
                        ...editingReceiptData,
                        tax_amount: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Entry Tags Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Entry Tags</h3>
                <TagInput
                  selectedTags={editingTags}
                  onTagsChange={(newTags) => {
                    // Ensure we only keep valid tags and categoryName is set
                    const validTags = newTags
                      .filter(tag => 
                        tag && 
                        typeof tag === 'object' && 
                        tag.id && 
                        tag.name && 
                        tag.category &&
                        tag.category.name
                      )
                      .map(tag => ({
                        ...tag,
                        categoryName: tag.category.name // Ensure categoryName is set
                      }));
                    setEditingTags(validTags);
                    
                    // Auto-apply header tags to line items that don't have tags yet
                    autoApplyHeaderTagsToLineItems(validTags);
                  }}
                  categories={tagCategories}
                  placeholder="Add tags to this entry..."
                />
              </div>

              {/* Notes Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Notes</h3>
                <Textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Add notes about this entry..."
                  rows={3}
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
                            readOnly
                            className="text-sm bg-gray-50"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Tag (Choose one)</Label>
                        <div className="flex gap-1">
                          <Select
                            value={item.tag || "none"}
                            onValueChange={(value) => updateLineItemTag(item.id, value)}
                          >
                            <SelectTrigger className="text-sm flex-1">
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
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: tag.color }}
                                          />
                                          {tag.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.tag && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateLineItemTag(item.id, undefined)}
                              className="px-2 py-1 h-8 text-red-600 hover:bg-red-50"
                              title="Remove tag"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {editingReceiptData.lineItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="flex flex-col items-center gap-2">
                        <Receipt className="h-8 w-8 opacity-50" />
                        <p className="font-medium">No line items</p>
                        <p className="text-sm">Add items to break down this receipt</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveReceipt}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const receipt = receipts.find(r => r.id === deletingReceiptId);
                let entryType = 'receipt';
                let warning = 'This action cannot be undone.';
                
                if (receipt?.source_subscription_id) {
                  entryType = 'subscription expense';
                  warning = 'This expense was auto-generated from a subscription. Deleting it may cause issues with subscription tracking.';
                } else if (receipt?.receipt_type === 'manual') {
                  entryType = 'expense';
                }
                
                return `Are you sure you want to delete this ${entryType}? ${warning}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {deletingReceiptId && (() => {
            const receipt = receipts.find(r => r.id === deletingReceiptId);
            if (!receipt) return null;
            
            return (
              <div className="bg-gray-50 rounded-lg p-4 my-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    receipt.source_subscription_id
                      ? "bg-gradient-to-r from-green-100 to-teal-100"
                      : "bg-gradient-to-r from-purple-100 to-blue-100"
                  )}>
                    {receipt.source_subscription_id ? (
                      <Repeat className="h-5 w-5 text-green-600" />
                    ) : receipt.receipt_type === 'manual' ? (
                      <PenTool className="h-5 w-5 text-purple-600" />
                    ) : (
                      <Store className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{receipt.vendor}</div>
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const dateStr = receipt.date;
                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                          const [year, month, day] = dateStr.split('-').map(Number);
                          const localDate = new Date(year, month - 1, day);
                          return localDate.toLocaleDateString();
                        }
                        if (dateStr.includes('T')) {
                          const datePart = dateStr.split('T')[0];
                          const [year, month, day] = datePart.split('-').map(Number);
                          const localDate = new Date(year, month - 1, day);
                          return localDate.toLocaleDateString();
                        }
                        return new Date(dateStr).toLocaleDateString();
                      })()} • ${receipt.amount.toFixed(2)}
                    </div>
                    {receipt.source_subscription_id && (
                      <div className="text-xs text-green-600 mt-1">
                        Subscription: Auto-generated expense
                      </div>
                    )}
                    {receipt.receipt_type === 'manual' && receipt.manual_entry_reason && (
                      <div className="text-xs text-purple-600 mt-1">
                        Manual: {receipt.manual_entry_reason.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingReceiptId(null);
              }}
              disabled={deleting}
              className="border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteReceipt}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}