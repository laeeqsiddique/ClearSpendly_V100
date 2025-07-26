"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Check,
  Settings,
  Eye,
  Upload,
  X,
  Image,
  ArrowLeft,
  Save
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Import all the template configuration data
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
  
  // Additional colors...
  { value: '#dc2626', label: 'Bold Red', sample: 'bg-red-600' },
  { value: '#ea580c', label: 'Vibrant Orange', sample: 'bg-orange-600' },
  { value: '#374151', label: 'Business Gray', sample: 'bg-gray-700' },
  { value: '#000000', label: 'Classic Black', sample: 'bg-black' },
];

interface TemplateSettings {
  id?: string;
  name: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  logo_url?: string;
  logo_position: 'left' | 'center' | 'right';
  logo_size: 'small' | 'medium' | 'large';
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

export default function CreateTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('edit');
  const isEditing = !!templateId;
  
  const [selectedStyle, setSelectedStyle] = useState<string>('classic');
  const [settings, setSettings] = useState<TemplateSettings>({
    name: "",
    company_name: "Your Company Name",
    company_address: "123 Your Street\\nYour City, State 12345",
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
  const [initialLoading, setInitialLoading] = useState(isEditing);

  const supabase = createClient();

  // Save function that redirects to the new template page
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
        logo_url: settings.logo_url || null,
        logo_position: settings.logo_position,
        logo_size: settings.logo_size,
        company_name: settings.company_name === "Your Company Name" ? null : settings.company_name,
        company_address: settings.company_address === "123 Your Street\\nYour City, State 12345" ? null : settings.company_address,
        company_phone: settings.company_phone === "(555) 123-4567" ? null : settings.company_phone,
        company_email: settings.company_email === "contact@yourcompany.com" ? null : settings.company_email,
        tenant_id: membership.tenant_id,
        user_id: user.id
      };

      let result;
      if (isEditing) {
        result = await supabase
          .from('invoice_template')
          .update(templateData)
          .eq('id', templateId);
      } else {
        result = await supabase
          .from('invoice_template')
          .insert(templateData);
      }

      if (result.error) throw result.error;
      
      toast.success(isEditing ? "Template updated successfully!" : "Template created successfully!");
      router.push('/dashboard/invoice-templates');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {isEditing ? 'Edit Template' : 'Create New Template'}
              </h1>
              <p className="text-muted-foreground">
                Create and customize professional invoice templates for your business.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/dashboard/invoice-templates')} 
                className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <span className="font-medium text-gray-600 group-hover:text-gray-700 transition-colors">
                  Cancel
                </span>
              </Button>
              <Button onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
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
        </div>
        
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Template Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Name */}
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={settings.name}
                  onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>

              {/* Style Selection */}
              <div className="space-y-2">
                <Label>Template Style</Label>
                <div className="grid grid-cols-1 gap-2">
                  {templateStyles.map((style) => (
                    <div
                      key={style.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedStyle === style.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedStyle(style.id);
                        setSettings(prev => ({ ...prev, template_type: style.id as any }));
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{style.name}</div>
                          <div className="text-sm text-gray-500">{style.description}</div>
                        </div>
                        {selectedStyle === style.id && <Check className="h-4 w-4 text-blue-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <Label htmlFor="color-scheme">Primary Color</Label>
                <Select 
                  value={settings.color_scheme} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, color_scheme: value }))}
                >
                  <SelectTrigger id="color-scheme">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${colorOptions.find(c => c.value === settings.color_scheme)?.sample || 'bg-blue-700'}`}></div>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <div className="space-y-1">
                      {/* Blues */}
                      <div className="text-xs font-semibold text-gray-500 px-2 pt-2">Blues</div>
                      {colorOptions.filter(c => c.label.includes('Blue') || c.label.includes('Sky') || c.label.includes('Cyan') || c.label.includes('Navy')).map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.sample}`}></div>
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* Greens */}
                      <div className="text-xs font-semibold text-gray-500 px-2 pt-2">Greens</div>
                      {colorOptions.filter(c => c.label.includes('Green') || c.label.includes('Lime')).map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.sample}`}></div>
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* Purples & Pinks */}
                      <div className="text-xs font-semibold text-gray-500 px-2 pt-2">Purples & Pinks</div>
                      {colorOptions.filter(c => c.label.includes('Purple') || c.label.includes('Pink') || c.label.includes('Fuchsia') || c.label.includes('Rose')).map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.sample}`}></div>
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* Warm Colors */}
                      <div className="text-xs font-semibold text-gray-500 px-2 pt-2">Warm Colors</div>
                      {colorOptions.filter(c => c.label.includes('Red') || c.label.includes('Orange') || c.label.includes('Amber') || c.label.includes('Yellow') || c.label.includes('Brown')).map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.sample}`}></div>
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* Neutrals */}
                      <div className="text-xs font-semibold text-gray-500 px-2 pt-2">Neutrals</div>
                      {colorOptions.filter(c => c.label.includes('Gray') || c.label.includes('Black') || c.label.includes('Slate') || c.label.includes('Midnight')).map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.sample}`}></div>
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* Teals & Aquas */}
                      <div className="text-xs font-semibold text-gray-500 px-2 pt-2">Teals & Aquas</div>
                      {colorOptions.filter(c => c.label.includes('Teal') || c.label.includes('Aqua') || c.label.includes('Ocean')).map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.sample}`}></div>
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Selection */}
              <div className="space-y-2">
                <Label htmlFor="font-family">Font Family</Label>
                <Select 
                  value={settings.font_family || 'font-sans'} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, font_family: value }))}
                >
                  <SelectTrigger id="font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {/* Sans Serif */}
                    <div className="text-xs font-semibold text-gray-500 px-2 pt-2">Sans Serif</div>
                    {fontOptions.filter(f => f.category === 'Sans Serif').map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.family }}>{font.label}</span>
                      </SelectItem>
                    ))}
                    
                    {/* Serif */}
                    <div className="text-xs font-semibold text-gray-500 px-2 pt-3">Serif</div>
                    {fontOptions.filter(f => f.category === 'Serif').map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.family }}>{font.label}</span>
                      </SelectItem>
                    ))}
                    
                    {/* Monospace */}
                    <div className="text-xs font-semibold text-gray-500 px-2 pt-3">Monospace</div>
                    {fontOptions.filter(f => f.category === 'Monospace').map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.family }}>{font.label}</span>
                      </SelectItem>
                    ))}
                    
                    {/* Display */}
                    <div className="text-xs font-semibold text-gray-500 px-2 pt-3">Display</div>
                    {fontOptions.filter(f => f.category === 'Display').map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.family }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Logo Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Company Logo</h4>
                
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Upload Logo</Label>
                  <div className="space-y-3">
                    {settings.logo_url ? (
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                        <div className="flex-shrink-0">
                          <img 
                            src={settings.logo_url} 
                            alt="Logo preview" 
                            className="h-12 w-auto object-contain rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">Logo uploaded</p>
                          <p className="text-xs text-gray-500">Click to replace</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">Upload your company logo</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                      </div>
                    )}
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        disabled={uploadingLogo}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingLogo ? "Uploading..." : settings.logo_url ? "Replace Logo" : "Choose File"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Logo Position & Size */}
                {settings.logo_url && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Logo Position</Label>
                        <Select 
                          value={settings.logo_position} 
                          onValueChange={(value: 'left' | 'center' | 'right') => 
                            setSettings(prev => ({ ...prev, logo_position: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {logoPositions.map((position) => (
                              <SelectItem key={position.value} value={position.value}>
                                {position.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Logo Size</Label>
                        <Select 
                          value={settings.logo_size} 
                          onValueChange={(value: 'small' | 'medium' | 'large') => 
                            setSettings(prev => ({ ...prev, logo_size: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {logoSizes.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              {/* Company Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Company Information</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={settings.company_name}
                    onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Phone</Label>
                    <Input
                      id="company-phone"
                      value={settings.company_phone}
                      onChange={(e) => setSettings(prev => ({ ...prev, company_phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Email</Label>
                    <Input
                      id="company-email"
                      value={settings.company_email}
                      onChange={(e) => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Invoice Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Invoice Settings</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice-prefix">Invoice Prefix</Label>
                    <Input
                      id="invoice-prefix"
                      value={settings.invoice_prefix}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next-number">Next Number</Label>
                    <Input
                      id="next-number"
                      type="number"
                      value={settings.next_invoice_number}
                      onChange={(e) => setSettings(prev => ({ ...prev, next_invoice_number: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-terms">Payment Terms</Label>
                  <Select value={settings.default_payment_terms} onValueChange={(value) => setSettings(prev => ({ ...prev, default_payment_terms: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="scale-75 origin-top-left" style={{ width: '133.33%' }}>
                  {renderInvoicePreview()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}