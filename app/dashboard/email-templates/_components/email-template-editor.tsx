"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Palette,
  Type,
  Layout,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Plus,
  Wand2,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  template_type: 'invoice' | 'payment_reminder' | 'payment_received';
  name: string;
  description?: string;
  is_active: boolean;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  logo_url?: string;
  subject_template?: string;
  greeting_message?: string;
  footer_message?: string;
  font_family?: string;
  header_style?: 'gradient' | 'solid' | 'minimal';
  layout_width?: string;
  header_padding?: string;
  content_padding?: string;
  section_spacing?: string;
  // PayPal configuration fields
  enable_paypal_payments?: boolean;
  paypal_button_text?: string;
  paypal_instructions_text?: string;
  show_paypal_email?: boolean;
  show_paypal_me_link?: boolean;
  paypal_button_color?: string;
}

interface EmailTemplateEditorProps {
  template: EmailTemplate | null;
  onTemplateChange: (template: EmailTemplate) => void;
  onTemplateRefresh?: () => Promise<void>;
}

const COLOR_PRESETS = {
  professional: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#10b981',
    name: 'Professional Blue'
  },
  warm: {
    primary: '#f59e0b',
    secondary: '#dc2626',
    accent: '#ef4444',
    name: 'Warm Orange'
  },
  success: {
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    name: 'Success Green'
  },
  elegant: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#a78bfa',
    name: 'Elegant Purple'
  },
  modern: {
    primary: '#06b6d4',
    secondary: '#0891b2',
    accent: '#67e8f9',
    name: 'Modern Cyan'
  },
  minimal: {
    primary: '#374151',
    secondary: '#1f2937',
    accent: '#6b7280',
    name: 'Minimal Gray'
  }
};

const FONT_OPTIONS = [
  { value: 'system', label: 'System Default', preview: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' },
  { value: 'inter', label: 'Inter', preview: '"Inter", sans-serif' },
  { value: 'poppins', label: 'Poppins', preview: '"Poppins", sans-serif' },
  { value: 'helvetica', label: 'Helvetica', preview: '"Helvetica Neue", Helvetica, Arial' },
  { value: 'georgia', label: 'Georgia', preview: 'Georgia, "Times New Roman", serif' },
];

export function EmailTemplateEditor({ template, onTemplateChange, onTemplateRefresh }: EmailTemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState("colors");

  // Early safety check - prevent rendering if template is not properly initialized
  if (!template || !template.id || !template.template_type) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
            <Palette className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Template Selected</h3>
          <p className="text-gray-600 mb-4">
            Select a template from the overview or create a new one to start customizing.
          </p>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Create New Template
          </Button>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    try {
      if (template && template.id && template.template_type) {
        setEditedTemplate(template);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error in EmailTemplateEditor useEffect:', error);
    }
  }, [template]);

  const updateTemplate = (updates: Partial<EmailTemplate>) => {
    if (!editedTemplate || !editedTemplate.id || !editedTemplate.template_type) return;
    
    try {
      const updated = { ...editedTemplate, ...updates };
      
      // Ensure essential fields are present
      if (!updated.id || !updated.template_type) {
        console.error('Template missing essential fields');
        return;
      }
      
      setEditedTemplate(updated);
      setHasChanges(true);
      
      // Safely call onTemplateChange with additional error handling
      if (typeof onTemplateChange === 'function') {
        // Use setTimeout to defer the update and prevent immediate re-render issues
        setTimeout(() => {
          try {
            onTemplateChange(updated);
          } catch (error) {
            console.error('Error in onTemplateChange callback:', error);
          }
        }, 0);
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[keyof typeof COLOR_PRESETS]) => {
    updateTemplate({
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent
    });
    toast.success(`Applied ${preset.name} color scheme`);
  };

  const saveTemplate = async () => {
    if (!editedTemplate) return;
    
    try {
      console.log('Saving template with layout settings:', {
        font_family: editedTemplate.font_family,
        header_style: editedTemplate.header_style,
        layout_width: editedTemplate.layout_width,
        header_padding: editedTemplate.header_padding,
        content_padding: editedTemplate.content_padding,
        section_spacing: editedTemplate.section_spacing
      });
      
      const response = await fetch(`/api/email-templates/${editedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedTemplate),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save failed with response:', errorText);
        throw new Error('Failed to save template');
      }

      const data = await response.json();
      console.log('Saved template data returned:', data.template);
      
      setHasChanges(false);
      toast.success('Template saved successfully!');
      
      // Update the parent component with the saved template
      if (typeof onTemplateChange === 'function') {
        onTemplateChange(data.template || editedTemplate);
      }
      
      // Refresh the templates list in the parent component
      if (typeof onTemplateRefresh === 'function') {
        await onTemplateRefresh();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const resetChanges = () => {
    if (template) {
      setEditedTemplate(template);
      setHasChanges(false);
      onTemplateChange(template);
    }
  };


  if (!editedTemplate) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
            <Palette className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Template Selected</h3>
          <p className="text-gray-600 mb-4">
            Select a template from the overview or create a new one to start customizing.
          </p>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Create New Template
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-gray-900 dark:text-gray-100">{editedTemplate.name}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Customize your {editedTemplate.template_type.replace('_', ' ')} email template
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Unsaved Changes
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetChanges} 
                disabled={!hasChanges}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              <Button 
                size="sm" 
                onClick={saveTemplate}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Editor */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <TabsTrigger 
                  value="colors" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900"
                >
                  <Palette className="w-4 h-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger 
                  value="content" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900"
                >
                  <Type className="w-4 h-4" />
                  Content
                </TabsTrigger>
                <TabsTrigger 
                  value="payments" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900"
                >
                  <CreditCard className="w-4 h-4" />
                  Payments
                </TabsTrigger>
                <TabsTrigger 
                  value="layout" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900"
                >
                  <Layout className="w-4 h-4" />
                  Layout
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="px-6 pb-6">
              <TabsContent value="colors" className="space-y-6 mt-6">
                {/* Color Presets */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Color Presets</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Wand2 className="w-4 h-4 mr-1" />
                      AI Suggest
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => applyColorPreset(preset)}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:border-gray-400 transition-colors text-left"
                      >
                        <div className="flex gap-1">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: preset.secondary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <span className="text-sm font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual Colors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label htmlFor="primary-color" className="text-base font-semibold">Primary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="primary-color"
                        value={editedTemplate.primary_color}
                        onChange={(e) => updateTemplate({ primary_color: e.target.value })}
                        className="w-16 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={editedTemplate.primary_color}
                        onChange={(e) => updateTemplate({ primary_color: e.target.value })}
                        className="font-mono"
                        placeholder="#667eea"
                      />
                    </div>
                    <p className="text-sm text-gray-500">Used for headers and primary buttons</p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="secondary-color" className="text-base font-semibold">Secondary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="secondary-color"
                        value={editedTemplate.secondary_color}
                        onChange={(e) => updateTemplate({ secondary_color: e.target.value })}
                        className="w-16 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={editedTemplate.secondary_color}
                        onChange={(e) => updateTemplate({ secondary_color: e.target.value })}
                        className="font-mono"
                        placeholder="#764ba2"
                      />
                    </div>
                    <p className="text-sm text-gray-500">Used for gradients and accents</p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="accent-color" className="text-base font-semibold">Accent Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="accent-color"
                        value={editedTemplate.accent_color}
                        onChange={(e) => updateTemplate({ accent_color: e.target.value })}
                        className="w-16 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={editedTemplate.accent_color}
                        onChange={(e) => updateTemplate({ accent_color: e.target.value })}
                        className="font-mono"
                        placeholder="#10b981"
                      />
                    </div>
                    <p className="text-sm text-gray-500">Used for highlights and success states</p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="text-color" className="text-base font-semibold">Text Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="text-color"
                        value={editedTemplate.text_color || '#1a1a1a'}
                        onChange={(e) => updateTemplate({ text_color: e.target.value })}
                        className="w-16 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={editedTemplate.text_color || '#1a1a1a'}
                        onChange={(e) => updateTemplate({ text_color: e.target.value })}
                        className="font-mono"
                        placeholder="#1a1a1a"
                      />
                    </div>
                    <p className="text-sm text-gray-500">Main text color throughout the email</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-6 mt-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label htmlFor="template-name" className="text-base font-semibold">Template Name</Label>
                    <Input
                      id="template-name"
                      value={editedTemplate.name}
                      onChange={(e) => updateTemplate({ name: e.target.value })}
                      placeholder="Enter template name..."
                    />
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="template-description" className="text-base font-semibold">Description</Label>
                    <Input
                      id="template-description"
                      value={editedTemplate.description || ''}
                      onChange={(e) => updateTemplate({ description: e.target.value })}
                      placeholder="Describe this template..."
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Font Family</Label>
                    <Select
                      value={editedTemplate.font_family || 'system'}
                      onValueChange={(value) => {
                        console.log('Font changed to:', value);
                        updateTemplate({ font_family: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            <span style={{ fontFamily: font.preview }}>{font.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">Choose a font that matches your brand personality</p>
                    <p className="text-xs text-gray-400">Current: {editedTemplate.font_family || 'system'}</p>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="subject-template" className="text-base font-semibold">Email Subject</Label>
                    <Input
                      id="subject-template"
                      value={editedTemplate.subject_template || ''}
                      onChange={(e) => updateTemplate({ subject_template: e.target.value })}
                      placeholder="Invoice {{invoice_number}} from {{business_name}}"
                    />
                    <div className="flex items-start gap-2 text-sm text-blue-600">
                      <Info className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium">Available Variables:</p>
                        <p className="text-xs text-gray-500">
                          {"{{invoice_number}}, {{business_name}}, {{client_name}}, {{amount}}, {{due_date}}, {{days_overdue}}"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="greeting-message" className="text-base font-semibold">Greeting Message</Label>
                    <Textarea
                      id="greeting-message"
                      value={editedTemplate.greeting_message || ''}
                      onChange={(e) => updateTemplate({ greeting_message: e.target.value })}
                      placeholder="We've prepared your invoice..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="footer-message" className="text-base font-semibold">Footer Message</Label>
                    <Textarea
                      id="footer-message"
                      value={editedTemplate.footer_message || ''}
                      onChange={(e) => updateTemplate({ footer_message: e.target.value })}
                      placeholder="Questions? Just reply to this email..."
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-semibold">Active Template</Label>
                      <p className="text-sm text-gray-500">
                        This template will be used for sending emails
                      </p>
                    </div>
                    <Switch
                      checked={editedTemplate.is_active}
                      onCheckedChange={(checked) => updateTemplate({ is_active: checked })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-6 mt-6">
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-900">PayPal Payment Options</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Configure PayPal payment links that will appear alongside your existing Stripe payment buttons. 
                          PayPal options will only show if your business profile has PayPal information configured.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enable PayPal Payments */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-semibold text-blue-900">Enable PayPal Payments</Label>
                      <p className="text-sm text-blue-700">
                        Add PayPal payment options alongside Stripe buttons
                      </p>
                    </div>
                    <Switch
                      checked={editedTemplate.enable_paypal_payments || false}
                      onCheckedChange={(checked) => updateTemplate({ enable_paypal_payments: checked })}
                      className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300"
                    />
                  </div>

                  {editedTemplate.enable_paypal_payments && (
                    <div className="space-y-6 ml-4 border-l-2 border-blue-200 pl-6">
                      {/* Simple PayPal Button Text */}
                      <div className="space-y-2">
                        <Label htmlFor="paypal-button-text" className="text-sm font-medium">Button Text</Label>
                        <Input
                          id="paypal-button-text"
                          value={editedTemplate.paypal_button_text || 'Pay with PayPal'}
                          onChange={(e) => updateTemplate({ paypal_button_text: e.target.value })}
                          placeholder="Pay with PayPal"
                          className="text-sm"
                        />
                      </div>

                      {/* Simplified Info Note */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                          <p className="text-xs text-amber-700">
                            PayPal options will appear in emails when your PayPal settings are configured in the PayPal Link Settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="layout" className="space-y-6 mt-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Header Style</Label>
                      <Select
                        value={editedTemplate.header_style || 'gradient'}
                        onValueChange={(value) => updateTemplate({ header_style: value as 'gradient' | 'solid' | 'minimal' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gradient">Gradient Background</SelectItem>
                          <SelectItem value="solid">Solid Color</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Layout Width</Label>
                      <Select 
                        value={editedTemplate.layout_width || '600'}
                        onValueChange={(value) => updateTemplate({ layout_width: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="560">Narrow (560px)</SelectItem>
                          <SelectItem value="600">Standard (600px)</SelectItem>
                          <SelectItem value="640">Wide (640px)</SelectItem>
                          <SelectItem value="full">Full Width</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Spacing</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="header-padding">Header Padding</Label>
                        <Select 
                          value={editedTemplate.header_padding || '48'}
                          onValueChange={(value) => updateTemplate({ header_padding: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="32">Compact</SelectItem>
                            <SelectItem value="48">Standard</SelectItem>
                            <SelectItem value="64">Spacious</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content-padding">Content Padding</Label>
                        <Select 
                          value={editedTemplate.content_padding || '40'}
                          onValueChange={(value) => updateTemplate({ content_padding: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24">Compact</SelectItem>
                            <SelectItem value="40">Standard</SelectItem>
                            <SelectItem value="56">Spacious</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="section-spacing">Section Spacing</Label>
                        <Select 
                          value={editedTemplate.section_spacing || '32'}
                          onValueChange={(value) => updateTemplate({ section_spacing: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24">Tight</SelectItem>
                            <SelectItem value="32">Standard</SelectItem>
                            <SelectItem value="48">Loose</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}