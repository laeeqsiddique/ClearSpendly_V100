"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface IRSRateDialogProps {
  open: boolean;
  onClose: () => void;
  onRateUpdated: () => void;
  currentRate: number;
}

export function IRSRateDialog({ open, onClose, onRateUpdated, currentRate }: IRSRateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    rate: "",
    effective_date: `${new Date().getFullYear()}-01-01`,
    notes: ""
  });
  
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      setFormData({
        year: new Date().getFullYear(),
        rate: currentRate.toString(),
        effective_date: `${new Date().getFullYear()}-01-01`,
        notes: `Standard mileage rate for ${new Date().getFullYear()}`
      });
    }
  }, [open, currentRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate <= 0 || rate > 1) {
      toast.error("Please enter a valid rate between 0 and 1");
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

      const rateData = {
        tenant_id: membership.tenant_id,
        user_id: user.id,
        year: formData.year,
        rate: rate,
        effective_date: formData.effective_date,
        notes: formData.notes || null
      };

      // Try to update existing rate for the year and tenant first
      const { data: existingRate } = await supabase
        .from('irs_mileage_rate')
        .select('id')
        .eq('tenant_id', membership.tenant_id)
        .eq('year', formData.year)
        .single();

      let error;
      
      if (existingRate) {
        // Update existing rate
        ({ error } = await supabase
          .from('irs_mileage_rate')
          .update(rateData)
          .eq('tenant_id', membership.tenant_id)
          .eq('year', formData.year));
      } else {
        // Insert new rate
        ({ error } = await supabase
          .from('irs_mileage_rate')
          .insert(rateData));
      }

      if (error) throw error;

      toast.success(`IRS rate updated to ${formatRateDisplay(rate)} for ${formData.year}`);
      onRateUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error saving IRS rate:', error);
      toast.error("Failed to save IRS rate");
    } finally {
      setLoading(false);
    }
  };

  const formatRateDisplay = (rate: number) => {
    return `${(rate * 100).toFixed(1)}¢`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Update IRS Mileage Rate
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min={2020}
                max={2030}
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  year: parseInt(e.target.value),
                  effective_date: `${e.target.value}-01-01`,
                  notes: `Standard mileage rate for ${e.target.value}`
                }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rate">Rate (per mile)</Label>
              <Input
                id="rate"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                placeholder="0.655"
                value={formData.rate}
                onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter as decimal (e.g., 0.655 for 65.5¢)
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="effective_date">Effective Date</Label>
            <Input
              id="effective_date"
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="e.g., Standard mileage rate for 2024"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          
          {formData.rate && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm font-medium">Preview:</p>
                <p className="text-lg">
                  {formData.year}: <span className="font-mono">{formatRateDisplay(parseFloat(formData.rate) || 0)}</span> per mile
                </p>
              </CardContent>
            </Card>
          )}
        </form>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Update Rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}