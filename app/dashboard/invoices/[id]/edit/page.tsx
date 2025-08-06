"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Plus,
  Trash2,
  User,
  FileText,
  Calendar,
  DollarSign,
  Save,
  Eye
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { InvoicePreview } from "@/components/invoice-preview";
import { InvoicePreviewWrapper } from "@/components/invoice-preview-wrapper";

interface Client {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  address?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
}

interface Template {
  id: string;
  name: string;
  template_type: string;
  color_scheme: string;
  font_family?: string;
  default_payment_terms: string;
  default_notes?: string;
  show_tax: boolean;
  tax_rate: number;
  tax_label: string;
  next_invoice_number: number;
  invoice_prefix: string;
  // Logo fields
  logo_url?: string;
  logo_position?: 'left' | 'center' | 'right';
  logo_size?: 'small' | 'medium' | 'large';
  // Company info fields
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  subject: string;
  issue_date: string;
  due_date: string;
  notes?: string;
  subtotal: number;
  tax_rate: number;
  total_amount: number;
  status: string;
  client_id: string;
  template_id: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sort_order: number;
}

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id as string;
  
  // Helper function to get local date string without UTC conversion
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [loading, setLoading] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  
  // Form data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [invoiceData, setInvoiceData] = useState({
    subject: "",
    issue_date: "",
    due_date: "",
    notes: "",
    show_tax: true,
    tax_rate: 0,
    tax_label: "Tax",
    status: "draft",
    invoice_number: ""
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  
  // Data lists
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData();
      fetchClients();
      fetchTemplates();
    }
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      setLoadingInvoice(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      // Fetch invoice data
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoice')
        .select(`
          *,
          client:client_id (*),
          template:template_id (*)
        `)
        .eq('id', invoiceId)
        .eq('tenant_id', membership.tenant_id)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoice) throw new Error("Invoice not found");

      // Set invoice data - use template tax settings instead of old invoice tax settings
      setInvoiceData({
        subject: invoice.subject || "",
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        notes: invoice.notes || "",
        show_tax: invoice.template?.show_tax || false,
        tax_rate: (invoice.template?.tax_rate || 0) * 100,
        tax_label: invoice.template?.tax_label || "Tax",
        status: invoice.status,
        invoice_number: invoice.invoice_number
      });

      setSelectedClient(invoice.client);
      setSelectedTemplate(invoice.template);

      // Debug logging to see what template is loaded
      console.log('🔍 Invoice template loaded:', {
        template_id: invoice.template?.id,
        template_name: invoice.template?.name,
        template_type: invoice.template?.template_type,
        show_tax: invoice.template?.show_tax,
        tax_rate: invoice.template?.tax_rate,
        color_scheme: invoice.template?.color_scheme
      });
      
      // Additional debugging for the entire template object
      console.log('🔍 Full template object:', invoice.template);

      // Fetch invoice items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_item')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order');

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const formattedItems = items.map((item: InvoiceItem) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        }));
        setLineItems(formattedItems);
      }

    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error("Failed to load invoice data");
      router.push('/dashboard/invoices');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data, error } = await supabase
        .from('client')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error("Failed to load clients");
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data, error } = await supabase
        .from('invoice_template')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error("Failed to load templates");
    }
  };

  const calculateDueDate = (issueDate: string, paymentTerms: string) => {
    // Parse date in local timezone to avoid UTC conversion issues
    const [year, month, day] = issueDate.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const days = paymentTerms === 'Net 15' ? 15 : 
                 paymentTerms === 'Net 30' ? 30 : 
                 paymentTerms === 'Net 60' ? 60 : 
                 paymentTerms === 'Net 90' ? 90 : 0;
    date.setDate(date.getDate() + days);
    return getLocalDateString(date);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const addLineItem = () => {
    const newId = (Math.max(...lineItems.map(item => parseInt(item.id))) + 1).toString();
    setLineItems(prev => [...prev, {
      id: newId,
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0
    }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = invoiceData.show_tax ? subtotal * (invoiceData.tax_rate / 100) : 0;
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!selectedClient || !selectedTemplate) {
        toast.error("Please select a client and template");
        return;
      }

      if (lineItems.length === 0 || lineItems.every(item => !item.description)) {
        toast.error("Please add at least one line item");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant membership found");

      const { subtotal, taxAmount, total } = calculateTotals();

      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoice')
        .update({
          client_id: selectedClient.id,
          template_id: selectedTemplate.id,
          issue_date: invoiceData.issue_date,
          due_date: invoiceData.due_date,
          subject: invoiceData.subject,
          notes: invoiceData.notes,
          subtotal,
          tax_rate: invoiceData.tax_rate / 100,
          status: invoiceData.status
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Delete existing line items
      await supabase
        .from('invoice_item')
        .delete()
        .eq('invoice_id', invoiceId);

      // Create new line items
      const lineItemsData = lineItems
        .filter(item => item.description.trim())
        .map((item, index) => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          sort_order: index
        }));

      if (lineItemsData.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_item')
          .insert(lineItemsData);

        if (itemsError) throw itemsError;
      }

      toast.success("Invoice updated successfully!");
      router.push('/dashboard/invoices');

    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error("Failed to update invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const renderInvoicePreview = () => {
    if (!selectedTemplate || !selectedClient) return null;
    
    return (
      <InvoicePreview 
        template={selectedTemplate}
        invoice={{
          invoice_number: invoiceData.invoice_number,
          issue_date: invoiceData.issue_date,
          due_date: invoiceData.due_date,
          subject: invoiceData.subject,
          notes: invoiceData.notes
        }}
        client={selectedClient}
        items={lineItems}
      />
    );
  };


  if (loadingInvoice) {
    return (
      <div className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
        <div className="w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Edit Invoice
                </h1>
                <Badge 
                  variant="secondary" 
                  className={`${
                    invoiceData.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    invoiceData.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    invoiceData.status === 'viewed' ? 'bg-purple-100 text-purple-800' :
                    invoiceData.status === 'paid' ? 'bg-green-100 text-green-800' :
                    invoiceData.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {invoiceData.status.charAt(0).toUpperCase() + invoiceData.status.slice(1)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Update your invoice details • {invoiceData.invoice_number}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard/invoices')} className="bg-white/80 backdrop-blur-sm">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                {loading ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Invoice
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Form */}
          <div className="space-y-6">
            {/* Client & Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client & Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Client</Label>
                    <Select 
                      value={selectedClient?.id} 
                      onValueChange={(value) => {
                        const client = clients.find(c => c.id === value);
                        setSelectedClient(client || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="text-muted-foreground">None - Clear selection</div>
                        </SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              {client.email && <div className="text-xs text-gray-500">{client.email}</div>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Invoice Template</Label>
                    <Select 
                      value={selectedTemplate?.id} 
                      onValueChange={(value) => {
                        const template = templates.find(t => t.id === value);
                        setSelectedTemplate(template || null);
                        // Update tax settings when template changes
                        if (template) {
                          setInvoiceData(prev => ({
                            ...prev,
                            show_tax: template.show_tax,
                            tax_rate: template.tax_rate * 100,
                            tax_label: template.tax_label
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              {template.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject/Description</Label>
                  <Input
                    id="subject"
                    value={invoiceData.subject}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Invoice for services rendered"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue-date">Issue Date</Label>
                    <Input
                      id="issue-date"
                      type="date"
                      value={invoiceData.issue_date}
                      onChange={(e) => {
                        setInvoiceData(prev => ({ ...prev, issue_date: e.target.value }));
                        if (selectedTemplate) {
                          setInvoiceData(prev => ({ 
                            ...prev, 
                            due_date: calculateDueDate(e.target.value, selectedTemplate.default_payment_terms)
                          }));
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due-date">Due Date</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={invoiceData.due_date}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Invoice Status</Label>
                  <Select 
                    value={invoiceData.status} 
                    onValueChange={(value) => setInvoiceData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                          Draft
                        </div>
                      </SelectItem>
                      <SelectItem value="sent">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Sent
                        </div>
                      </SelectItem>
                      <SelectItem value="viewed">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          Viewed
                        </div>
                      </SelectItem>
                      <SelectItem value="paid">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Paid
                        </div>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Overdue
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                          Cancelled
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={invoiceData.notes}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes for your client"
                    rows={3}
                  />
                </div>

                {/* Tax Configuration */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Tax Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Enable Tax</Label>
                      <p className="text-sm text-muted-foreground">Apply tax to this invoice</p>
                    </div>
                    <Button
                      type="button"
                      variant={invoiceData.show_tax ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInvoiceData(prev => ({ ...prev, show_tax: !prev.show_tax }))}
                    >
                      {invoiceData.show_tax ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  
                  {invoiceData.show_tax && (
                    <div className="space-y-4 pl-4 border-l-2 border-blue-100">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tax-rate-edit">Tax Rate (%)</Label>
                          <Input
                            id="tax-rate-edit"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={invoiceData.tax_rate}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value) || 0;
                              setInvoiceData(prev => ({
                                ...prev,
                                tax_rate: Math.min(100, Math.max(0, rate))
                              }));
                            }}
                            placeholder="8.5"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tax-label-edit">Tax Label</Label>
                          <Input
                            id="tax-label-edit"
                            value={invoiceData.tax_label}
                            onChange={(e) => setInvoiceData(prev => ({ ...prev, tax_label: e.target.value }))}
                            placeholder="Tax"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tax will be calculated as {invoiceData.tax_rate}% of the subtotal
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Line Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Service or product"
                        className="h-9"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label className="text-xs">Rate</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="col-span-1 text-right font-medium pt-5">
                      ${item.amount.toFixed(2)}
                    </div>
                    
                    <div className="col-span-1 flex items-end justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addLineItem}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line Item
                </Button>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  {invoiceData.show_tax && (
                    <div className="flex justify-between text-sm">
                      <span>{invoiceData.tax_label} ({invoiceData.tax_rate}%)</span>
                      <span className="font-medium">${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Preview */}
          <div className="space-y-4">
            <InvoicePreviewWrapper showEmpty={!selectedClient || !selectedTemplate}>
              {selectedClient && selectedTemplate && renderInvoicePreview()}
            </InvoicePreviewWrapper>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}