"use client";

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

interface Client {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  address?: string;
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

      // Set invoice data
      setInvoiceData({
        subject: invoice.subject || "",
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        notes: invoice.notes || "",
        show_tax: invoice.tax_rate > 0,
        tax_rate: invoice.tax_rate * 100,
        tax_label: "Tax",
        status: invoice.status,
        invoice_number: invoice.invoice_number
      });

      setSelectedClient(invoice.client);
      setSelectedTemplate(invoice.template);

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
    const date = new Date(issueDate);
    const days = paymentTerms === 'Net 15' ? 15 : 
                 paymentTerms === 'Net 30' ? 30 : 
                 paymentTerms === 'Net 60' ? 60 : 
                 paymentTerms === 'Net 90' ? 90 : 0;
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
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
    
    const color = selectedTemplate.color_scheme || '#1e40af';
    const fontClass = selectedTemplate.font_family || 'font-sans';
    
    return (
      <div className={`bg-white border rounded-lg p-6 shadow-sm ${fontClass}`} style={{ minHeight: '400px', fontSize: '14px' }}>
        {/* Header */}
        <div className="mb-6">
          {selectedTemplate.logo_url && (
            <div className={`mb-4 ${
              selectedTemplate.logo_position === 'center' ? 'flex justify-center' :
              selectedTemplate.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'
            }`}>
              <img 
                src={selectedTemplate.logo_url} 
                alt="Company Logo" 
                style={{ 
                  height: selectedTemplate.logo_size === 'small' ? '40px' : 
                         selectedTemplate.logo_size === 'large' ? '80px' : '60px',
                  width: 'auto', 
                  objectFit: 'contain' 
                }}
              />
            </div>
          )}
          
          <div className="flex justify-between items-start">
            <div>
              {selectedTemplate.company_name && (
                <h1 className="text-2xl font-bold mb-2" style={{ color }}>{selectedTemplate.company_name}</h1>
              )}
              {selectedTemplate.company_address && (
                <div className="text-sm text-gray-600 whitespace-pre-line">{selectedTemplate.company_address}</div>
              )}
              {(selectedTemplate.company_phone || selectedTemplate.company_email) && (
                <div className="text-sm text-gray-600 mt-1">
                  {selectedTemplate.company_phone} {selectedTemplate.company_email && `• ${selectedTemplate.company_email}`}
                </div>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-700 mb-2">INVOICE</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Invoice #:</strong> {invoiceData.invoice_number || 'Loading...'}</div>
                <div><strong>Date:</strong> {invoiceData.issue_date}</div>
                <div><strong>Due:</strong> {invoiceData.due_date}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Subject/Description */}
        {invoiceData.subject && (
          <div className="mb-6">
            <div className="text-lg font-medium text-gray-800 border-l-4 pl-4" style={{ borderColor: color }}>
              {invoiceData.subject}
            </div>
          </div>
        )}

        {/* Bill To - Moved after subject */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-2">BILL TO:</h3>
          <div className="text-sm text-gray-600">
            <div className="font-medium">{selectedClient.name}</div>
            {selectedClient.company_name && <div>{selectedClient.company_name}</div>}
            {selectedClient.address && <div className="whitespace-pre-line">{selectedClient.address}</div>}
            {selectedClient.email && <div>{selectedClient.email}</div>}
            {selectedClient.phone && <div>{selectedClient.phone}</div>}
          </div>
        </div>


        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b-2" style={{ borderColor: color }}>
                <th className="text-left py-2 text-sm font-semibold">Description</th>
                <th className="text-center py-2 text-sm font-semibold w-16">Qty</th>
                <th className="text-right py-2 text-sm font-semibold w-20">Rate</th>
                <th className="text-right py-2 text-sm font-semibold w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.filter(item => item.description).map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 text-sm">{item.description}</td>
                  <td className="py-2 text-sm text-center">{item.quantity}</td>
                  <td className="py-2 text-sm text-right">${item.rate.toFixed(2)}</td>
                  <td className="py-2 text-sm text-right font-medium">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-48">
            <div className="flex justify-between py-1 text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            {invoiceData.show_tax && (
              <div className="flex justify-between py-1 text-sm">
                <span>{invoiceData.tax_label} ({invoiceData.tax_rate}%):</span>
                <span className="font-medium">${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t font-bold" style={{ borderColor: color }}>
              <span>Total:</span>
              <span style={{ color }}>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoiceData.notes && (
          <div className="text-sm text-gray-600">
            <div className="font-semibold mb-1">Notes:</div>
            <div className="whitespace-pre-line">{invoiceData.notes}</div>
          </div>
        )}
      </div>
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
                    
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="h-9 w-9 p-0"
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
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedClient && selectedTemplate ? (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="transform scale-90 origin-top">
                      {renderInvoicePreview()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Select a client and template to see preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}