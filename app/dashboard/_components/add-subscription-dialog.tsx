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
import { TagInput } from '@/components/ui/tag-input';
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { 
  SubscriptionFormData, 
  PAYMENT_METHODS 
} from "@/lib/types/subscription";

interface AddSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddSubscriptionDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AddSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tagCategories, setTagCategories] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const [formData, setFormData] = useState<SubscriptionFormData>({
    service_name: '',
    amount: 0,
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    payment_method: '',
    tag_ids: []
  });

  // Load tag categories on mount
  useEffect(() => {
    const loadTagData = async () => {
      try {
        const response = await fetch('/api/tags/categories');
        if (response.ok) {
          const result = await response.json();
          setTagCategories(result.data || []);
        }
      } catch (error) {
        console.error('Error loading tag categories:', error);
      }
    };

    if (open) {
      loadTagData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.service_name || formData.amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // Include selected tag IDs in form data
      const submitData = {
        ...formData,
        tag_ids: selectedTags.map(tag => tag.id)
      };
      
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create subscription');
      }

      toast.success('Subscription added successfully!');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        service_name: '',
        amount: 0,
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
        payment_method: '',
        tag_ids: []
      });
      setSelectedTags([]);
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-white" />
              </div>
              Add New Subscription
            </DialogTitle>
            <DialogDescription>
              Track your recurring services and subscriptions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Service Name */}
            <div className="space-y-2">
              <Label htmlFor="service_name">
                Service Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="service_name"
                placeholder="Netflix, Spotify, Office 365..."
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                required
              />
            </div>
            
            {/* Amount & Frequency Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="9.99"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger id="frequency">
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
            
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            
            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <TagInput
                selectedTags={selectedTags}
                onTagsChange={(newTags) => {
                  setSelectedTags(newTags);
                  setFormData({ ...formData, tag_ids: newTags.map(tag => tag.id) });
                }}
                categories={tagCategories}
                placeholder="Add tags to categorize this subscription..."
              />
            </div>
            
            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger id="payment_method">
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
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
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
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}