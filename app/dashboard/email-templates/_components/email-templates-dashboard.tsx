"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail,
  Palette,
  FileText,
  Clock,
  CheckCircle,
  Settings,
  Eye,
  Plus,
  Wand2,
  Download,
  Upload,
  Sparkles,
  ArrowRight,
  Zap
} from "lucide-react";
import { EmailTemplateEditor } from "./email-template-editor";
import { EmailBrandingSettings } from "./email-branding-settings";
import { EmailPreview } from "./email-preview";
import { EmailAnalytics } from "./email-analytics";
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
  updated_at: string;
}

// Design Tab Component with Mobile Tab Switching
function DesignTabContent({ 
  selectedTemplate, 
  onTemplateChange, 
  onTemplateRefresh 
}: { 
  selectedTemplate: EmailTemplate;
  onTemplateChange: (template: EmailTemplate) => void;
  onTemplateRefresh: () => Promise<void>;
}) {
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');

  return (
    <div className="space-y-4">
      {/* Mobile-first tab navigation for Design mode */}
      <div className="lg:hidden">
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button 
            onClick={() => setMobileView('editor')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mobileView === 'editor' 
                ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Palette className="w-4 h-4" />
              <span>Editor</span>
            </div>
          </button>
          <button 
            onClick={() => setMobileView('preview')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mobileView === 'preview' 
                ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </div>
          </button>
        </div>
      </div>
      
      {/* Desktop side-by-side, Mobile switching */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Editor - Show on desktop always, on mobile when selected */}
        <div className={`${mobileView === 'editor' ? 'block' : 'hidden'} lg:block`}>
          <EmailTemplateEditor 
            template={selectedTemplate}
            onTemplateChange={onTemplateChange}
            onTemplateRefresh={onTemplateRefresh}
          />
        </div>
        
        {/* Preview - Show on desktop always, on mobile when selected */}
        <div className={`${mobileView === 'preview' ? 'block' : 'hidden'} lg:block`}>
          <EmailPreview 
            key={`${selectedTemplate?.id}-${selectedTemplate?.name}-${selectedTemplate?.primary_color}-${selectedTemplate?.subject_template}`}
            template={selectedTemplate}
          />
        </div>
      </div>
    </div>
  );
}

export function EmailTemplatesDashboard() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Safe template setter with validation
  const safeSetSelectedTemplate = (template: EmailTemplate | null) => {
    try {
      if (!template || (template.id && template.template_type)) {
        setSelectedTemplate(template);
      } else {
        console.error('Invalid template data:', template);
      }
    } catch (error) {
      console.error('Error setting selected template:', error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email-templates');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="w-5 h-5" />;
      case 'payment_reminder':
        return <Clock className="w-5 h-5" />;
      case 'payment_received':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Mail className="w-5 h-5" />;
    }
  };

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'New Invoice';
      case 'payment_reminder':
        return 'Payment Reminder';
      case 'payment_received':
        return 'Payment Received';
      default:
        return type;
    }
  };

  const getTemplateColor = (template: EmailTemplate) => {
    return template.primary_color;
  };

  const createNewTemplate = async (templateType: 'invoice' | 'payment_reminder' | 'payment_received') => {
    try {
      const newTemplate = {
        template_type: templateType,
        name: `New ${getTemplateTypeLabel(templateType)} Template`,
        description: `Custom ${getTemplateTypeLabel(templateType).toLowerCase()} template`,
        is_active: false,
        primary_color: '#667eea',
        secondary_color: '#764ba2',
        accent_color: '#10b981',
        text_color: '#1a1a1a',
        background_color: '#f5f5f5',
        subject_template: getDefaultSubject(templateType),
        greeting_message: getDefaultGreeting(templateType),
        footer_message: 'Questions? Just reply to this email and we\'ll be happy to help.'
      };

      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      const data = await response.json();
      
      // Add the new template to the list
      setTemplates(prev => [...prev, data.template]);
      
      // Set it as selected and switch to design tab
      safeSetSelectedTemplate(data.template);
      setActiveTab('design');
      
      toast.success('Template created successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const getDefaultSubject = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'Invoice {{invoice_number}} from {{business_name}}';
      case 'payment_reminder':
        return 'Friendly Reminder: Invoice {{invoice_number}} is {{days_overdue}} days overdue';
      case 'payment_received':
        return 'Thank you! Payment received for Invoice {{invoice_number}}';
      default:
        return 'Email from {{business_name}}';
    }
  };

  const getDefaultGreeting = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'We\'ve prepared your invoice. Here\'s a summary of the details:';
      case 'payment_reminder':
        return 'We hope you\'re doing well! This is a friendly reminder about an outstanding invoice that needs your attention.';
      case 'payment_received':
        return 'Thank you for your payment! We\'ve successfully received and processed your payment.';
      default:
        return 'Thank you for your business!';
    }
  };

  const activateTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/email-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to activate template');
      }

      // Refresh templates to show updated status
      await fetchTemplates();
      
      toast.success('Template activated successfully');
    } catch (error) {
      console.error('Error activating template:', error);
      toast.error('Failed to activate template');
    }
  };

  // Function to refresh a specific template from the database
  const refreshTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/email-templates/${templateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      
      const data = await response.json();
      
      // Update the templates array with the fresh data
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId ? data.template : template
        )
      );
      
      // Update the selected template if it's the one being refreshed
      if (selectedTemplate?.id === templateId) {
        safeSetSelectedTemplate(data.template);
      }
      
      return data.template;
    } catch (error) {
      console.error('Error refreshing template:', error);
      toast.error('Failed to refresh template');
      return null;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-purple-100/50 dark:bg-purple-800 p-1 rounded-lg">
          <TabsTrigger 
            value="overview" 
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900 hover:text-purple-700"
          >
            <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">View</span>
          </TabsTrigger>
          <TabsTrigger 
            value="design" 
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900 hover:text-purple-700"
          >
            <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Design</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900 hover:text-purple-700"
          >
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Setup</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900 hover:text-purple-700"
          >
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats - Mobile-First Responsive Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-gray-100 rounded-lg w-fit">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Invoice</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.template_type === 'invoice').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-gray-100 rounded-lg w-fit">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Reminder</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.template_type === 'payment_reminder').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-gray-100 rounded-lg w-fit">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Confirmed</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.template_type === 'payment_received').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-gray-100 rounded-lg w-fit">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Active</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.is_active).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - World-Class Mobile UX */}
          <div className="space-y-4">
            {/* Primary CTA */}
            <button
              onClick={async () => {
                if (templates.length > 0) {
                  const refreshedTemplate = await refreshTemplate(templates[0].id);
                  if (refreshedTemplate) {
                    safeSetSelectedTemplate(refreshedTemplate);
                    setActiveTab("design");
                  }
                } else {
                  createNewTemplate('invoice');
                }
              }}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">
                    {templates.length > 0 ? 'Customize Templates' : 'Create Your First Template'}
                  </p>
                  <p className="text-xs text-white/80">
                    {templates.length > 0 ? 'Edit colors, content & layout' : 'Start with a professional design'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            {/* Secondary Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button className="flex flex-col items-center p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-purple-200 transition-colors">
                  <Eye className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">Preview</span>
              </button>
              <button className="flex flex-col items-center p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-200 transition-colors">
                  <Upload className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">Import</span>
              </button>
              <button className="flex flex-col items-center p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-green-200 transition-colors">
                  <Download className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">Export</span>
              </button>
            </div>
          </div>

          {/* Template Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {templates.map((template) => (
                <div 
                  key={template.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer group relative overflow-hidden"
                  onClick={async () => {
                    // Refresh template data from database before selecting
                    const refreshedTemplate = await refreshTemplate(template.id);
                    if (refreshedTemplate) {
                      safeSetSelectedTemplate(refreshedTemplate);
                    }
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                          style={{ 
                            background: `linear-gradient(135deg, ${template.primary_color}, ${template.secondary_color})`
                          }}
                        >
                          {getTemplateIcon(template.template_type)}
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{template.name}</h3>
                          <span className="inline-block px-2 py-0.5 text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 rounded-full">
                            {getTemplateTypeLabel(template.template_type)}
                          </span>
                        </div>
                      </div>
                      {template.is_active && (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                          Active
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                        {template.description || 'Customize this template to match your brand'}
                      </p>
                      
                      {/* Color palette preview */}
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: template.primary_color }}
                            title="Primary"
                          />
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: template.secondary_color }}
                            title="Secondary"
                          />
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: template.accent_color }}
                            title="Accent"
                          />
                        </div>
                        <span className="text-xs text-gray-500">Theme colors</span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex gap-2">
                          {!template.is_active && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                activateTemplate(template.id);
                              }}
                              className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
                              title="Activate this template"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Refresh template data from database before editing
                            const refreshedTemplate = await refreshTemplate(template.id);
                            if (refreshedTemplate) {
                              safeSetSelectedTemplate(refreshedTemplate);
                              setActiveTab("design");
                            }
                          }}
                          className="px-4 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
                        >
                          Customize
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
            ))}
          </div>

          {/* Create New Template - World-Class Mobile UX */}
          <Card className="border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-all group cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-12 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">Create New Template</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-sm px-4">
                Design beautiful emails that convert
              </p>
              
              {/* Mobile-first button grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full px-4 sm:px-8">
                <button
                  onClick={() => createNewTemplate('invoice')}
                  className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 hover:border-purple-300 group/btn"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2 group-hover/btn:bg-blue-200 transition-colors">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Invoice</span>
                  <span className="text-xs text-gray-500">Send bills</span>
                </button>
                
                <button
                  onClick={() => createNewTemplate('payment_reminder')}
                  className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 hover:border-purple-300 group/btn"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-2 group-hover/btn:bg-amber-200 transition-colors">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Reminder</span>
                  <span className="text-xs text-gray-500">Follow up</span>
                </button>
                
                <button
                  onClick={() => createNewTemplate('payment_received')}
                  className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 hover:border-purple-300 group/btn"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2 group-hover/btn:bg-green-200 transition-colors">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Receipt</span>
                  <span className="text-xs text-gray-500">Confirm</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-4">
          {selectedTemplate ? (
            <DesignTabContent
              selectedTemplate={selectedTemplate}
              onTemplateChange={safeSetSelectedTemplate}
              onTemplateRefresh={fetchTemplates}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <Palette className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Design Your Email Templates</h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Choose a template from the overview to customize colors, content, and layout
              </p>
              <Button 
                onClick={() => setActiveTab("overview")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                Go to Templates
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <EmailBrandingSettings 
            isActive={activeTab === 'settings'}
            currentTemplate={selectedTemplate}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <EmailAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}