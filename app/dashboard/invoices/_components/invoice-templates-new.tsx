"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
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

export function InvoiceTemplatesNew({ refreshTrigger }: InvoiceTemplatesProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, [refreshTrigger]);

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


  const handleEdit = (template: InvoiceTemplate) => {
    router.push(`/dashboard/invoices/templates/create?edit=${template.id}`);
  };

  const handleCreate = () => {
    router.push('/dashboard/invoices/templates/create');
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

      await supabase
        .from('invoice_template')
        .update({ is_default: false })
        .eq('tenant_id', membership.tenant_id);

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
            Create and customize templates for different types of work
          </p>
        </div>
        <Button onClick={handleCreate} className="h-10">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
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
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your First Template</h3>
            <p className="text-gray-500 mb-6">Templates make it quick and easy to create professional invoices</p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => {
            const colorScheme = colorSchemes.find(c => c.value === template.color_scheme);
            
            return (
              <Card key={template.id} className="relative hover:shadow-lg transition-all duration-200">
                {template.is_default && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Default
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${colorScheme?.color || 'from-blue-500 to-blue-600'} flex items-center justify-center`}>
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {templateTypes.find(t => t.value === template.template_type)?.label || 'Modern'} Style
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs">Invoice Format</span>
                      <div className="font-medium">{template.invoice_prefix}-{template.next_invoice_number.toString().padStart(4, '0')}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs">Payment Terms</span>
                      <div className="font-medium">{template.default_payment_terms}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs">Tax Rate</span>
                      <div className="font-medium">
                        {template.show_tax ? `${(template.tax_rate * 100).toFixed(1)}%` : 'None'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs">Color Theme</span>
                      <div className="font-medium capitalize">{template.color_scheme}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-2" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    
                    {!template.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}