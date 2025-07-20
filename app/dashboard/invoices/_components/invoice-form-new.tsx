"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  User, 
  FileText, 
  Calculator,
  Save,
  ArrowRight,
  ArrowLeft,
  Check
} from "lucide-react";
import { format, addDays } from "date-fns";
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

export function InvoiceFormNew({ open, onClose, onSubmit, editData }: InvoiceFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [issueDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  
  const [formData, setFormData] = useState({
    subject: "",
    notes: "",
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

  const steps = [
    { number: 1, title: "Client & Template", icon: User },
    { number: 2, title: "Invoice Details", icon: FileText },
    { number: 3, title: "Line Items", icon: Calculator },
    { number: 4, title: "Review & Create", icon: Check }
  ];

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
        setTotals(prev => ({ ...prev, taxRate: defaultTemplate.tax_rate * 100 }));
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

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return selectedClient && selectedTemplate;
      case 2:
        return formData.subject.trim().length > 0;
      case 3:
        return items.some(item => item.description && item.rate > 0);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceedToNext()) {
      setCurrentStep(prev => Math.min(4, prev + 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Client & Template</h3>
              
              <div className="space-y-4">
                {/* Client Selection */}
                <div className="space-y-2">
                  <Label htmlFor="client">Who is this invoice for? *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose a client">
                        {selectedClient && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{clients.find(c => c.id === selectedClient)?.name}</div>
                              {clients.find(c => c.id === selectedClient)?.company_name && (
                                <div className="text-sm text-muted-foreground">
                                  {clients.find(c => c.id === selectedClient)?.company_name}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              {client.company_name && (
                                <div className="text-sm text-muted-foreground">{client.company_name}</div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Selection */}
                <div className="space-y-2">
                  <Label htmlFor="template">Choose Invoice Style *</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {templates.map((template) => (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-all border-2 ${
                          selectedTemplate === template.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full ${
                                template.color_scheme === 'blue' ? 'bg-blue-500' :
                                template.color_scheme === 'green' ? 'bg-green-500' :
                                template.color_scheme === 'purple' ? 'bg-purple-500' :
                                template.color_scheme === 'orange' ? 'bg-orange-500' :
                                template.color_scheme === 'red' ? 'bg-red-500' : 'bg-gray-500'
                              }`}></div>
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {template.template_type} • {template.invoice_prefix}-{template.next_invoice_number.toString().padStart(4, '0')}
                                </div>
                              </div>
                            </div>
                            {template.is_default && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{format(issueDate, "MMMM dd, yyyy")}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{format(dueDate, "MMMM dd, yyyy")}</span>
                    </div>
                  </div>
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
                      <SelectItem value="Net 15">Net 15 Days</SelectItem>
                      <SelectItem value="Net 30">Net 30 Days</SelectItem>
                      <SelectItem value="Net 60">Net 60 Days</SelectItem>
                      <SelectItem value="Net 90">Net 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Invoice Description *</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Web Development Services - January 2024"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information for your client..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What are you charging for?</h3>
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={item.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Item {index + 1}</Label>
                          {items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Input
                              placeholder="What did you do? (e.g., Website Design, Consulting Hours)"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="font-medium"
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-sm">Quantity</Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="text-center"
                              />
                            </div>
                            
                            <div>
                              <Label className="text-sm">Rate ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.rate}
                                onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            
                            <div>
                              <Label className="text-sm">Amount</Label>
                              <div className="h-10 px-3 py-2 bg-gray-50 rounded-md flex items-center justify-end font-medium">
                                ${item.amount.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button 
                  variant="outline" 
                  onClick={addItem} 
                  className="w-full h-12 border-dashed border-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Item
                </Button>
              </div>
            </div>
          </div>
        );

      case 4:
        const selectedClientData = clients.find(c => c.id === selectedClient);
        const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Review Your Invoice</h3>
              
              <div className="space-y-4">
                {/* Invoice Summary */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2">Client</h4>
                        <div className="text-blue-800">
                          <div className="font-medium">{selectedClientData?.name}</div>
                          {selectedClientData?.company_name && (
                            <div className="text-sm">{selectedClientData.company_name}</div>
                          )}
                          <div className="text-sm">{selectedClientData?.email}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2">Invoice Details</h4>
                        <div className="text-blue-800 text-sm space-y-1">
                          <div>Template: {selectedTemplateData?.name}</div>
                          <div>Issue Date: {format(issueDate, "MMM dd, yyyy")}</div>
                          <div>Due Date: {format(dueDate, "MMM dd, yyyy")}</div>
                          <div>Terms: {formData.paymentTerms}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Items Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1">
                            <div className="font-medium">{item.description}</div>
                            <div className="text-sm text-gray-500">
                              {item.quantity} × ${item.rate.toFixed(2)}
                            </div>
                          </div>
                          <div className="font-medium">${item.amount.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="my-4" />
                    
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
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create New Invoice
          </DialogTitle>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step.number 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        <div className="border-t pt-4 flex justify-between">
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onClose : handlePrevious}
            disabled={loading}
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </>
            )}
          </Button>
          
          <div className="flex gap-2">
            {currentStep === 4 && (
              <Button 
                variant="outline" 
                onClick={() => handleSubmit(true)} 
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            )}
            
            <Button 
              onClick={currentStep === 4 ? () => handleSubmit(false) : handleNext}
              disabled={!canProceedToNext() || loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : currentStep === 4 ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Invoice
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}