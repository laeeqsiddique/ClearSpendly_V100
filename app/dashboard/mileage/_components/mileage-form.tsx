"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Calculator, Calendar as CalendarIcon, Save, Clock, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getCurrentIRSRate, formatIRSRate } from "../_utils/irs-rate";

interface MileageLog {
  id: string;
  date: string;
  start_location: string;
  end_location: string;
  miles: number;
  purpose: string;
  business_purpose_category: string;
  notes?: string;
}

interface MileageFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  editData?: MileageLog | null;
}

const businessPurposes = [
  { value: "client_visit", label: "Client Visit", icon: "👥" },
  { value: "business_meeting", label: "Business Meeting", icon: "🤝" },
  { value: "supplies", label: "Business Supplies", icon: "📦" },
  { value: "bank", label: "Bank Visit", icon: "🏦" },
  { value: "office", label: "Office/Coworking", icon: "🏢" },
  { value: "networking", label: "Networking Event", icon: "🌐" },
  { value: "delivery", label: "Delivery/Service", icon: "🚚" },
  { value: "other", label: "Other Business", icon: "💼" },
];

export function MileageForm({ open, onClose, onSubmit, editData }: MileageFormProps) {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    startLocation: "",
    endLocation: "",
    miles: "",
    purpose: "",
    businessPurposeCategory: "",
    notes: "",
  });
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [irsRate, setIrsRate] = useState(0.655);

  // Initialize form with edit data when provided
  useEffect(() => {
    if (editData) {
      setDate(new Date(editData.date));
      setFormData({
        startLocation: editData.start_location,
        endLocation: editData.end_location,
        miles: editData.miles.toString(),
        purpose: editData.purpose,
        businessPurposeCategory: editData.business_purpose_category,
        notes: editData.notes || "",
      });
      setSaveAsTemplate(false);
      setTemplateName("");
    } else {
      // Reset form for new entries
      setDate(new Date());
      setFormData({
        startLocation: "",
        endLocation: "",
        miles: "",
        purpose: "",
        businessPurposeCategory: "",
        notes: "",
      });
      setSaveAsTemplate(false);
      setTemplateName("");
    }
  }, [editData, open]);

  // Fetch IRS rate when component mounts or date changes
  useEffect(() => {
    getCurrentIRSRate().then(setIrsRate);
  }, [date]);

  const supabase = createClient();

  const calculateDeduction = () => {
    const miles = parseFloat(formData.miles) || 0;
    return (miles * irsRate).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startLocation || !formData.endLocation || !formData.miles || !formData.purpose || !formData.businessPurposeCategory) {
      toast.error("Please fill in all required fields");
      return;
    }

    const miles = parseFloat(formData.miles);
    if (isNaN(miles) || miles <= 0) {
      toast.error("Please enter a valid mileage amount");
      return;
    }

    setLoading(true);

    try {
      // Get user and tenant info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant found");

      const mileageData = {
        tenant_id: membership.tenant_id,
        user_id: user.id,
        date: format(date, 'yyyy-MM-dd'),
        start_location: formData.startLocation,
        end_location: formData.endLocation,
        miles: miles,
        purpose: formData.purpose,
        business_purpose_category: formData.businessPurposeCategory,
        notes: formData.notes || null,
      };

      let error;
      
      if (editData) {
        // Update existing mileage log
        ({ error } = await supabase
          .from('mileage_log')
          .update(mileageData)
          .eq('id', editData.id));
      } else {
        // Insert new mileage log
        ({ error } = await supabase
          .from('mileage_log')
          .insert(mileageData));
      }

      if (error) throw error;

      // Save as template if requested
      if (saveAsTemplate && templateName.trim()) {
        const templateData = {
          tenant_id: membership.tenant_id,
          user_id: user.id,
          name: templateName.trim(),
          start_location: formData.startLocation,
          end_location: formData.endLocation,
          typical_miles: miles,
          purpose: formData.purpose,
          business_purpose_category: formData.businessPurposeCategory,
          usage_count: 1,
          last_used_at: new Date().toISOString(),
        };

        const { error: templateError } = await supabase
          .from('mileage_template')
          .insert(templateData);

        if (templateError) {
          console.warn("Failed to save template:", templateError);
          toast.error("Trip saved but failed to create template");
        } else {
          toast.success(editData ? "Trip updated and template created!" : "Trip logged and template created!");
        }
      } else {
        toast.success(editData ? "Mileage updated successfully!" : "Mileage logged successfully!");
      }

      onSubmit();
      
      // Reset form
      setFormData({
        startLocation: "",
        endLocation: "",
        miles: "",
        purpose: "",
        businessPurposeCategory: "",
        notes: "",
      });
      setDate(new Date());
      setSaveAsTemplate(false);
      setTemplateName("");
      
    } catch (error) {
      console.error('Error logging mileage:', error);
      toast.error("Failed to log mileage. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedPurpose = businessPurposes.find(p => p.value === formData.businessPurposeCategory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {editData ? "Edit Business Trip" : "Log Business Trip"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">From *</Label>
              <Input
                id="start"
                placeholder="e.g., Home Office, 123 Main St"
                value={formData.startLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, startLocation: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">To *</Label>
              <Input
                id="end"
                placeholder="e.g., Client Office, 456 Oak Ave"
                value={formData.endLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, endLocation: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="miles">Miles *</Label>
              <div className="relative">
                <Input
                  id="miles"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={formData.miles}
                  onChange={(e) => setFormData(prev => ({ ...prev, miles: e.target.value }))}
                  required
                />
                {formData.miles && (
                  <div className="absolute right-2 top-2 text-sm text-muted-foreground">
                    ${calculateDeduction()}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label>Business Purpose *</Label>
              <Select 
                value={formData.businessPurposeCategory} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, businessPurposeCategory: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose type">
                    {selectedPurpose && (
                      <span className="flex items-center gap-2">
                        <span>{selectedPurpose.icon}</span>
                        {selectedPurpose.label}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {businessPurposes.map((purpose) => (
                    <SelectItem key={purpose.value} value={purpose.value}>
                      <span className="flex items-center gap-2">
                        <span>{purpose.icon}</span>
                        {purpose.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          {/* Purpose Description & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose Details *</Label>
              <Input
                id="purpose"
                placeholder="e.g., Meeting with ABC Corp"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Additional details..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* Save as Template Option */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Bookmark className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="saveAsTemplate"
                      checked={saveAsTemplate}
                      onCheckedChange={(checked) => {
                        setSaveAsTemplate(checked as boolean);
                        if (!checked) {
                          setTemplateName("");
                        } else if (formData.startLocation && formData.endLocation) {
                          setTemplateName(`${formData.startLocation} → ${formData.endLocation}`);
                        }
                      }}
                      className="border-2 border-blue-300 bg-white data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white shadow-sm w-5 h-5"
                    />
                    <div>
                      <Label htmlFor="saveAsTemplate" className="text-sm font-semibold text-blue-800 cursor-pointer">
                        Save as template for future use
                      </Label>
                      <p className="text-xs text-blue-600 mt-1">
                        Create a quick-use shortcut for this trip combination
                      </p>
                    </div>
                  </div>
                  
                  {saveAsTemplate && (
                    <div className="mt-4 p-3 bg-white/60 rounded-lg border border-blue-200">
                      <Label htmlFor="templateName" className="text-sm font-medium text-blue-800">Template Name</Label>
                      <Input
                        id="templateName"
                        placeholder="e.g., Home to Client Office"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="mt-2 border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                      />
                      <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        This template will appear in your quick templates for one-click trip logging
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deduction Preview */}
          {formData.miles && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Tax Deduction</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    ${calculateDeduction()}
                  </Badge>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {formData.miles} miles × {formatIRSRate(irsRate)} (IRS rate)
                </p>
              </CardContent>
            </Card>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? "Saving..." : (editData ? "Update Trip" : "Save Trip")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}