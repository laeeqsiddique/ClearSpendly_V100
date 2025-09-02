"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Zap, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle,
  Star,
  ArrowRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface TrialStatus {
  isTrial: boolean;
  trialEnd: string | null;
  daysRemaining: number;
  hasExpired: boolean;
  canConvert: boolean;
}

interface SubscriptionInfo {
  id: string;
  plan_name: string;
  status: string;
  current_period_end: string;
  usage_counts: Record<string, number>;
  limits: Record<string, number>;
}

interface TrialConversionBannerProps {
  tenantId: string;
  className?: string;
  onDismiss?: () => void;
  collapsed?: boolean;
}

export function TrialConversionBanner({ 
  tenantId, 
  className,
  onDismiss,
  collapsed = false
}: TrialConversionBannerProps) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (tenantId && !dismissed) {
      fetchTrialStatus();
    }
  }, [tenantId, dismissed]);

  const fetchTrialStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/subscriptions/trial-status?tenant_id=${tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        setTrialStatus(data.trial_status);
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertTrial = async () => {
    if (!trialStatus?.canConvert || !subscription) return;
    
    try {
      setConverting(true);
      
      // Create conversion checkout session
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          plan_id: subscription.plan_name.toLowerCase(),
          billing_cycle: 'monthly',
          convert_trial: true,
          success_url: `${window.location.origin}/dashboard?conversion=success`,
          cancel_url: `${window.location.origin}/dashboard?conversion=cancelled`
        })
      });

      const data = await response.json();
      
      if (data.success && data.checkout_url) {
        // Redirect to Polar checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      
    } catch (error) {
      console.error('Error converting trial:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to convert trial');
    } finally {
      setConverting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (loading || dismissed) {
    return null;
  }

  if (!trialStatus?.isTrial || trialStatus.hasExpired) {
    return null;
  }

  // Determine urgency and styling
  const isUrgent = trialStatus.daysRemaining <= 3;
  const isCritical = trialStatus.daysRemaining <= 1;

  if (collapsed) {
    return (
      <Card className={cn(
        "border-l-4 shadow-sm",
        isCritical ? "border-l-red-500 bg-red-50" : 
        isUrgent ? "border-l-orange-500 bg-orange-50" : 
        "border-l-purple-500 bg-purple-50",
        className
      )}>
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Clock className={cn(
              "w-4 h-4",
              isCritical ? "text-red-600" : 
              isUrgent ? "text-orange-600" : 
              "text-purple-600"
            )} />
            <span className="text-sm font-medium">
              Trial ends in {trialStatus.daysRemaining} day{trialStatus.daysRemaining !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleConvertTrial}
              size="sm"
              className="h-8 px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={converting}
            >
              {converting ? "Converting..." : "Upgrade"}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert className={cn(
      "border-2",
      isCritical ? "border-red-300 bg-red-50" : 
      isUrgent ? "border-orange-300 bg-orange-50" : 
      "border-purple-300 bg-purple-50",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            "p-2 rounded-full",
            isCritical ? "bg-red-100" : 
            isUrgent ? "bg-orange-100" : 
            "bg-purple-100"
          )}>
            {isCritical ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <Clock className={cn(
                "w-5 h-5",
                isUrgent ? "text-orange-600" : "text-purple-600"
              )} />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={cn(
                "font-semibold",
                isCritical ? "text-red-900" : 
                isUrgent ? "text-orange-900" : 
                "text-purple-900"
              )}>
                {isCritical ? "Trial Expiring Tomorrow!" : 
                 isUrgent ? "Trial Expiring Soon" : 
                 "Free Trial Active"}
              </h3>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  isCritical ? "bg-red-200 text-red-800" : 
                  isUrgent ? "bg-orange-200 text-orange-800" : 
                  "bg-purple-200 text-purple-800"
                )}
              >
                {trialStatus.daysRemaining} day{trialStatus.daysRemaining !== 1 ? 's' : ''} left
              </Badge>
            </div>
            
            <AlertDescription className={cn(
              "mb-4",
              isCritical ? "text-red-800" : 
              isUrgent ? "text-orange-800" : 
              "text-purple-800"
            )}>
              {isCritical ? (
                <>
                  Your trial expires tomorrow! Convert now to keep access to all {subscription?.plan_name} features 
                  and avoid any service interruption.
                </>
              ) : isUrgent ? (
                <>
                  Your {subscription?.plan_name} trial expires in {trialStatus.daysRemaining} days. 
                  Convert now to continue with premium features.
                </>
              ) : (
                <>
                  You're currently on a {subscription?.plan_name} trial with full access to premium features. 
                  Convert anytime before your trial ends.
                </>
              )}\n            </AlertDescription>

            {/* Usage preview */}
            {subscription?.usage_counts && subscription?.limits && (\n              <div className=\"mb-4\">\n                <p className=\"text-sm font-medium mb-2 text-gray-700\">Current Usage:</p>\n                <div className=\"grid grid-cols-2 md:grid-cols-4 gap-2\">\n                  {Object.entries(subscription.limits).slice(0, 4).map(([key, limit]) => {\n                    const used = subscription.usage_counts[key] || 0;\n                    const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;\n                    \n                    return (\n                      <div key={key} className=\"bg-white/50 p-2 rounded border\">\n                        <div className=\"text-xs text-gray-600 capitalize\">\n                          {key.replace('_', ' ')}\n                        </div>\n                        <div className=\"text-sm font-medium\">\n                          {used}/{limit === -1 ? '∞' : limit}\n                        </div>\n                        {limit > 0 && (\n                          <div className=\"w-full bg-gray-200 rounded-full h-1 mt-1\">\n                            <div \n                              className=\"bg-purple-500 h-1 rounded-full\" \n                              style={{ width: `${percentage}%` }}\n                            />\n                          </div>\n                        )}\n                      </div>\n                    );\n                  })}\n                </div>\n              </div>\n            )}\n          </div>\n        </div>\n        \n        <Button\n          onClick={handleDismiss}\n          variant=\"ghost\"\n          size=\"sm\"\n          className=\"h-6 w-6 p-0 text-gray-500 hover:text-gray-700\"\n        >\n          <X className=\"w-4 h-4\" />\n        </Button>\n      </div>\n      \n      <div className=\"flex items-center gap-3 mt-4\">\n        <Button\n          onClick={handleConvertTrial}\n          disabled={converting || !trialStatus.canConvert}\n          className={cn(\n            \"flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200\",\n            isCritical ? \"bg-red-600 hover:bg-red-700\" :\n            isUrgent ? \"bg-orange-600 hover:bg-orange-700\" :\n            \"bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700\"\n          )}\n        >\n          {converting ? (\n            <>Converting...</>\n          ) : (\n            <>\n              <CreditCard className=\"w-4 h-4\" />\n              Convert to Paid Plan\n              <ArrowRight className=\"w-4 h-4\" />\n            </>\n          )}\n        </Button>\n        \n        <div className=\"text-xs text-gray-600\">\n          <div className=\"flex items-center gap-1\">\n            <CheckCircle className=\"w-3 h-3 text-green-600\" />\n            No interruption to service\n          </div>\n          <div className=\"flex items-center gap-1 mt-1\">\n            <Star className=\"w-3 h-3 text-yellow-600\" />\n            Keep all your data and settings\n          </div>\n        </div>\n      </div>\n    </Alert>\n  );\n}"