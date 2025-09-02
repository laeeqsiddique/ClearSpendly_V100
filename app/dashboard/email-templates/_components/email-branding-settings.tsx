"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Settings,
  Upload,
  X,
  Image,
  Globe,
  Mail,
  Phone,
  MapPin,
  Save,
  Building,
  Palette,
  FileText,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { SecureImage } from "@/components/ui/secure-image";
import { EmailPreviewModal } from "./email-preview-modal";

interface BusinessBranding {
  businessName: string;
  tagline: string;
  logoUrl?: string;
  website?: string;
  email: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  socialMedia?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
  emailSettings: {
    fromName: string;
    replyToEmail: string;
    includeBusinessInfo: boolean;
    includeUnsubscribe: boolean;
    footerText: string;
  };
}

interface EmailBrandingSettingsProps {
  isActive?: boolean;
  currentTemplate?: EmailTemplate | null;
}

interface EmailTemplate {
  id: string;
  template_type: 'invoice' | 'payment_reminder' | 'payment_received';
  name: string;
  description?: string;
  is_active: boolean;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color?: string;
  background_color?: string;
  subject_template?: string;
  greeting_message?: string;
  footer_message?: string;
  font_family?: string;
  header_style?: 'gradient' | 'solid' | 'minimal';
  layout_width?: string;
  header_padding?: string;
  content_padding?: string;
  section_spacing?: string;
}

export function EmailBrandingSettings({ isActive = false, currentTemplate }: EmailBrandingSettingsProps) {
  const [branding, setBranding] = useState<BusinessBranding>({
    businessName: "Your Business Name",
    tagline: "Delivering Excellence",
    email: "business@example.com",
    emailSettings: {
      fromName: "Your Business Name",
      replyToEmail: "business@example.com",
      includeBusinessInfo: true,
      includeUnsubscribe: false,
      footerText: "Thank you for your business!"
    }
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [sampleTemplate, setSampleTemplate] = useState<any>(null);

  useEffect(() => {
    loadBrandingData();
    loadSampleTemplate();
  }, []);

  const loadSampleTemplate = async () => {
    try {
      const response = await fetch('/api/email-templates');
      if (response.ok) {
        const data = await response.json();
        // Get the first active template or any template for preview
        const template = data.templates?.find((t: any) => t.is_active) || data.templates?.[0];
        if (template) {
          setSampleTemplate(template);
        }
      }
    } catch (error) {
      console.error('Error loading sample template:', error);
    }
  };

  // Reload data when tab becomes active
  useEffect(() => {
    if (isActive && !hasChanges) {
      loadBrandingData();
      loadSampleTemplate(); // Also reload template data
    }
  }, [isActive, hasChanges]);

  const loadBrandingData = async () => {
    try {
      const response = await fetch('/api/business-branding');
      if (response.ok) {
        const data = await response.json();
        if (data.branding) {
          setBranding({
            businessName: data.branding.business_name || "Your Business Name",
            tagline: data.branding.tagline || "Delivering Excellence",
            logoUrl: data.branding.logo_url,
            website: data.branding.website,
            phone: data.branding.phone,
            email: data.branding.reply_to_email || "business@example.com",
            emailSettings: {
              fromName: data.branding.email_from_name || "Your Business Name",
              replyToEmail: data.branding.reply_to_email || "business@example.com",
              includeBusinessInfo: true,
              includeUnsubscribe: false,
              footerText: data.branding.email_signature || "Thank you for your business!"
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading branding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBranding = (updates: Partial<BusinessBranding>) => {
    setBranding(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateEmailSettings = (updates: Partial<BusinessBranding['emailSettings']>) => {
    setBranding(prev => ({
      ...prev,
      emailSettings: { ...prev.emailSettings, ...updates }
    }));
    setHasChanges(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    
    try {
      const supabase = createClient();
      
      // Get current user and tenant info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        setUploading(false);
        return;
      }

      // Get tenant ID
      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        toast.error('No tenant membership found');
        setUploading(false);
        return;
      }

      // Delete old logo if exists (check if it's a storage path, not base64 or external URL)
      if (branding.logoUrl && !branding.logoUrl.startsWith('data:') && !branding.logoUrl.startsWith('http')) {
        try {
          await supabase.storage.from('logos').remove([branding.logoUrl]);
        } catch (error) {
          console.error('Error deleting old logo:', error);
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${membership.tenant_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // For private bucket, we store the path and generate signed URLs when needed
      updateBranding({ logoUrl: filePath });
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const saveBranding = async () => {
    try {
      const response = await fetch('/api/business-branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logo_url: branding.logoUrl,
          business_name: branding.businessName,
          tagline: branding.tagline,
          website: branding.website,
          phone: branding.phone,
          email_from_name: branding.emailSettings.fromName,
          reply_to_email: branding.emailSettings.replyToEmail,
          email_signature: branding.emailSettings.footerText
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save branding settings');
      }

      const data = await response.json();
      
      // Update the local state with the saved data to ensure consistency
      if (data.branding) {
        setBranding({
          businessName: data.branding.business_name || "Your Business Name",
          tagline: data.branding.tagline || "Delivering Excellence",
          logoUrl: data.branding.logo_url,
          website: data.branding.website,
          phone: data.branding.phone,
          email: data.branding.reply_to_email || "business@example.com",
          emailSettings: {
            fromName: data.branding.email_from_name || "Your Business Name",
            replyToEmail: data.branding.reply_to_email || "business@example.com",
            includeBusinessInfo: true,
            includeUnsubscribe: false,
            footerText: data.branding.email_signature || "Thank you for your business!"
          }
        });
      }
      
      setHasChanges(false);
      toast.success('Branding settings saved successfully!');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Failed to save branding settings');
    }
  };

  const previewEmail = () => {
    setShowPreview(true);
  };

  // Get the template to use for preview
  const templateToUse = currentTemplate || sampleTemplate;

  // Generate a mini email preview using the actual template + branding data
  const generateMiniEmailPreview = () => {
    if (!templateToUse) {
      return (
        <div className="text-center text-gray-500 py-8">
          <p>No email template found</p>
          <p className="text-sm">Create a template in the Design tab first</p>
        </div>
      );
    }

    const primaryColor = templateToUse.primary_color || '#667eea';
    const secondaryColor = templateToUse.secondary_color || '#764ba2';
    
    // Handle headerStyle - could be string or object
    let headerStyle = 'gradient'; // default
    if (typeof templateToUse.header_style === 'string') {
      headerStyle = templateToUse.header_style;
    } else if (typeof templateToUse.header_style === 'object' && templateToUse.header_style) {
      // Convert object format to string
      if (templateToUse.header_style.gradient) {
        headerStyle = 'gradient';
      } else if (templateToUse.header_style.solid) {
        headerStyle = 'solid';
      } else if (templateToUse.header_style.minimal) {
        headerStyle = 'minimal';
      }
    }
    
    console.log('Template colors for preview:', {
      templateName: templateToUse.name,
      templateType: templateToUse.template_type,
      primaryColor,
      secondaryColor,
      headerStyle,
      hasColors: !!(templateToUse.primary_color && templateToUse.secondary_color)
    });

    // Helper functions for template-specific content
    const getDefaultGreeting = (type: string) => {
      switch (type) {
        case 'invoice':
          return 'We\'ve prepared your invoice. Please find the PDF attached to this email.';
        case 'payment_reminder':
          return 'This is a friendly reminder about an outstanding invoice that needs your attention.';
        case 'payment_received':
          return 'Thank you for your payment! We\'ve successfully received and processed your payment.';
        default:
          return 'We\'ve prepared your invoice. Please find the PDF attached to this email.';
      }
    };

    const getTemplateSpecificContent = (type: string) => {
      console.log('Generating content for:', type, 'with colors:', primaryColor, secondaryColor);
      
      switch (type) {
        case 'invoice':
          return `
            <div class="invoice-summary">
              <div class="invoice-row">
                <span>Invoice #INV-001</span>
                <span class="invoice-total">$2,500.00</span>
              </div>
              <div style="color: #6b7280;">Due: Feb 15, 2024</div>
            </div>
          `;
        case 'payment_reminder':
          return `
            <div class="template-banner" style="background: ${primaryColor}15; border-color: ${primaryColor}; color: ${primaryColor};">
              <div class="template-banner-title" style="color: ${primaryColor};">⚠️ Invoice is 7 days overdue</div>
              <div class="template-banner-text" style="color: ${primaryColor};">Invoice #INV-001 for $2,500.00 was due on Feb 15, 2024</div>
            </div>
          `;
        case 'payment_received':
          return `
            <div class="template-banner" style="background: ${primaryColor}15; border-color: ${primaryColor}; color: ${primaryColor};">
              <div class="template-banner-title" style="color: ${primaryColor};">🎉 Payment received!</div>
              <div class="template-banner-text" style="color: ${primaryColor};">Payment of $2,500.00 received for Invoice #INV-001</div>
            </div>
          `;
        default:
          return `
            <div class="invoice-summary">
              <div class="invoice-row">
                <span>Invoice #INV-001</span>
                <span class="invoice-total">$2,500.00</span>
              </div>
              <div style="color: #6b7280;">Due: Feb 15, 2024</div>
            </div>
          `;
      }
    };

    const getAttachmentText = (type: string) => {
      switch (type) {
        case 'invoice':
          return 'Invoice PDF attached to this email';
        case 'payment_reminder':
          return 'Updated invoice PDF is attached for your reference';
        case 'payment_received':
          return 'Payment confirmation and updated invoice are attached';
        default:
          return 'Invoice PDF attached to this email';
      }
    };

    // Generate the HTML content as a string and use iframe to render it isolated
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          .preview-container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .preview-header {
            padding: 16px;
            text-align: center;
            background: ${headerStyle === 'solid' ? primaryColor : '#ffffff'};
            background-image: ${headerStyle === 'gradient' ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` : 'none'};
            color: ${headerStyle === 'minimal' ? '#1a1a1a' : '#ffffff'};
            border-bottom: ${headerStyle === 'minimal' ? '1px solid #e1e4e8' : 'none'};
          }
          .preview-header h4 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .preview-header p {
            font-size: 12px;
            opacity: 0.9;
          }
          .preview-content {
            padding: 16px;
          }
          .preview-greeting {
            font-size: 14px;
            margin-bottom: 12px;
          }
          .preview-message {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 12px;
          }
          .invoice-summary {
            background: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            font-size: 12px;
            margin-bottom: 12px;
          }
          .invoice-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .invoice-total {
            font-weight: 600;
          }
          .template-banner {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            border: 2px solid;
          }
          .template-banner-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .template-banner-text {
            font-size: 11px;
            opacity: 0.8;
          }
          .preview-footer {
            background: #f9fafb;
            padding: 16px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          .footer-business {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <div class="preview-header">
            <h4>${templateToUse.template_type === 'invoice' ? 'New Invoice' : templateToUse.template_type === 'payment_reminder' ? 'Payment Reminder' : 'Payment Received'}</h4>
            <p>${branding.businessName}</p>
          </div>
          <div class="preview-content">
            <div class="preview-greeting">Hello John Smith 👋</div>
            <div class="preview-message">${templateToUse.greeting_message || getDefaultGreeting(templateToUse.template_type)}</div>
            ${getTemplateSpecificContent(templateToUse.template_type)}
            <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 8px; text-align: center; margin-top: 12px;">
              <div style="color: #1e40af; font-size: 11px;">📎 ${getAttachmentText(templateToUse.template_type)}</div>
            </div>
          </div>
          <div class="preview-footer">
            <div class="footer-business">${branding.businessName}</div>
            <div>${branding.email}</div>
            ${branding.phone ? `<div>${branding.phone}</div>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={htmlContent}
        style={{
          width: '100%',
          height: '350px',
          border: 'none',
          borderRadius: '8px'
        }}
        title="Email Template Preview"
      />
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-First Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Business Settings</h2>
            <p className="text-sm text-gray-600">Brand your emails and configure settings</p>
          </div>
        </div>
        
        {/* Mobile-Optimized Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {hasChanges && (
            <div className="flex items-center justify-center sm:justify-start">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1 animate-pulse" />
                Unsaved Changes
              </Badge>
            </div>
          )}
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Button variant="outline" onClick={previewEmail} className="flex-1 sm:flex-initial">
              <Eye className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button 
              onClick={saveBranding} 
              disabled={!hasChanges}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Save className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Save Changes</span>
              <span className="sm:hidden">Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile-First Accordion Layout */}
      <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
        {/* Business Information - Mobile Optimized */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Business Information</CardTitle>
                  <CardDescription className="text-sm">
                    Appears in your email templates
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-5">
              {/* Logo Upload - Mobile Optimized */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Company Logo</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative">
                    {branding.logoUrl ? (
                      <div className="relative">
                        <SecureImage
                          path={branding.logoUrl}
                          alt="Company Logo"
                          className="w-20 h-20 sm:w-24 sm:h-24 object-contain border-2 border-gray-200 rounded-xl bg-white p-2 shadow-sm"
                        />
                        <button
                          onClick={() => updateBranding({ logoUrl: undefined })}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-colors cursor-pointer">
                        <Image className="w-6 h-6 sm:w-8 sm:h-8 mb-1" />
                        <span className="text-xs">Logo</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full text-center sm:text-left">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Label htmlFor="logo-upload" className="w-full">
                      <Button 
                        type="button"
                        variant="outline" 
                        disabled={uploading}
                        className="cursor-pointer w-full sm:w-auto"
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload Logo'}
                        </span>
                      </Button>
                    </Label>
                    <p className="text-xs text-gray-500 mt-2">
                      PNG, JPG up to 2MB • Recommended: 200x200px
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Details - Mobile Grid */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name" className="text-sm font-medium text-gray-700">
                    Business Name *
                  </Label>
                  <Input
                    id="business-name"
                    value={branding.businessName}
                    onChange={(e) => updateBranding({ businessName: e.target.value })}
                    placeholder="Your Business Name"
                    className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline" className="text-sm font-medium text-gray-700">
                    Tagline
                  </Label>
                  <Input
                    id="tagline"
                    value={branding.tagline || ''}
                    onChange={(e) => updateBranding({ tagline: e.target.value })}
                    placeholder="Delivering Excellence"
                    className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                      Website
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="website"
                        value={branding.website || ''}
                        onChange={(e) => updateBranding({ website: e.target.value })}
                        placeholder="yourbusiness.com"
                        className="h-11 pl-10 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={branding.phone || ''}
                        onChange={(e) => updateBranding({ phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="h-11 pl-10 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address - Mobile Collapsible */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Business Address</CardTitle>
                  <CardDescription className="text-sm">
                    Optional: Include in email footers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address-line1" className="text-sm font-medium text-gray-700">
                    Street Address
                  </Label>
                  <Input
                    id="address-line1"
                    value={branding.address?.line1 || ''}
                    onChange={(e) => updateBranding({
                      address: { ...branding.address, line1: e.target.value, city: branding.address?.city || '', state: branding.address?.state || '', postalCode: branding.address?.postalCode || '', country: branding.address?.country || 'United States' }
                    })}
                    placeholder="123 Business St"
                    className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address-line2" className="text-sm font-medium text-gray-700">
                    Suite/Unit (Optional)
                  </Label>
                  <Input
                    id="address-line2"
                    value={branding.address?.line2 || ''}
                    onChange={(e) => updateBranding({
                      address: { ...branding.address!, line2: e.target.value }
                    })}
                    placeholder="Suite 100"
                    className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
                    <Input
                      id="city"
                      value={branding.address?.city || ''}
                      onChange={(e) => updateBranding({
                        address: { ...branding.address, city: e.target.value, line1: branding.address?.line1 || '', state: branding.address?.state || '', postalCode: branding.address?.postalCode || '', country: branding.address?.country || 'United States' }
                      })}
                      placeholder="City"
                      className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700">State</Label>
                    <Input
                      id="state"
                      value={branding.address?.state || ''}
                      onChange={(e) => updateBranding({
                        address: { ...branding.address, state: e.target.value, line1: branding.address?.line1 || '', city: branding.address?.city || '', postalCode: branding.address?.postalCode || '', country: branding.address?.country || 'United States' }
                      })}
                      placeholder="CA"
                      className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal-code" className="text-sm font-medium text-gray-700">ZIP Code</Label>
                    <Input
                      id="postal-code"
                      value={branding.address?.postalCode || ''}
                      onChange={(e) => updateBranding({
                        address: { ...branding.address, postalCode: e.target.value, line1: branding.address?.line1 || '', city: branding.address?.city || '', state: branding.address?.state || '', country: branding.address?.country || 'United States' }
                      })}
                      placeholder="12345"
                      className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country</Label>
                    <Input
                      id="country"
                      value={branding.address?.country || 'United States'}
                      onChange={(e) => updateBranding({
                        address: { ...branding.address, country: e.target.value, line1: branding.address?.line1 || '', city: branding.address?.city || '', state: branding.address?.state || '', postalCode: branding.address?.postalCode || '' }
                      })}
                      placeholder="United States"
                      className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Settings - Mobile Optimized */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Email Settings</CardTitle>
                  <CardDescription className="text-sm">
                    Configure email sending and display
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="from-name" className="text-sm font-medium text-gray-700">
                    From Name
                  </Label>
                  <Input
                    id="from-name"
                    value={branding.emailSettings.fromName}
                    onChange={(e) => updateEmailSettings({ fromName: e.target.value })}
                    placeholder="Your Business Name"
                    className="h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500">
                    Appears in the "From" field of emails
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-email" className="text-sm font-medium text-gray-700">
                    Business Email *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="business-email"
                      type="email"
                      value={branding.emailSettings.replyToEmail}
                      onChange={(e) => {
                        updateEmailSettings({ 
                          replyToEmail: e.target.value,
                          fromName: branding.emailSettings.fromName 
                        });
                        updateBranding({ email: e.target.value });
                      }}
                      placeholder="business@example.com"
                      className="h-11 pl-10 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Main contact email for all communication
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer-text" className="text-sm font-medium text-gray-700">
                    Footer Message
                  </Label>
                  <Textarea
                    id="footer-text"
                    value={branding.emailSettings.footerText}
                    onChange={(e) => updateEmailSettings({ footerText: e.target.value })}
                    placeholder="Thank you for your business!"
                    rows={3}
                    className="rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Appears in all email footers
                  </p>
                </div>
              </div>

              {/* Email Options - Mobile Cards */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 text-sm">Email Options</h4>
                
                <div className="space-y-3">
                  <div className="flex items-start sm:items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 pr-4">
                      <Label className="text-sm font-medium text-gray-900">Business Info in Footer</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Include address and contact details
                      </p>
                    </div>
                    <Switch
                      checked={branding.emailSettings.includeBusinessInfo}
                      onCheckedChange={(checked) => updateEmailSettings({ includeBusinessInfo: checked })}
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </div>

                  <div className="flex items-start sm:items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 pr-4">
                      <Label className="text-sm font-medium text-gray-900">Unsubscribe Link</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        For marketing emails compliance
                      </p>
                    </div>
                    <Switch
                      checked={branding.emailSettings.includeUnsubscribe}
                      onCheckedChange={(checked) => updateEmailSettings({ includeUnsubscribe: checked })}
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Template Preview - Mobile Optimized */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Live Preview</CardTitle>
                  <CardDescription className="text-sm">
                    See your branding in action
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {generateMiniEmailPreview()}
                </div>
                
                {templateToUse && (
                  <div className="mt-4 p-3 bg-white/50 rounded-xl">
                    <div className="text-center space-y-1">
                      <p className="text-xs font-medium text-gray-700">
                        Template: <span className="text-purple-600">{templateToUse.name}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {currentTemplate ? '✏️ Editing' : '📄 Sample'} • 🎨 Design colors • ⚙️ Your settings
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Preview Modal */}
      <EmailPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        branding={branding}
      />
    </div>
  );
}