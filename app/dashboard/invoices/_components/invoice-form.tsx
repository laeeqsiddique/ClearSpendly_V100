"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  User, 
  FileText, 
  DollarSign,
  Calculator,
  Send,
  Save
} from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  payment_terms: string;
}

interface InvoiceTemplate {
  id: string;
  name: string;
  template_type: string;
  color_scheme: string;
  default_payment_terms: string;
  tax_rate: number;
  invoice_prefix: string;
  next_invoice_number: number;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  editData?: any | null;
}

export function InvoiceForm({ open, onClose, onSubmit, editData }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  
  const [formData, setFormData] = useState({
    subject: "",
    notes: "",
    terms: "",
    paymentTerms: "Net 30"
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, rate: 0, amount: 0 }
  ]);

  const [totals, setTotals] = useState({
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0
  });

  const supabase = createClient();

  // Load clients and templates
  useEffect(() => {
    if (open) {
      loadClients();
      loadTemplates();
    }
  }, [open]);

  // Calculate totals when items change
  useEffect(() => {
    calculateTotals();
  }, [items, totals.taxRate]);

  // Update due date when payment terms change
  useEffect(() => {
    if (formData.paymentTerms && issueDate) {
      const days = parseInt(formData.paymentTerms.replace(/\D/g, "")) || 30;
      setDueDate(addDays(issueDate, days));
    }
  }, [formData.paymentTerms, issueDate]);

  const loadClients = async () => {
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
      console.error('Error loading clients:', error);
      toast.error("Failed to load clients");
    }
  };

  const loadTemplates = async () => {
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
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
      
      // Auto-select default template
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
        setTotals(prev => ({ ...prev, taxRate: defaultTemplate.tax_rate }));
        setFormData(prev => ({ 
          ...prev, 
          paymentTerms: defaultTemplate.default_payment_terms 
        }));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error("Failed to load templates");
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (totals.taxRate / 100);
    const total = subtotal + taxAmount;

    setTotals(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      total
    }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate amount for quantity/rate changes
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (isDraft = false) => {
    try {
      setLoading(true);

      if (!selectedClient || !selectedTemplate) {
        toast.error("Please select a client and template");
        return;
      }

      if (items.some(item => !item.description || item.rate <= 0)) {
        toast.error("Please fill in all item details");
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
      const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
      if (!selectedTemplateData) throw new Error("Template not found");

      const { data: invoiceNumberData, error: numberError } = await supabase
        .rpc('generate_invoice_number', { template_uuid: selectedTemplate });

      if (numberError) throw numberError;

      // Create invoice
      const invoiceData = {
        tenant_id: membership.tenant_id,
        user_id: user.id,
        client_id: selectedClient,
        template_id: selectedTemplate,
        invoice_number: invoiceNumberData,
        issue_date: format(issueDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: isDraft ? 'draft' : 'draft',
        subject: formData.subject,
        notes: formData.notes,
        terms: formData.terms,
        subtotal: totals.subtotal,
        tax_rate: totals.taxRate / 100,
        currency: 'USD'
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoice')
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const itemsData = items.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('invoice_item')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success(`Invoice ${invoiceData.invoice_number} created successfully!`);
      onSubmit();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error("Failed to create invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create New Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client and Template Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client">
                    {selectedClient && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {clients.find(c => c.id === selectedClient)?.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        {client.company_name && (
                          <span className="text-sm text-muted-foreground">{client.company_name}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Invoice Template *</Label>
              <Select value={selectedTemplate} onValueChange={(templateId) => {
                setSelectedTemplate(templateId);
                // Update tax rate from selected template
                const template = templates.find(t => t.id === templateId);
                if (template) {
                  setTotals(prev => ({
                    ...prev,
                    taxRate: template.tax_rate * 100 // Convert from decimal to percentage
                  }));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template">
                    {selectedTemplate && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {templates.find(t => t.id === selectedTemplate)?.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{template.name}</span>
                        {template.is_default && (
                          <Badge variant="secondary" className="ml-2">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !issueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issueDate ? format(issueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={issueDate}
                    onSelect={(date) => date && setIssueDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-terms">Payment Terms</Label>
              <Select 
                value={formData.paymentTerms} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Net 90">Net 90</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => date && setDueDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Web Development Services - January 2024"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Invoice Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5 space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Service or product description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label>Rate</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label>Amount</Label>
                    <div className="text-lg font-semibold p-2 bg-gray-50 rounded">
                      ${item.amount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" onClick={addItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          {/* Tax Configuration */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="tax-rate" className="text-sm">Tax Rate (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={totals.taxRate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      setTotals(prev => ({
                        ...prev,
                        taxRate: Math.min(100, Math.max(0, rate))
                      }));
                    }}
                    className="w-24 text-right"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  {totals.taxRate > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTotals(prev => ({ ...prev, taxRate: 0 }))}
                      className="ml-2"
                    >
                      Remove Tax
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({totals.taxRate}%):</span>
                    <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes for your client..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                placeholder="Payment terms and conditions..."
                value={formData.terms}
                onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSubmit(true)} 
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={loading}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}