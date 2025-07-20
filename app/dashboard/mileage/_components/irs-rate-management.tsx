"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, DollarSign, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ConfirmationDialog } from "./confirmation-dialog";

interface IRSRate {
  id: string;
  year: number;
  rate: number;
  effective_date: string;
  notes?: string;
  created_at: string;
}

export function IRSRateManagement() {
  const [rates, setRates] = useState<IRSRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<IRSRate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, rateId: string | null, year: number}>({
    open: false,
    rateId: null,
    year: 0
  });
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear() + 1,
    rate: "",
    effective_date: `${new Date().getFullYear() + 1}-01-01`,
    notes: ""
  });
  
  const supabase = createClient();

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      // Get user and tenant info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data, error } = await supabase
        .from('irs_mileage_rate')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .order('year', { ascending: false });

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error('Error fetching IRS rates:', error);
      toast.error("Failed to load IRS rates");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate <= 0 || rate > 1) {
      toast.error("Please enter a valid rate between 0 and 1");
      return;
    }

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

      let error;
      
      if (editData) {
        ({ error } = await supabase
          .from('irs_mileage_rate')
          .update(rateData)
          .eq('id', editData.id));
      } else {
        ({ error } = await supabase
          .from('irs_mileage_rate')
          .insert(rateData));
      }

      if (error) throw error;

      toast.success(editData ? "IRS rate updated successfully" : "IRS rate added successfully");
      setShowForm(false);
      setEditData(null);
      resetForm();
      fetchRates();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error(`Rate for year ${formData.year} already exists`);
      } else {
        console.error('Error saving IRS rate:', error);
        toast.error("Failed to save IRS rate");
      }
    }
  };

  const handleEdit = (rate: IRSRate) => {
    setEditData(rate);
    setFormData({
      year: rate.year,
      rate: rate.rate.toString(),
      effective_date: rate.effective_date,
      notes: rate.notes || ""
    });
    setShowForm(true);
  };

  const handleDelete = (rate: IRSRate) => {
    setDeleteConfirm({
      open: true,
      rateId: rate.id,
      year: rate.year
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.rateId) return;
    
    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('irs_mileage_rate')
        .delete()
        .eq('id', deleteConfirm.rateId);

      if (error) throw error;

      toast.success("IRS rate deleted");
      setDeleteConfirm({ open: false, rateId: null, year: 0 });
      fetchRates();
    } catch (error) {
      console.error('Error deleting IRS rate:', error);
      toast.error("Failed to delete IRS rate");
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear() + 1,
      rate: "",
      effective_date: `${new Date().getFullYear() + 1}-01-01`,
      notes: ""
    });
    setEditData(null);
  };

  const formatRateDisplay = (rate: number) => {
    return `${(rate * 100).toFixed(1)}¢`;
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                IRS Mileage Rates
              </CardTitle>
              <CardDescription>
                Manage standard mileage rates for tax deductions
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : rates.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground">No IRS rates configured yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => {
                  const currentYear = new Date().getFullYear();
                  const isCurrent = rate.year === currentYear;
                  const isFuture = rate.year > currentYear;
                  
                  return (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.year}</TableCell>
                      <TableCell>
                        <span className="font-mono text-lg">{formatRateDisplay(rate.rate)}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          (${rate.rate.toFixed(4)}/mile)
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(rate.effective_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rate.notes || "-"}
                      </TableCell>
                      <TableCell>
                        {isCurrent && (
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        )}
                        {isFuture && (
                          <Badge variant="secondary">
                            Future
                          </Badge>
                        )}
                        {!isCurrent && !isFuture && (
                          <Badge variant="outline">
                            Historical
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rate)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rate)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
        setShowForm(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editData ? "Edit IRS Mileage Rate" : "Add IRS Mileage Rate"}
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
                    effective_date: `${e.target.value}-01-01`
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
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editData ? "Update" : "Add"} Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, rateId: null, year: 0 })}
        onConfirm={confirmDelete}
        title="Delete IRS Rate"
        description={`Are you sure you want to delete the IRS rate for year ${deleteConfirm.year}? This may affect mileage calculations.`}
        confirmText="Delete"
        isDestructive={true}
        loading={deleting}
      />
    </>
  );
}