"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Plus,
  Trash2,
  User,
  FileText,
  Calculator,
  Check,
  Calendar,
  DollarSign,
  Save
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  email: string;
  company_name?: string;
}

interface Template {
  id: string;
  name: string;
  template_type: string;
  color_scheme: string;
  default_payment_terms: string;
  default_notes?: string;
  footer_text?: string;
  show_tax: boolean;
  tax_rate: number;
  tax_label: string;
  next_invoice_number: number;
  invoice_prefix: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [invoiceData, setInvoiceData] = useState({
    subject: "",
    issue_date: new Date().toISOString().split('T')[0],
    due_date: "",
    notes: "",
    terms: "",
    show_tax: true,
    tax_rate: 0,
    tax_label: "Tax"
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  
  // Data lists
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchClients();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setInvoiceData(prev => ({
        ...prev,
        due_date: calculateDueDate(prev.issue_date, selectedTemplate.default_payment_terms),
        notes: selectedTemplate.default_notes || "",
        show_tax: selectedTemplate.show_tax,
        tax_rate: selectedTemplate.tax_rate * 100,
        tax_label: selectedTemplate.tax_label
      }));
    }
  }, [selectedTemplate]);

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
        .select('id, name, email, company_name')
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
      
      // Auto-select default template
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate && !selectedTemplate) {
        setSelectedTemplate(defaultTemplate);
      }
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

      // Generate invoice number
      const invoiceNumber = `${selectedTemplate.invoice_prefix}-${selectedTemplate.next_invoice_number.toString().padStart(4, '0')}`;

      const { subtotal, taxAmount, total } = calculateTotals();

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoice')
        .insert({
          tenant_id: membership.tenant_id,
          user_id: user.id,
          client_id: selectedClient.id,
          template_id: selectedTemplate.id,
          invoice_number: invoiceNumber,
          issue_date: invoiceData.issue_date,
          due_date: invoiceData.due_date,
          subject: invoiceData.subject,
          notes: invoiceData.notes,
          terms: invoiceData.terms,
          subtotal,
          tax_rate: invoiceData.tax_rate / 100,
          total_amount: total
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items
      const lineItemsData = lineItems
        .filter(item => item.description.trim())
        .map((item, index) => ({
          invoice_id: invoice.id,
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

      // Update template next invoice number
      await supabase
        .from('invoice_template')
        .update({ next_invoice_number: selectedTemplate.next_invoice_number + 1 })
        .eq('id', selectedTemplate.id);

      toast.success(`Invoice ${invoiceNumber} created successfully!`);
      router.push('/dashboard/invoices');

    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error("Failed to create invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Client & Template", icon: User },
    { number: 2, title: "Invoice Details", icon: FileText },
    { number: 3, title: "Line Items", icon: Calculator },
    { number: 4, title: "Review & Create", icon: Check }
  ];

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/invoices')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Invoice</h1>
            <p className="text-muted-foreground">Generate a professional invoice for your client</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/invoices')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Invoice
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep >= step.number 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{step.title}</div>
                    <div className="text-sm text-muted-foreground">Step {step.number}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-0.5 mx-6 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Client & Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Client & Template Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.email}</div>
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

          {/* Step 2: Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={invoiceData.subject}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Invoice for services rendered"
                  />
                </div>

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

                <div className="space-y-2">
                  <Label>Invoice Number Preview</Label>
                  <div className="p-3 bg-gray-50 rounded-md border">
                    {selectedTemplate ? 
                      `${selectedTemplate.invoice_prefix}-${selectedTemplate.next_invoice_number.toString().padStart(4, '0')}` :
                      'Select a template'
                    }
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
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

          {/* Step 3: Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                  <div className="col-span-5">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Service or product description"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Rate</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Amount</Label>
                    <div className="p-3 bg-gray-50 rounded-md border text-right font-medium">
                      ${item.amount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
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
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedClient && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">{selectedClient.name}</div>
                  <div className="text-sm text-gray-600">{selectedClient.email}</div>
                  {selectedClient.company_name && (
                    <div className="text-sm text-gray-600">{selectedClient.company_name}</div>
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                
                {invoiceData.show_tax && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {invoiceData.tax_label} ({invoiceData.tax_rate}%)
                    </span>
                    <span className="font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {selectedTemplate && (
                <>
                  <Separator />
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Template</span>
                      <span>{selectedTemplate.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Terms</span>
                      <span>{selectedTemplate.default_payment_terms}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}