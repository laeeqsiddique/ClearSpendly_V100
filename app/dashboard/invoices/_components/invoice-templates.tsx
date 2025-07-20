"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Palette, 
  FileText, 
  Settings,
  Star,
  Copy
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface InvoiceTemplate {
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
  is_default: boolean;
  is_active: boolean;
}

interface InvoiceTemplatesProps {
  refreshTrigger?: number;
}

const templateTypes = [
  { value: "modern", label: "Modern", description: "Clean, contemporary design" },
  { value: "classic", label: "Classic", description: "Traditional business style" },
  { value: "minimal", label: "Minimal", description: "Simple and elegant" },
  { value: "professional", label: "Professional", description: "Corporate-style layout" }
];

const colorSchemes = [
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "green", label: "Green", color: "bg-green-500" },
  { value: "purple", label: "Purple", color: "bg-purple-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
  { value: "gray", label: "Gray", color: "bg-gray-500" },
  { value: "red", label: "Red", color: "bg-red-500" }
];

export function InvoiceTemplates({ refreshTrigger }: InvoiceTemplatesProps) {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    template_type: "modern",
    color_scheme: "blue",
    default_payment_terms: "Net 30",
    default_notes: "",
    footer_text: "",
    show_tax: true,
    tax_rate: 0,
    tax_label: "Tax",
    invoice_prefix: "INV",
    next_invoice_number: 1,
    is_default: false
  });

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, [refreshTrigger]);

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        template_type: editingTemplate.template_type,
        color_scheme: editingTemplate.color_scheme,
        default_payment_terms: editingTemplate.default_payment_terms,
        default_notes: editingTemplate.default_notes || "",
        footer_text: editingTemplate.footer_text || "",
        show_tax: editingTemplate.show_tax,
        tax_rate: editingTemplate.tax_rate * 100, // Convert to percentage
        tax_label: editingTemplate.tax_label,
        invoice_prefix: editingTemplate.invoice_prefix,
        next_invoice_number: editingTemplate.next_invoice_number,
        is_default: editingTemplate.is_default
      });
    } else {
      setFormData({
        name: "",
        template_type: "modern",
        color_scheme: "blue",
        default_payment_terms: "Net 30",
        default_notes: "",
        footer_text: "",
        show_tax: true,
        tax_rate: 0,
        tax_label: "Tax",
        invoice_prefix: "INV",
        next_invoice_number: 1,
        is_default: false
      });
    }
  }, [editingTemplate]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
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
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.invoice_prefix) {
        toast.error("Name and invoice prefix are required");
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

      const templateData = {
        ...formData,
        tax_rate: formData.tax_rate / 100, // Convert percentage to decimal
        tenant_id: membership.tenant_id,
        user_id: user.id
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('invoice_template')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success("Template updated successfully!");
      } else {
        const { error } = await supabase
          .from('invoice_template')
          .insert(templateData);

        if (error) throw error;
        toast.success("Template created successfully!");
      }

      // If this template is set as default, unset others
      if (formData.is_default) {
        await supabase
          .from('invoice_template')
          .update({ is_default: false })
          .eq('tenant_id', membership.tenant_id)
          .neq('id', editingTemplate?.id || '');
      }

      setShowForm(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template. Please try again.");
    }
  };

  const handleEdit = (template: InvoiceTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDuplicate = async (template: InvoiceTemplate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant membership found");

      const duplicateData = {
        name: `${template.name} (Copy)`,
        template_type: template.template_type,
        color_scheme: template.color_scheme,
        default_payment_terms: template.default_payment_terms,
        default_notes: template.default_notes,
        footer_text: template.footer_text,
        show_tax: template.show_tax,
        tax_rate: template.tax_rate,
        tax_label: template.tax_label,
        invoice_prefix: template.invoice_prefix,
        next_invoice_number: 1,
        is_default: false,
        tenant_id: membership.tenant_id,
        user_id: user.id
      };

      const { error } = await supabase
        .from('invoice_template')
        .insert(duplicateData);

      if (error) throw error;
      
      toast.success("Template duplicated successfully!");
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error("Failed to duplicate template");
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('invoice_template')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete template");
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      // Unset all defaults first
      await supabase
        .from('invoice_template')
        .update({ is_default: false })
        .eq('tenant_id', membership.tenant_id);

      // Set the selected template as default
      const { error } = await supabase
        .from('invoice_template')
        .update({ is_default: true })
        .eq('id', templateId);

      if (error) throw error;
      
      toast.success("Default template updated!");
      fetchTemplates();
    } catch (error) {
      console.error('Error setting default template:', error);
      toast.error("Failed to set default template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Invoice Templates</h3>
          <p className="text-sm text-muted-foreground">
            Customize your invoice design and default settings
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32"></div>
                <div className="h-3 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-20"></div>
                  <div className="h-3 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-4">Create your first invoice template to get started</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              {template.is_default && (
                <div className="absolute top-2 right-2">
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                    <Star className="w-3 h-3 mr-1" />
                    Default
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${
                    colorSchemes.find(c => c.value === template.color_scheme)?.color || 'bg-blue-500'
                  }`}></div>
                  <span className="truncate">{template.name}</span>
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  {templateTypes.find(t => t.value === template.template_type)?.label || 'Modern'} Style
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Prefix:</span>
                    <div className="font-medium">{template.invoice_prefix}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next #:</span>
                    <div className="font-medium">{template.next_invoice_number}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Terms:</span>
                    <div className="font-medium">{template.default_payment_terms}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tax:</span>
                    <div className="font-medium">
                      {template.show_tax ? `${(template.tax_rate * 100).toFixed(1)}%` : 'None'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  
                  {!template.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(template.id)}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      Set Default
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingTemplate(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Business Template"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-type">Design Style</Label>
                <Select 
                  value={formData.template_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, template_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color Scheme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {colorSchemes.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color_scheme: color.value }))}
                      className={`p-2 rounded-lg border-2 flex items-center gap-2 text-sm ${
                        formData.color_scheme === color.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${color.color}`}></div>
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-terms">Default Payment Terms</Label>
                <Select 
                  value={formData.default_payment_terms} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, default_payment_terms: value }))}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Invoice Prefix *</Label>
                <Input
                  id="prefix"
                  value={formData.invoice_prefix}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_prefix: e.target.value.toUpperCase() }))}
                  placeholder="INV"
                  maxLength={10}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="next-number">Next Invoice Number</Label>
                <Input
                  id="next-number"
                  type="number"
                  min="1"
                  value={formData.next_invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, next_invoice_number: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-tax">Include Tax</Label>
                  <p className="text-sm text-muted-foreground">Show tax calculation on invoices</p>
                </div>
                <Switch
                  id="show-tax"
                  checked={formData.show_tax}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_tax: checked }))}
                />
              </div>

              {formData.show_tax && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                      placeholder="8.75"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tax-label">Tax Label</Label>
                    <Input
                      id="tax-label"
                      value={formData.tax_label}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_label: e.target.value }))}
                      placeholder="Sales Tax"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Default Notes</Label>
              <Textarea
                id="notes"
                value={formData.default_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, default_notes: e.target.value }))}
                placeholder="Thank you for your business!"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Footer Text</Label>
              <Textarea
                id="footer"
                value={formData.footer_text}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_text: e.target.value }))}
                placeholder="Your business tagline or additional info"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is-default">Set as Default Template</Label>
                <p className="text-sm text-muted-foreground">Use this template for new invoices</p>
              </div>
              <Switch
                id="is-default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}