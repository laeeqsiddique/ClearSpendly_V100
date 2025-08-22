"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Info, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ManualAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  onAdjustmentApplied: () => void;
}

interface AdjustmentForm {
  type: 'credit' | 'discount' | 'extension' | 'plan_change';
  amount?: number;
  percentage?: number;
  extensionDays?: number;
  newPlanId?: string;
  description: string;
  reason: string;
  applyImmediately: boolean;
}

export function ManualAdjustmentDialog({
  open,
  onOpenChange,
  tenantId,
  onAdjustmentApplied
}: ManualAdjustmentDialogProps) {
  const [formData, setFormData] = useState<AdjustmentForm>({
    type: 'credit',
    description: '',
    reason: '',
    applyImmediately: true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId) return;

    try {
      setLoading(true);

      const response = await fetch('/api/admin/subscriptions/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          ...formData
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Manual adjustment applied successfully!');
        onAdjustmentApplied();
        onOpenChange(false);
        
        // Reset form
        setFormData({
          type: 'credit',
          description: '',
          reason: '',
          applyImmediately: true
        });
      } else {
        toast.error(data.error || 'Failed to apply adjustment');
      }
    } catch (error) {
      console.error('Error applying adjustment:', error);
      toast.error('Failed to apply adjustment');
    } finally {
      setLoading(false);
    }
  };

  const getAdjustmentPreview = () => {
    switch (formData.type) {
      case 'credit':
        return {
          title: 'Account Credit',
          description: `Add $${formData.amount || 0} credit to the account`,
          impact: 'The credit will be applied to future invoices automatically.',
          icon: <DollarSign className="h-5 w-5 text-green-600" />
        };
      case 'discount':
        return {
          title: 'Discount',
          description: formData.percentage 
            ? `Apply ${formData.percentage}% discount` 
            : `Apply $${formData.amount || 0} discount`,
          impact: 'The discount will be applied to the next billing cycle.',
          icon: <CheckCircle className="h-5 w-5 text-blue-600" />
        };
      case 'extension':
        return {
          title: 'Billing Extension',
          description: `Extend billing cycle by ${formData.extensionDays || 0} days`,
          impact: 'The next billing date will be postponed accordingly.',
          icon: <Info className="h-5 w-5 text-purple-600" />
        };
      case 'plan_change':
        return {
          title: 'Plan Change',
          description: 'Manually change subscription plan',
          impact: 'The plan change will take effect immediately or at next billing cycle.',
          icon: <AlertTriangle className="h-5 w-5 text-orange-600" />
        };
      default:
        return {
          title: 'Manual Adjustment',
          description: 'Select an adjustment type',
          impact: '',
          icon: <Info className="h-5 w-5 text-gray-600" />
        };
    }
  };

  const preview = getAdjustmentPreview();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manual Subscription Adjustment</DialogTitle>
          <DialogDescription>
            Apply manual adjustments to subscription billing or plan details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label htmlFor="adjustment-type">Adjustment Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: AdjustmentForm['type']) => 
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Account Credit</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="extension">Billing Extension</SelectItem>
                <SelectItem value="plan_change">Plan Change</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          {formData.type === 'credit' && (
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Credit Amount ($)</Label>
              <Input
                id="credit-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || undefined
                })}
                placeholder="0.00"
              />
            </div>
          )}

          {formData.type === 'discount' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount-amount">Fixed Amount ($)</Label>
                <Input
                  id="discount-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || undefined,
                    percentage: undefined
                  })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-percentage">Or Percentage (%)</Label>
                <Input
                  id="discount-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.percentage || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    percentage: parseFloat(e.target.value) || undefined,
                    amount: undefined
                  })}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {formData.type === 'extension' && (
            <div className="space-y-2">
              <Label htmlFor="extension-days">Extension Days</Label>
              <Input
                id="extension-days"
                type="number"
                min="1"
                value={formData.extensionDays || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  extensionDays: parseInt(e.target.value) || undefined
                })}
                placeholder="30"
              />
            </div>
          )}

          {formData.type === 'plan_change' && (
            <div className="space-y-2">
              <Label htmlFor="new-plan">New Plan</Label>
              <Select 
                value={formData.newPlanId || ''} 
                onValueChange={(value) => setFormData({ ...formData, newPlanId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter Plan</SelectItem>
                  <SelectItem value="professional">Professional Plan</SelectItem>
                  <SelectItem value="enterprise">Enterprise Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the adjustment"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Adjustment</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Detailed reason for this manual adjustment..."
              rows={3}
              required
            />
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {preview.icon}
                Adjustment Preview
              </CardTitle>
              <CardDescription>
                Review the changes before applying
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">{preview.title}</h4>
                <p className="text-sm text-muted-foreground">{preview.description}</p>
                {preview.impact && (
                  <p className="text-xs text-blue-600">{preview.impact}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Manual adjustments will be logged and auditable. Ensure you have proper authorization 
              for this adjustment. This action cannot be undone automatically.
            </AlertDescription>
          </Alert>

          {/* Apply Immediately Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="apply-immediately"
              checked={formData.applyImmediately}
              onChange={(e) => setFormData({ 
                ...formData, 
                applyImmediately: e.target.checked 
              })}
              className="rounded"
            />
            <Label htmlFor="apply-immediately" className="text-sm">
              Apply immediately (otherwise will apply at next billing cycle)
            </Label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.description || !formData.reason}
              className="flex-1"
            >
              {loading ? 'Applying...' : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}