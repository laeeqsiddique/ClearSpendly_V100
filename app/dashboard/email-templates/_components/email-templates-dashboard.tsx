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
  Sparkles
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
        <TabsList className="grid w-full grid-cols-4 bg-purple-100/50 dark:bg-purple-800 p-1 rounded-lg">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900 hover:text-purple-700"
          >
            <Mail className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="design" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900 hover:text-purple-700"
          >
            <Palette className="w-4 h-4" />
            Design
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900 hover:text-purple-700"
          >
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900 hover:text-purple-700"
          >
            <Sparkles className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats - Matching Invoice Dashboard Style */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Invoice Templates</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.template_type === 'invoice').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Reminder Templates</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.template_type === 'payment_reminder').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confirmation Templates</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.template_type === 'payment_received').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Mail className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Templates</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.is_active).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={async () => {
                if (templates.length > 0) {
                  // Refresh the first template before editing
                  const refreshedTemplate = await refreshTemplate(templates[0].id);
                  if (refreshedTemplate) {
                    safeSetSelectedTemplate(refreshedTemplate);
                    setActiveTab("design");
                  }
                } else {
                  createNewTemplate('invoice');
                }
              }} 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {templates.length > 0 ? 'Customize Templates' : 'Create First Template'}
            </Button>
            <Button variant="outline" className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700">
              <Eye className="w-4 h-4 mr-2" />
              Preview All
            </Button>
            <Button variant="outline" className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700">
              <Upload className="w-4 h-4 mr-2" />
              Import Theme
            </Button>
            <Button variant="outline" className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700">
              <Download className="w-4 h-4 mr-2" />
              Export Theme
            </Button>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
                <div 
                  key={template.id}
                  className="bg-white border-2 border-purple-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
                  onClick={async () => {
                    // Refresh template data from database before selecting
                    const refreshedTemplate = await refreshTemplate(template.id);
                    if (refreshedTemplate) {
                      safeSetSelectedTemplate(refreshedTemplate);
                    }
                  }}
                  style={{ minHeight: '200px' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
                      style={{ backgroundColor: getTemplateColor(template) }}
                    >
                      {getTemplateIcon(template.template_type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        {getTemplateTypeLabel(template.template_type)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {template.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Colors:</span>
                      <div className="flex gap-1">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: template.primary_color }}
                        />
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: template.secondary_color }}
                        />
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: template.accent_color }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <span className={`text-xs px-2 py-1 rounded ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-600'}`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                      
                      <div className="flex gap-1">
                        {!template.is_active && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              activateTemplate(template.id);
                            }}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            title="Activate this template"
                          >
                            Activate
                          </button>
                        )}
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
                          className="px-3 py-1 text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
            ))}
          </div>

          {/* Create New Template */}
          <Card className="border-2 border-dashed border-purple-200 hover:border-purple-300 transition-colors bg-purple-50/30 hover:bg-purple-50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Template</h3>
              <p className="text-gray-600 mb-4 max-w-md">
                Start from scratch or duplicate an existing template to create your perfect email design.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => createNewTemplate('invoice')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Invoice Template
                </Button>
                <Button 
                  onClick={() => createNewTemplate('payment_reminder')}
                  variant="outline"
                  className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Reminder Template
                </Button>
                <Button 
                  onClick={() => createNewTemplate('payment_received')}
                  variant="outline"
                  className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Confirmation Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-6">
          {selectedTemplate ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <EmailTemplateEditor 
                  template={selectedTemplate}
                  onTemplateChange={safeSetSelectedTemplate}
                  onTemplateRefresh={fetchTemplates}
                />
              </div>
              <div className="space-y-6">
                <EmailPreview 
                  key={`${selectedTemplate?.id}-${selectedTemplate?.name}-${selectedTemplate?.primary_color}-${selectedTemplate?.subject_template}`}
                  template={selectedTemplate}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Palette className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Template Selected</h3>
              <p className="text-gray-600">
                Select a template from the overview tab to start editing.
              </p>
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