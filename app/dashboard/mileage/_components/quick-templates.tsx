"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, MapPin, Clock, X, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ConfirmationDialog } from "./confirmation-dialog";
import { getCurrentIRSRate } from "../_utils/irs-rate";

interface MileageTemplate {
  id: string;
  name: string;
  start_location: string;
  end_location: string;
  typical_miles: number;
  purpose: string;
  business_purpose_category: string;
  usage_count: number;
}

interface QuickTemplatesProps {
  onTemplateUsed: () => void;
  refreshTrigger?: number;
}

const purposeIcons: Record<string, string> = {
  client_visit: "👥",
  business_meeting: "🤝",
  supplies: "📦",
  bank: "🏦",
  office: "🏢",
  networking: "🌐",
  delivery: "🚚",
  other: "💼",
};

export function QuickTemplates({ onTemplateUsed, refreshTrigger }: QuickTemplatesProps) {
  const [templates, setTemplates] = useState<MileageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingTemplate, setUsingTemplate] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, templateId: string | null, templateName: string}>({
    open: false,
    templateId: null,
    templateName: ""
  });
  const [deleting, setDeleting] = useState(false);
  const [irsRate, setIrsRate] = useState(0.655);
  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
    getCurrentIRSRate().then(setIrsRate);
  }, [refreshTrigger]);

  const fetchTemplates = async () => {
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
        .from('mileage_template')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .order('usage_count', { ascending: false })
        .order('last_used_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = async (template: MileageTemplate) => {
    setUsingTemplate(template.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant found");

      // Create mileage log from template
      const { error: logError } = await supabase
        .from('mileage_log')
        .insert({
          tenant_id: membership.tenant_id,
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          start_location: template.start_location,
          end_location: template.end_location,
          miles: template.typical_miles,
          purpose: template.purpose,
          business_purpose_category: template.business_purpose_category,
        });

      if (logError) throw logError;

      toast.success(`Trip logged using "${template.name}" template`);
      onTemplateUsed();
      
      // Note: Template usage stats are automatically updated by database trigger
      
    } catch (error) {
      console.error('Error using template:', error);
      toast.error("Failed to log trip from template");
    } finally {
      setUsingTemplate(null);
    }
  };

  const handleDeleteTemplate = (template: MileageTemplate) => {
    setDeleteConfirm({
      open: true,
      templateId: template.id,
      templateName: template.name
    });
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteConfirm.templateId) return;
    
    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('mileage_template')
        .delete()
        .eq('id', deleteConfirm.templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== deleteConfirm.templateId));
      toast.success("Template deleted successfully");
      
      setDeleteConfirm({ open: false, templateId: null, templateName: "" });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete template");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            <Zap className="w-5 h-5 text-purple-600" />
            Quick Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gradient-to-r from-purple-100 to-blue-100 rounded border-2 border-dashed border-purple-200"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            <Zap className="w-5 h-5 text-purple-600" />
            Quick Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Clock className="w-8 h-8 mx-auto text-purple-400 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Templates will appear here as you log recurring trips
            </p>
            <p className="text-xs text-muted-foreground">
              Repeated trips automatically become quick-use templates
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          <Zap className="w-5 h-5 text-purple-600" />
          Quick Templates
          <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700">
            One-tap logging
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {templates.map((template) => (
            <Card key={template.id} className="group relative hover:border-purple-500 hover:bg-purple-50 transition-all duration-200">
              <CardContent className="p-3">
                {/* Template Management Menu */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Template Content - Clickable */}
                <div 
                  className="cursor-pointer"
                  onClick={() => useTemplate(template)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">
                      {purposeIcons[template.business_purpose_category] || "💼"}
                    </span>
                    <span className="text-xs font-medium truncate flex-1">
                      {template.name}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{template.start_location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="ml-4">→ {template.end_location}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{template.typical_miles} mi</span>
                      <span className="text-green-600">
                        ${(template.typical_miles * irsRate).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {template.usage_count > 0 && (
                    <Badge variant="secondary" className="text-xs mt-2">
                      Used {template.usage_count}x
                    </Badge>
                  )}
                  
                  {usingTemplate === template.id && (
                    <div className="text-xs text-purple-600 mt-2">
                      Creating trip...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            💡 Save trips as templates when logging to create quick-use shortcuts
          </p>
        </div>
        
        <ConfirmationDialog
          open={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, templateId: null, templateName: "" })}
          onConfirm={confirmDeleteTemplate}
          title="Delete Template"
          description={`Are you sure you want to delete the template "${deleteConfirm.templateName}"? This action cannot be undone.`}
          confirmText="Delete"
          isDestructive={true}
          loading={deleting}
        />
      </CardContent>
    </Card>
  );
}