"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { 
  Subscription,
  SUBSCRIPTION_CATEGORIES, 
  PAYMENT_METHODS 
} from "@/lib/types/subscription";

interface EditSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  subscription: Subscription | null;
}

export function EditSubscriptionDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  subscription
}: EditSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_name: '',
    amount: 0,
    frequency: 'monthly' as const,
    category: '',
    start_date: '',
    notes: '',
    payment_method: ''
  });

  // Update form data when subscription changes
  useEffect(() => {
    if (subscription) {
      setFormData({
        service_name: subscription.service_name,
        amount: subscription.amount,
        frequency: subscription.frequency,
        category: subscription.category || '',
        start_date: subscription.start_date,
        notes: subscription.notes || '',
        payment_method: subscription.payment_method || ''
      });
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subscription || !formData.service_name || formData.amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update subscription');
      }

      toast.success('Subscription updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Edit3 className="h-4 w-4 text-white" />
              </div>
              Edit Subscription
            </DialogTitle>
            <DialogDescription>
              Update your subscription details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Service Name */}
            <div className="space-y-2">
              <Label htmlFor="edit_service_name">
                Service Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit_service_name"
                placeholder="Netflix, Spotify, Office 365..."
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                required
              />
            </div>
            
            {/* Amount & Frequency Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit_amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  placeholder="9.99"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger id="edit_frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Category & Start Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit_category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="edit_category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_start_date">Start Date</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
            </div>
            
            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="edit_payment_method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger id="edit_payment_method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes (Optional)</Label>
              <Textarea
                id="edit_notes"
                placeholder="Additional information..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Update Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}