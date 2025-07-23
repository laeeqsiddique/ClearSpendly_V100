"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Check,
  Settings,
  Eye,
  Upload,
  X,
  Image,
  Plus,
  Star,
  Edit,
  Trash2,
  ArrowLeft,
  MoreHorizontal
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TemplateSettings {
  id?: string;
  name: string;
  // Company info (now stored in DB)
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  logo_url?: string;
  logo_position: 'left' | 'center' | 'right';
  logo_size: 'small' | 'medium' | 'large';
  // Fields that match DB schema
  template_type: 'classic' | 'modern' | 'minimal' | 'bold';
  color_scheme: string;
  font_family?: string;
  default_payment_terms: string;
  default_notes: string;
  show_tax: boolean;
  tax_rate: number;
  tax_label: string;
  invoice_prefix: string;
  next_invoice_number: number;
  is_default: boolean;
}

const templateStyles = [
  {
    id: 'classic',
    name: 'Classic Business',
    description: 'Traditional professional layout',
    preview: 'classic-preview'
  },
  {
    id: 'modern',
    name: 'Modern Clean',
    description: 'Contemporary design with elegant typography and subtle accents',
    preview: 'modern-preview'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant',
    preview: 'minimal-preview'
  },
  {
    id: 'bold',
    name: 'Bold Creative',
    description: 'Eye-catching with rich colors',
    preview: 'bold-preview'
  }
];

const logoPositions = [
  { value: 'left', label: 'Left Aligned' },
  { value: 'center', label: 'Centered' },
  { value: 'right', label: 'Right Aligned' }
];

const logoSizes = [
  { value: 'small', label: 'Small (60px)', height: 60 },
  { value: 'medium', label: 'Medium (80px)', height: 80 },
  { value: 'large', label: 'Large (100px)', height: 100 }
];

const fontOptions = [
  // Sans Serif Fonts
  { value: 'font-sans', label: 'Default Sans', family: 'ui-sans-serif, system-ui, sans-serif', category: 'Sans Serif' },
  { value: 'font-["Inter"]', label: 'Inter', family: 'Inter, sans-serif', category: 'Sans Serif' },
  { value: 'font-["Arial"]', label: 'Arial', family: 'Arial, sans-serif', category: 'Sans Serif' },
  { value: 'font-["Helvetica"]', label: 'Helvetica', family: 'Helvetica, Arial, sans-serif', category: 'Sans Serif' },
  { value: 'font-["Roboto"]', label: 'Roboto', family: 'Roboto, sans-serif', category: 'Sans Serif' },
  { value: 'font-["Open_Sans"]', label: 'Open Sans', family: 'Open Sans, sans-serif', category: 'Sans Serif' },
  { value: 'font-["Montserrat"]', label: 'Montserrat', family: 'Montserrat, sans-serif', category: 'Sans Serif' },
  { value: 'font-["Poppins"]', label: 'Poppins', family: 'Poppins, sans-serif', category: 'Sans Serif' },
  { value: 'font-["Lato"]', label: 'Lato', family: 'Lato, sans-serif', category: 'Sans Serif' },
  
  // Serif Fonts
  { value: 'font-serif', label: 'Default Serif', family: 'ui-serif, Georgia, serif', category: 'Serif' },
  { value: 'font-["Times_New_Roman"]', label: 'Times New Roman', family: 'Times New Roman, serif', category: 'Serif' },
  { value: 'font-["Georgia"]', label: 'Georgia', family: 'Georgia, serif', category: 'Serif' },
  { value: 'font-["Merriweather"]', label: 'Merriweather', family: 'Merriweather, serif', category: 'Serif' },
  { value: 'font-["Playfair_Display"]', label: 'Playfair Display', family: 'Playfair Display, serif', category: 'Serif' },
  { value: 'font-["Libre_Baskerville"]', label: 'Libre Baskerville', family: 'Libre Baskerville, serif', category: 'Serif' },
  
  // Monospace Fonts
  { value: 'font-mono', label: 'Default Mono', family: 'ui-monospace, monospace', category: 'Monospace' },
  { value: 'font-["Courier_New"]', label: 'Courier New', family: 'Courier New, monospace', category: 'Monospace' },
  { value: 'font-["Source_Code_Pro"]', label: 'Source Code Pro', family: 'Source Code Pro, monospace', category: 'Monospace' },
  
  // Display/Creative Fonts
  { value: 'font-["Bebas_Neue"]', label: 'Bebas Neue', family: 'Bebas Neue, sans-serif', category: 'Display' },
  { value: 'font-["Raleway"]', label: 'Raleway', family: 'Raleway, sans-serif', category: 'Display' },
  { value: 'font-["Oswald"]', label: 'Oswald', family: 'Oswald, sans-serif', category: 'Display' },
  { value: 'font-["Work_Sans"]', label: 'Work Sans', family: 'Work Sans, sans-serif', category: 'Display' }
];

const colorOptions = [
  // Blues
  { value: '#1e40af', label: 'Professional Blue', sample: 'bg-blue-700' },
  { value: '#1e3a8a', label: 'Navy Blue', sample: 'bg-blue-900' },
  { value: '#0ea5e9', label: 'Sky Blue', sample: 'bg-sky-500' },
  { value: '#06b6d4', label: 'Cyan Blue', sample: 'bg-cyan-500' },
  
  // Greens
  { value: '#059669', label: 'Forest Green', sample: 'bg-emerald-600' },
  { value: '#16a34a', label: 'Fresh Green', sample: 'bg-green-600' },
  { value: '#65a30d', label: 'Lime Green', sample: 'bg-lime-600' },
  { value: '#14532d', label: 'Dark Green', sample: 'bg-green-900' },
  
  // Purples & Pinks
  { value: '#7c3aed', label: 'Royal Purple', sample: 'bg-violet-600' },
  { value: '#9333ea', label: 'Bright Purple', sample: 'bg-purple-600' },
  { value: '#c026d3', label: 'Fuchsia', sample: 'bg-fuchsia-600' },
  { value: '#db2777', label: 'Rose Pink', sample: 'bg-pink-600' },
  { value: '#be185d', label: 'Deep Pink', sample: 'bg-pink-700' },
  
  // Warm Colors
  { value: '#dc2626', label: 'Bold Red', sample: 'bg-red-600' },
  { value: '#ea580c', label: 'Vibrant Orange', sample: 'bg-orange-600' },
  { value: '#d97706', label: 'Amber Gold', sample: 'bg-amber-600' },
  { value: '#ca8a04', label: 'Golden Yellow', sample: 'bg-yellow-600' },
  { value: '#7c2d12', label: 'Warm Brown', sample: 'bg-orange-800' },
  
  // Neutrals
  { value: '#374151', label: 'Business Gray', sample: 'bg-gray-700' },
  { value: '#64748b', label: 'Slate Gray', sample: 'bg-slate-500' },
  { value: '#71717a', label: 'Cool Gray', sample: 'bg-zinc-500' },
  { value: '#000000', label: 'Classic Black', sample: 'bg-black' },
  { value: '#0f172a', label: 'Midnight', sample: 'bg-slate-900' },
  
  // Teals & Aquas
  { value: '#0d9488', label: 'Teal', sample: 'bg-teal-600' },
  { value: '#0891b2', label: 'Aqua Blue', sample: 'bg-cyan-600' },
  { value: '#0e7490', label: 'Ocean Blue', sample: 'bg-cyan-700' }
];

// Sample data for preview
const sampleInvoiceData = {
  invoice_number: "INV-2024-001",
  issue_date: "2024-01-15",
  due_date: "2024-02-14",
  client: {
    name: "John Smith",
    company: "ABC Company",
    address: "123 Business St\nNew York, NY 10001"
  },
  items: [
    { description: "Web Design Services", quantity: 1, rate: 2500.00, amount: 2500.00 },
    { description: "Monthly Maintenance", quantity: 3, rate: 150.00, amount: 450.00 }
  ],
  subtotal: 2950.00,
  tax: 236.00,
  total: 3186.00
};

export function InvoiceTemplatesRedesigned() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: any | null }>({ open: false, template: null });
  
  const [selectedStyle, setSelectedStyle] = useState<string>('classic');
  const [settings, setSettings] = useState<TemplateSettings>({
    name: "",
    company_name: "Your Company Name",
    company_address: "123 Your Street\nYour City, State 12345",
    company_phone: "(555) 123-4567",
    company_email: "contact@yourcompany.com",
    logo_url: "",
    logo_position: 'left',
    logo_size: 'medium',
    template_type: 'classic',
    color_scheme: '#1e40af',
    font_family: 'font-sans',
    default_payment_terms: "Net 30",
    default_notes: "Thank you for your business!",
    show_tax: true,
    tax_rate: 0.08,
    tax_label: "Tax",
    invoice_prefix: "INV",
    next_invoice_number: 1,
    is_default: false
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
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
      setTemplatesLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/dashboard/invoices/templates/create');
  };

  const handleEdit = (template: any) => {
    router.push(`/dashboard/invoices/templates/create?edit=${template.id}`);
  };

  const handleDeleteClick = (template: any) => {
    setDeleteDialog({ open: true, template });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.template) return;
    
    try {
      const { error } = await supabase
        .from('invoice_template')
        .delete()
        .eq('id', deleteDialog.template.id);

      if (error) throw error;
      
      toast.success("Template deleted successfully");
      fetchTemplates();
      setDeleteDialog({ open: false, template: null });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete template");
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant membership found");

      // Only save fields that exist in the database schema
      const templateData = {
        name: settings.name,
        template_type: settings.template_type,
        color_scheme: settings.color_scheme,
        font_family: settings.font_family || 'font-sans',
        default_payment_terms: settings.default_payment_terms,
        default_notes: settings.default_notes,
        show_tax: settings.show_tax,
        tax_rate: settings.tax_rate,
        tax_label: settings.tax_label,
        invoice_prefix: settings.invoice_prefix,
        next_invoice_number: settings.next_invoice_number,
        is_default: settings.is_default,
        is_active: true,
        tenant_id: membership.tenant_id,
        user_id: user.id
      };

      // Check if template with this name already exists
      const { data: existingTemplate } = await supabase
        .from('invoice_template')
        .select('id')
        .eq('tenant_id', membership.tenant_id)
        .eq('name', settings.name)
        .single();

      let result;
      if (existingTemplate) {
        // Update existing template
        result = await supabase
          .from('invoice_template')
          .update(templateData)
          .eq('id', existingTemplate.id);
      } else {
        // Insert new template
        result = await supabase
          .from('invoice_template')
          .insert(templateData);
      }

      if (result.error) throw result.error;
      
      toast.success("Template saved successfully!");
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    try {
      setUploadingLogo(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create unique filename with user folder structure for RLS
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/logos/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('invoice-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL (valid for 1 year)
      const { data, error: urlError } = await supabase.storage
        .from('invoice-assets')
        .createSignedUrl(filePath, 31536000); // 1 year in seconds

      if (urlError) throw urlError;

      // Update settings with logo URL
      setSettings(prev => ({ ...prev, logo_url: data.signedUrl }));
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(`Failed to upload logo: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, logo_url: "" }));
  };

  const renderLogo = () => {
    if (!settings.logo_url) return null;
    
    const sizeConfig = logoSizes.find(s => s.value === settings.logo_size);
    const height = sizeConfig?.height || 80;
    
    return (
      <img
        src={settings.logo_url}
        alt="Company Logo"
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }}
        className="max-w-full"
      />
    );
  };

  const renderInvoicePreview = () => {
    const color = settings.color_scheme;
    const fontClass = settings.font_family || 'font-sans';
    
    // Different layouts based on selected style
    if (selectedStyle === 'classic') {
      return (
        <div className={`bg-white border rounded-lg p-8 shadow-sm ${fontClass}`} style={{ minHeight: '600px' }}>
          {/* Classic Style - Traditional Layout */}
          <div className="border-b-4" style={{ borderColor: color }}>
            {/* Logo Section */}
            {settings.logo_url && (
              <div className={`mb-6 ${
                settings.logo_position === 'center' ? 'text-center' :
                settings.logo_position === 'right' ? 'text-right' : 'text-left'
              }`}>
                {renderLogo()}
              </div>
            )}
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">{settings.company_name}</h1>
                <div className="text-sm text-gray-600 mt-3 whitespace-pre-line leading-relaxed">
                  {settings.company_address}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <div>{settings.company_phone} • {settings.company_email}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-gray-100 p-4 rounded">
                  <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                  <div className="text-sm text-gray-600 mt-2">
                    <div><strong>Invoice #:</strong> {settings.invoice_prefix}-{settings.next_invoice_number.toString().padStart(4, '0')}</div>
                    <div><strong>Date:</strong> {sampleInvoiceData.issue_date}</div>
                    <div><strong>Due:</strong> {sampleInvoiceData.due_date}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mt-8 mb-8">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold text-gray-900 mb-2">BILL TO:</h3>
              <div className="text-sm text-gray-700">
                <div className="font-medium text-base">{sampleInvoiceData.client.name}</div>
                <div className="font-medium">{sampleInvoiceData.client.company}</div>
                <div className="whitespace-pre-line mt-1">{sampleInvoiceData.client.address}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full border border-gray-300">
              <thead>
                <tr style={{ backgroundColor: color, color: 'white' }}>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                  <th className="text-center py-3 px-4 font-semibold w-20">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold w-24">Rate</th>
                  <th className="text-right py-3 px-4 font-semibold w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sampleInvoiceData.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-300 even:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">{item.description}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">${item.rate.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right font-medium">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72 border border-gray-300">
              <div className="bg-gray-50 flex justify-between py-2 px-4 border-b">
                <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                <span className="text-sm font-medium text-gray-900">${sampleInvoiceData.subtotal.toFixed(2)}</span>
              </div>
              {settings.show_tax && (
                <div className="bg-gray-50 flex justify-between py-2 px-4 border-b">
                  <span className="text-sm font-medium text-gray-700">Tax ({settings.tax_rate}%):</span>
                  <span className="text-sm font-medium text-gray-900">${sampleInvoiceData.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 px-4" style={{ backgroundColor: color, color: 'white' }}>
                <span className="font-bold">TOTAL:</span>
                <span className="font-bold text-lg">${sampleInvoiceData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="border-t-2 border-gray-300 pt-6">
            <div className="text-sm text-gray-700">
              <div><strong>Payment Terms:</strong> {settings.default_payment_terms}</div>
              {settings.default_notes && (
                <div className="mt-2"><strong>Notes:</strong> {settings.default_notes}</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (selectedStyle === 'modern') {
      return (
        <div className={`bg-white border rounded-lg p-8 shadow-sm ${fontClass}`} style={{ minHeight: '600px' }}>
          {/* Modern Style - Clean with Accent Colors */}
          
          {/* Logo Section for Modern */}
          {settings.logo_url && (
            <div className={`mb-6 ${
              settings.logo_position === 'center' ? 'text-center' :
              settings.logo_position === 'right' ? 'text-right' : 'text-left'
            }`}>
              {renderLogo()}
            </div>
          )}
          
          <div className="mb-10">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="mb-6">
                  <h1 className="text-4xl font-light tracking-wide" style={{ color }}>{settings.company_name}</h1>
                </div>
                <div className="text-sm text-gray-600 whitespace-pre-line pl-5 leading-relaxed">
                  {settings.company_address}
                </div>
                <div className="text-sm text-gray-500 pl-5 mt-2 space-y-0.5">
                  <div>{settings.company_phone}</div>
                  <div>{settings.company_email}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block">
                  <h2 className="text-4xl font-extralight text-gray-300 mb-6 tracking-wider">INVOICE</h2>
                  <div className="text-sm text-gray-600 space-y-3">
                    <div className="flex justify-between items-center gap-6">
                      <span className="text-gray-400 uppercase text-xs tracking-wide">Number</span>
                      <span className="font-semibold text-gray-800">{settings.invoice_prefix}-{settings.next_invoice_number.toString().padStart(4, '0')}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                      <span className="text-gray-400 uppercase text-xs tracking-wide">Date</span>
                      <span className="font-medium text-gray-700">{sampleInvoiceData.issue_date}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                      <span className="text-gray-400 uppercase text-xs tracking-wide">Due</span>
                      <span className="font-medium text-gray-700">{sampleInvoiceData.due_date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }}></div>
              <h3 className="font-medium text-gray-500 uppercase text-xs tracking-wider">Bill To</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border-l-2" style={{ borderColor: color }}>
              <div className="text-gray-700">
                <div className="font-semibold text-lg text-gray-900">{sampleInvoiceData.client.name}</div>
                <div className="text-gray-600 font-medium">{sampleInvoiceData.client.company}</div>
                <div className="whitespace-pre-line text-gray-600 mt-2 text-sm leading-relaxed">{sampleInvoiceData.client.address}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: color }}>
                  <th className="text-left py-3 text-sm font-medium text-gray-600 uppercase tracking-wide">Description</th>
                  <th className="text-center py-3 text-sm font-medium text-gray-600 uppercase tracking-wide w-20">Qty</th>
                  <th className="text-right py-3 text-sm font-medium text-gray-600 uppercase tracking-wide w-24">Rate</th>
                  <th className="text-right py-3 text-sm font-medium text-gray-600 uppercase tracking-wide w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sampleInvoiceData.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-4 text-sm text-gray-800">{item.description}</td>
                    <td className="py-4 text-sm text-gray-600 text-center">{item.quantity}</td>
                    <td className="py-4 text-sm text-gray-600 text-right">${item.rate.toFixed(2)}</td>
                    <td className="py-4 text-sm text-gray-800 text-right font-medium">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="text-sm text-gray-800">${sampleInvoiceData.subtotal.toFixed(2)}</span>
              </div>
              {settings.show_tax && (
                <div className="flex justify-between py-1">
                  <span className="text-sm text-gray-500">Tax ({settings.tax_rate}%)</span>
                  <span className="text-sm text-gray-800">${sampleInvoiceData.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">Total</span>
                  <span className="font-bold text-xl" style={{ color }}>${sampleInvoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="border-t border-gray-100 pt-6">
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-700 mb-1">Payment Terms: {settings.default_payment_terms}</div>
              {settings.default_notes && (
                <div className="text-gray-600 italic">{settings.default_notes}</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (selectedStyle === 'minimal') {
      return (
        <div className={`bg-white border rounded-lg p-8 shadow-sm ${fontClass}`} style={{ minHeight: '600px' }}>
          {/* Minimal Style - Ultra Clean */}
          
          {/* Logo Section for Minimal */}
          {settings.logo_url && (
            <div className={`mb-8 ${
              settings.logo_position === 'center' ? 'text-center' :
              settings.logo_position === 'right' ? 'text-right' : 'text-left'
            }`}>
              {renderLogo()}
            </div>
          )}
          
          <div className="mb-12">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-normal text-gray-900 mb-6">{settings.company_name}</h1>
                <div className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">
                  {settings.company_address}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {settings.company_phone} · {settings.company_email}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-4">INVOICE</div>
                <div className="text-xs text-gray-600 space-y-2">
                  <div>{settings.invoice_prefix}-{settings.next_invoice_number.toString().padStart(4, '0')}</div>
                  <div>{sampleInvoiceData.issue_date}</div>
                  <div className="text-gray-400">Due {sampleInvoiceData.due_date}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-12">
            <div className="text-xs text-gray-400 mb-3">BILL TO</div>
            <div className="text-sm text-gray-700">
              <div className="font-medium">{sampleInvoiceData.client.name}</div>
              <div className="text-gray-500">{sampleInvoiceData.client.company}</div>
              <div className="whitespace-pre-line text-gray-500 text-xs mt-1">{sampleInvoiceData.client.address}</div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-12">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-normal text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="text-center py-2 text-xs font-normal text-gray-400 uppercase tracking-wider w-16">Qty</th>
                  <th className="text-right py-2 text-xs font-normal text-gray-400 uppercase tracking-wider w-20">Rate</th>
                  <th className="text-right py-2 text-xs font-normal text-gray-400 uppercase tracking-wider w-20">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sampleInvoiceData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-4 text-sm text-gray-800 border-b border-gray-100">{item.description}</td>
                    <td className="py-4 text-sm text-gray-600 text-center border-b border-gray-100">{item.quantity}</td>
                    <td className="py-4 text-sm text-gray-600 text-right border-b border-gray-100">${item.rate.toFixed(2)}</td>
                    <td className="py-4 text-sm text-gray-800 text-right border-b border-gray-100">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-48 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">SUBTOTAL</span>
                <span className="text-gray-600">${sampleInvoiceData.subtotal.toFixed(2)}</span>
              </div>
              {settings.show_tax && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">TAX ({settings.tax_rate}%)</span>
                  <span className="text-gray-600">${sampleInvoiceData.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-800">TOTAL</span>
                <span className="text-lg font-medium" style={{ color }}>${sampleInvoiceData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="pt-8 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <div>Payment due within {settings.default_payment_terms.toLowerCase()}</div>
              {settings.default_notes && (
                <div className="mt-2 text-gray-400">{settings.default_notes}</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (selectedStyle === 'bold') {
      return (
        <div className={`bg-white border rounded-lg p-8 shadow-sm ${fontClass}`} style={{ minHeight: '600px' }}>
          {/* Bold Style - Eye-catching with Rich Colors */}
          
          {/* Header Background */}
          <div className="relative p-6 mb-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
            
            {/* Logo Section for Bold */}
            {settings.logo_url && (
              <div className={`mb-4 ${
                settings.logo_position === 'center' ? 'text-center' :
                settings.logo_position === 'right' ? 'text-right' : 'text-left'
              }`}>
                <div className="bg-white rounded-lg p-2 inline-block">
                  {renderLogo()}
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-start text-white">
              <div>
                <h1 className="text-4xl font-bold mb-3">{settings.company_name}</h1>
                <div className="text-sm opacity-90 whitespace-pre-line leading-relaxed">
                  {settings.company_address}
                </div>
                <div className="text-sm opacity-90 mt-2">
                  <div>{settings.company_phone} | {settings.company_email}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
                  <div className="text-sm mt-3 space-y-1 text-gray-700">
                    <div><strong>#{settings.invoice_prefix}-{settings.next_invoice_number.toString().padStart(4, '0')}</strong></div>
                    <div>{sampleInvoiceData.issue_date}</div>
                    <div className="text-gray-600">Due: {sampleInvoiceData.due_date}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
              <h3 className="font-bold text-lg text-gray-900">BILL TO</h3>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border-l-4" style={{ borderColor: color }}>
              <div className="text-gray-700">
                <div className="font-bold text-lg">{sampleInvoiceData.client.name}</div>
                <div className="font-medium text-gray-600">{sampleInvoiceData.client.company}</div>
                <div className="whitespace-pre-line mt-2 text-sm">{sampleInvoiceData.client.address}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)`, color: 'white' }}>
                  <th className="text-left py-4 px-6 font-bold">DESCRIPTION</th>
                  <th className="text-center py-4 px-6 font-bold w-20">QTY</th>
                  <th className="text-right py-4 px-6 font-bold w-24">RATE</th>
                  <th className="text-right py-4 px-6 font-bold w-24">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {sampleInvoiceData.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-4 px-6 text-gray-800 font-medium">{item.description}</td>
                    <td className="py-4 px-6 text-gray-600 text-center">{item.quantity}</td>
                    <td className="py-4 px-6 text-gray-600 text-right">${item.rate.toFixed(2)}</td>
                    <td className="py-4 px-6 text-gray-800 text-right font-bold">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between py-2 px-4 bg-gray-50 rounded">
                  <span className="font-medium text-gray-700">Subtotal</span>
                  <span className="font-bold text-gray-900">${sampleInvoiceData.subtotal.toFixed(2)}</span>
                </div>
                {settings.show_tax && (
                  <div className="flex justify-between py-2 px-4 bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">Tax ({settings.tax_rate}%)</span>
                    <span className="font-bold text-gray-900">${sampleInvoiceData.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-4 px-4 rounded text-white font-bold text-xl" style={{ backgroundColor: color }}>
                  <span>TOTAL</span>
                  <span>${sampleInvoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="border-t-2 pt-6" style={{ borderColor: color }}>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-700">
                <div className="font-bold text-gray-900 mb-2">Payment Information</div>
                <div><strong>Terms:</strong> {settings.default_payment_terms}</div>
                {settings.default_notes && (
                  <div className="mt-2"><strong>Notes:</strong> {settings.default_notes}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fallback to classic if no style matches
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Invoice Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage your invoice templates with logo support and live preview
          </p>
        </div>
        <Button onClick={handleCreateNew} className="h-10">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Card>
        <CardContent>
          {templatesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="h-10 w-10 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-48"></div>
                    <div className="h-3 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your First Template</h3>
              <p className="text-gray-500 mb-6">Templates make it quick and easy to create professional invoices with your branding</p>
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Template Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">Style</TableHead>
                    <TableHead className="font-semibold text-gray-700">Invoice Format</TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment Terms</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tax Rate</TableHead>
                    <TableHead className="font-semibold text-gray-700">Logo</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: `linear-gradient(45deg, ${template.color_scheme}, ${template.color_scheme}dd)` }}
                          >
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-gray-500">Created: {new Date(template.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {templateStyles.find(t => t.id === template.template_type)?.name || 'Classic'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{template.invoice_prefix}-{template.next_invoice_number.toString().padStart(4, '0')}</span>
                      </TableCell>
                      <TableCell>{template.default_payment_terms}</TableCell>
                      <TableCell>
                        {template.show_tax ? `${(template.tax_rate * 100).toFixed(1)}%` : 'None'}
                      </TableCell>
                      <TableCell>
                        {template.logo_url ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            <X className="w-3 h-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.is_default ? (
                          <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Default
                          </Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(template)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete the template <strong>"{deleteDialog.template?.name}"</strong>?</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false, template: null })}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}