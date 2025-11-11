"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileImage, DollarSign, X, Edit2, Check, ChevronDown, ChevronUp, Trash2, FileText } from "lucide-react";
import { InvoiceData, InvoiceLineItem } from "@/lib/types/invoice";

// Helper function to format currency with thousand separators
const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  // Get currency symbol or use code
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'INR': '₹',
    'CNY': '¥',
  };

  const symbol = currencySymbols[currency] || currency;

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${symbol}${formatted}`;
};

// Helper to get currency symbol for input fields
const getCurrencySymbol = (currency: string = 'USD'): string => {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'INR': '₹',
    'CNY': '¥',
  };
  return currencySymbols[currency] || currency;
};

interface ProcessedInvoice {
  id: string;
  fileName: string;
  data: InvoiceData;
  uploadedAt: Date;
}

export default function VendorInvoicePage() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processedInvoices, setProcessedInvoices] = useState<ProcessedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<ProcessedInvoice | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState<InvoiceData | null>(null);
  const [expandedLineItems, setExpandedLineItems] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

    // Validate all files first
    for (const file of fileArray) {
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Please upload JPG, PNG, or PDF files.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        return;
      }
    }

    setUploading(true);

    try {
      const newInvoices: ProcessedInvoice[] = [];

      for (const file of fileArray) {
        console.log(`📄 Processing: ${file.name}`);

        let imageDataToProcess: string;

        // Handle PDF files - convert to image first
        if (file.type === "application/pdf") {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);

          const scale = 2.0;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Failed to get canvas context");

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          imageDataToProcess = canvas.toDataURL("image/png");
        } else {
          const reader = new FileReader();
          imageDataToProcess = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        // Call invoice processing API
        const response = await fetch("/api/process-invoice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: imageDataToProcess }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Failed to process ${file.name}:`, error.error);
          continue; // Skip this file and continue with others
        }

        const result = await response.json();
        console.log(`✅ Processed: ${file.name}`);

        newInvoices.push({
          id: `${Date.now()}-${Math.random()}`,
          fileName: file.name,
          data: result.data,
          uploadedAt: new Date(),
        });
      }

      if (newInvoices.length > 0) {
        setProcessedInvoices(prev => [...prev, ...newInvoices]);

        // Auto-select the first new invoice
        if (!selectedInvoice) {
          setSelectedInvoice(newInvoices[0]);
          setEditedInvoice(newInvoices[0].data);
        }
      }

      setUploading(false);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to process invoices");
      setUploading(false);
    }
  }, [selectedInvoice]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log("🎯 File input changed!", e.target.files?.length, "files selected");
      if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files);
      }
    },
    [handleFileUpload]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  const handleClearSelection = () => {
    setSelectedInvoice(null);
    setEditedInvoice(null);
    setEditMode(false);
    setExpandedLineItems(true);
  };

  const handleReset = () => {
    setProcessedInvoices([]);
    setSelectedInvoice(null);
    setEditedInvoice(null);
    setEditMode(false);
    setExpandedLineItems(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectInvoice = (invoice: ProcessedInvoice) => {
    setSelectedInvoice(invoice);
    setEditedInvoice(invoice.data);
    setEditMode(false);
    setExpandedLineItems(true);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setProcessedInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    if (selectedInvoice?.id === invoiceId) {
      const remaining = processedInvoices.filter(inv => inv.id !== invoiceId);
      if (remaining.length > 0) {
        setSelectedInvoice(remaining[0]);
        setEditedInvoice(remaining[0].data);
      } else {
        setSelectedInvoice(null);
        setEditedInvoice(null);
      }
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleHeaderFieldChange = (field: keyof InvoiceData["header"], value: string | number) => {
    if (!editedInvoice) return;
    setEditedInvoice({
      ...editedInvoice,
      header: {
        ...editedInvoice.header,
        [field]: value,
      },
    });
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    if (!editedInvoice) return;
    const newLineItems = [...editedInvoice.lineItems];
    newLineItems[index] = {
      ...newLineItems[index],
      [field]: value,
    };
    setEditedInvoice({
      ...editedInvoice,
      lineItems: newLineItems,
    });
  };

  const handleSaveEdits = () => {
    if (!selectedInvoice || !editedInvoice) return;

    // Update the invoice in the list
    setProcessedInvoices(prev =>
      prev.map(inv =>
        inv.id === selectedInvoice.id
          ? { ...inv, data: editedInvoice }
          : inv
      )
    );

    // Update selected invoice
    setSelectedInvoice({ ...selectedInvoice, data: editedInvoice });
    setEditMode(false);
    console.log("💾 Invoice data saved (demo - no persistence):", editedInvoice);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Vendor Invoice Processing
              </h1>
              <p className="text-gray-600">
                Demo: Upload vendor invoices to extract structured data with AI
              </p>
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Demo Mode: No data persistence
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 mb-8">
          <input
            id="invoice-file-input"
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleInputChange}
            disabled={uploading}
            style={{ display: "none" }}
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
                    {dragActive ? "Drop invoice here" : uploading ? "Processing Invoice..." : "Upload Vendor Invoice"}
                  </h3>
                  <p className="text-gray-600">
                    Click the button below or drag invoice files here
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
          </div>

        {/* Invoice List Section */}
        {processedInvoices.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Processed Invoices <span className="text-purple-600">({processedInvoices.length})</span>
              </h2>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => handleSelectInvoice(invoice)}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedInvoice?.id === invoice.id
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                  }`}
                >
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteInvoice(invoice.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors duration-200"
                    title="Delete invoice"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Invoice Card Content */}
                  <div className="space-y-2 pr-8">
                    <div className="flex items-start gap-2">
                      <FileText className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={invoice.fileName}>
                          {invoice.fileName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700 font-semibold truncate" title={invoice.data.header.vendorName}>
                        {invoice.data.header.vendorName}
                      </p>
                      <p className="text-gray-600 font-mono text-xs">
                        #{invoice.data.header.invoiceNumber}
                      </p>
                      <p className="text-purple-600 font-bold text-lg">
                        {formatCurrency(invoice.data.header.totalAmount, invoice.data.header.currency)}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {invoice.data.lineItems.length} line item{invoice.data.lineItems.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {selectedInvoice?.id === invoice.id && (
                    <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none">
                      <div className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoice Review Section */}
        {selectedInvoice && editedInvoice && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Actions */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Invoice Details</h2>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={handleSaveEdits}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-200 font-semibold shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-200 font-semibold shadow-sm"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <button
                  onClick={handleClearSelection}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Vendor & Invoice Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedInvoice.header.vendorName}
                      onChange={(e) => handleHeaderFieldChange("vendorName", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-lg font-semibold"
                    />
                  ) : (
                    <p className="px-4 py-2.5 text-lg font-semibold text-gray-900 bg-gray-50 rounded-lg">{editedInvoice.header.vendorName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Number</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedInvoice.header.vendorNumber || ""}
                      onChange={(e) => handleHeaderFieldChange("vendorNumber", e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                  ) : (
                    <p className="px-4 py-2.5 text-gray-900 bg-gray-50 rounded-lg min-h-[42px] flex items-center">{editedInvoice.header.vendorNumber || "N/A"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedInvoice.header.invoiceNumber}
                      onChange={(e) => handleHeaderFieldChange("invoiceNumber", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 font-mono"
                    />
                  ) : (
                    <p className="px-4 py-2.5 text-gray-900 font-mono bg-gray-50 rounded-lg min-h-[42px] flex items-center">{editedInvoice.header.invoiceNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PO Number</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedInvoice.header.poNumber || ""}
                      onChange={(e) => handleHeaderFieldChange("poNumber", e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 font-mono"
                    />
                  ) : (
                    <p className="px-4 py-2.5 text-gray-900 font-mono bg-gray-50 rounded-lg min-h-[42px] flex items-center">{editedInvoice.header.poNumber || "N/A"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
                  {editMode ? (
                    <input
                      type="date"
                      value={editedInvoice.header.invoiceDate}
                      onChange={(e) => handleHeaderFieldChange("invoiceDate", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                  ) : (
                    <p className="px-4 py-2.5 text-gray-900 bg-gray-50 rounded-lg min-h-[42px] flex items-center">{editedInvoice.header.invoiceDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  {editMode ? (
                    <input
                      type="date"
                      value={editedInvoice.header.dueDate || ""}
                      onChange={(e) => handleHeaderFieldChange("dueDate", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                  ) : (
                    <p className="px-4 py-2.5 text-gray-900 bg-gray-50 rounded-lg min-h-[42px] flex items-center">{editedInvoice.header.dueDate || "N/A"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <p className="px-4 py-2.5 text-gray-900 bg-gray-50 rounded-lg min-h-[42px] flex items-center font-semibold">{editedInvoice.header.currency}</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(editedInvoice.header.subtotal, editedInvoice.header.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tax</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(editedInvoice.header.tax, editedInvoice.header.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(editedInvoice.header.totalAmount, editedInvoice.header.currency)}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <button
                  onClick={() => setExpandedLineItems(!expandedLineItems)}
                  className="flex items-center justify-between w-full mb-4 text-left p-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <h3 className="text-xl font-semibold text-gray-900">
                    Line Items <span className="text-purple-600">({editedInvoice.lineItems.length})</span>
                  </h3>
                  {expandedLineItems ? (
                    <ChevronUp className="h-5 w-5 text-purple-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-purple-600" />
                  )}
                </button>

                {expandedLineItems && (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Item Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            PO #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            PO Line
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Service Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {editedInvoice.lineItems.map((item, index) => (
                          <tr key={index} className="hover:bg-purple-50/30 transition-colors duration-150">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {editMode ? (
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                                />
                              ) : (
                                item.description
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                              {editMode ? (
                                <input
                                  type="text"
                                  value={item.itemCode || ""}
                                  onChange={(e) => handleLineItemChange(index, "itemCode", e.target.value)}
                                  placeholder="-"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                                />
                              ) : (
                                item.itemCode || "-"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {editMode ? (
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleLineItemChange(index, "quantity", parseFloat(e.target.value))}
                                  className="w-20 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                                />
                              ) : (
                                item.quantity
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {editMode ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">{getCurrencySymbol(editedInvoice.header.currency)}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => handleLineItemChange(index, "unitPrice", parseFloat(e.target.value))}
                                    className="w-24 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                                  />
                                </div>
                              ) : (
                                formatCurrency(item.unitPrice, editedInvoice.header.currency)
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-purple-600">
                              {editMode ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">{getCurrencySymbol(editedInvoice.header.currency)}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.totalPrice}
                                    onChange={(e) => handleLineItemChange(index, "totalPrice", parseFloat(e.target.value))}
                                    className="w-24 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-semibold transition-all duration-200"
                                  />
                                </div>
                              ) : (
                                formatCurrency(item.totalPrice, editedInvoice.header.currency)
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                              {editMode ? (
                                <input
                                  type="text"
                                  value={item.poNumber || ""}
                                  onChange={(e) => handleLineItemChange(index, "poNumber", e.target.value)}
                                  placeholder="-"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                                />
                              ) : (
                                item.poNumber || "-"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {editMode ? (
                                <input
                                  type="text"
                                  value={item.poLineItem || ""}
                                  onChange={(e) => handleLineItemChange(index, "poLineItem", e.target.value)}
                                  placeholder="-"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                                />
                              ) : (
                                item.poLineItem || "-"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {editMode ? (
                                <input
                                  type="date"
                                  value={item.serviceDate || ""}
                                  onChange={(e) => handleLineItemChange(index, "serviceDate", e.target.value)}
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                                />
                              ) : (
                                item.serviceDate || "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Confidence Score */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-600">AI Confidence:</p>
                <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-xs shadow-inner">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${editedInvoice.confidence}%` }}
                  ></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-purple-600">{editedInvoice.confidence}%</span>
                  {editedInvoice.confidence >= 90 && (
                    <span className="text-green-600 text-xs font-semibold">EXCELLENT</span>
                  )}
                  {editedInvoice.confidence >= 70 && editedInvoice.confidence < 90 && (
                    <span className="text-blue-600 text-xs font-semibold">GOOD</span>
                  )}
                  {editedInvoice.confidence < 70 && (
                    <span className="text-orange-600 text-xs font-semibold">REVIEW</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
