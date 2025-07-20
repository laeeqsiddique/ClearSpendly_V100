"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Palette,
  FileText,
  Settings,
  Save,
  Eye
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Template {
  id?: string;
  name: string;
  template_type: string;
  color_scheme: string;
  default_payment_terms: string;
  default_notes: string;
  footer_text: string;
  show_tax: boolean;
  tax_rate: number;
  tax_label: string;
  next_invoice_number: number;
  invoice_prefix: string;
  is_default: boolean;
}

const templateTypes = [
  { 
    value: "modern", 
    label: "Modern", 
    description: "Clean lines and contemporary styling",
    preview: "🔳" 
  },
  { 
    value: "classic", 
    label: "Classic", 
    description: "Traditional business professional",
    preview: "📄" 
  },
  { 
    value: "minimal", 
    label: "Minimal", 
    description: "Simple and elegant design",
    preview: "⚪" 
  },
  { 
    value: "professional", 
    label: "Professional", 
    description: "Corporate-style layout",
    preview: "🏢" 
  }
];

const colorSchemes = [
  { value: "blue", label: "Ocean Blue", color: "from-blue-500 to-blue-600", ring: "ring-blue-500" },
  { value: "green", label: "Forest Green", color: "from-green-500 to-green-600", ring: "ring-green-500" },
  { value: "purple", label: "Royal Purple", color: "from-purple-500 to-purple-600", ring: "ring-purple-500" },
  { value: "orange", label: "Sunset Orange", color: "from-orange-500 to-orange-600", ring: "ring-orange-500" },
  { value: "gray", label: "Professional Gray", color: "from-gray-500 to-gray-600", ring: "ring-gray-500" },
  { value: "red", label: "Bold Red", color: "from-red-500 to-red-600", ring: "ring-red-500" }
];

export default function CreateTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('edit');
  const isEditing = !!templateId;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  
  const [formData, setFormData] = useState<Template>({
    name: "",
    template_type: "modern",
    color_scheme: "blue",
    default_payment_terms: "Net 30",
    default_notes: "",
    footer_text: "",
    show_tax: true,
    tax_rate: 0,
    tax_label: "Tax",
    next_invoice_number: 1,
    invoice_prefix: "INV",
    is_default: false
  });

  const supabase = createClient();

  useEffect(() => {
    if (isEditing && templateId) {
      fetchTemplate(templateId);
    }
  }, [isEditing, templateId]);

  const fetchTemplate = async (id: string) => {
    try {
      setInitialLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant membership found");

      const { data, error } = await supabase
        .from('invoice_template')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', membership.tenant_id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Template not found");

      setFormData({
        ...data,
        tax_rate: data.tax_rate * 100 // Convert to percentage for display
      });
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error("Failed to load template");
      router.push('/dashboard/invoices');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

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
        tax_rate: formData.tax_rate / 100, // Convert percentage back to decimal
        tenant_id: membership.tenant_id,
        user_id: user.id
      };

      if (isEditing && templateId) {
        const { error } = await supabase
          .from('invoice_template')
          .update(templateData)
          .eq('id', templateId);

        if (error) throw error;
        toast.success("Template updated successfully!");
      } else {
        const { error } = await supabase
          .from('invoice_template')
          .insert(templateData);

        if (error) throw error;
        toast.success("Template created successfully!");
      }

      // If setting as default, remove default from other templates
      if (formData.is_default) {
        await supabase
          .from('invoice_template')
          .update({ is_default: false })
          .eq('tenant_id', membership.tenant_id)
          .neq('id', templateId || '');
      }

      router.push('/dashboard/invoices?tab=templates');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/invoices?tab=templates')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Edit Template' : 'Create New Template'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Update your invoice template' : 'Design a custom invoice template for your business'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/invoices?tab=templates')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Template' : 'Create Template'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Web Development, Consulting, Design Work"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select 
                    value={formData.default_payment_terms} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, default_payment_terms: value }))}
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
                  <Label htmlFor="prefix">Invoice Prefix *</Label>
                  <Input
                    id="prefix"
                    value={formData.invoice_prefix}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_prefix: e.target.value.toUpperCase() }))}
                    placeholder="INV"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in invoice numbers: {formData.invoice_prefix}-0001
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="next-number">Starting Number</Label>
                  <Input
                    id="next-number"
                    type="number"
                    min="1"
                    value={formData.next_invoice_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, next_invoice_number: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Default Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.default_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_notes: e.target.value }))}
                  placeholder="Thank you for your business! Payment is due within the terms specified above."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer">Footer Text</Label>
                <Textarea
                  id="footer"
                  value={formData.footer_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, footer_text: e.target.value }))}
                  placeholder="Your Company Name • www.yourwebsite.com • contact@yourcompany.com"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Design & Styling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Design & Styling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Template Style</Label>
                <div className="grid grid-cols-2 gap-4">
                  {templateTypes.map((type) => (
                    <Card 
                      key={type.value} 
                      className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                        formData.template_type === type.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, template_type: type.value }))}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">{type.preview}</div>
                        <div className="font-medium mb-1">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Color Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {colorSchemes.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color_scheme: color.value }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.color_scheme === color.value 
                          ? `border-blue-500 ${color.ring} ring-2 ring-opacity-20` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${color.color} mx-auto mb-2`}></div>
                      <div className="text-sm font-medium">{color.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Tax Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="show-tax">Include Tax Calculation</Label>
                  <p className="text-sm text-muted-foreground">Add tax to invoices by default</p>
                </div>
                <Switch
                  id="show-tax"
                  checked={formData.show_tax}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_tax: checked }))}
                />
              </div>

              {formData.show_tax && (
                <div className="grid grid-cols-2 gap-4">
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Preview & Settings */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Template Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-white">
                <div className={`h-12 bg-gradient-to-r ${colorSchemes.find(c => c.value === formData.color_scheme)?.color} rounded-t-lg mb-4`}></div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Template:</span>
                    <span>{formData.name || 'Untitled Template'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Style:</span>
                    <span>{templateTypes.find(t => t.value === formData.template_type)?.label}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Invoice Format:</span>
                    <span>{formData.invoice_prefix}-{formData.next_invoice_number.toString().padStart(4, '0')}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Payment Terms:</span>
                    <span>{formData.default_payment_terms}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Tax:</span>
                    <span>{formData.show_tax ? `${formData.tax_rate}%` : 'None'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <Label htmlFor="is-default">Make Default Template</Label>
                    <p className="text-sm text-muted-foreground">Use this template for new invoices</p>
                  </div>
                  <Switch
                    id="is-default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}