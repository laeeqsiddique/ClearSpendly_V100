"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Check, 
  Star, 
  Crown, 
  Zap,
  Sparkles
} from 'lucide-react';

interface PricingCardProps {
  plan: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    features: Record<string, any>;
    limits: Record<string, any>;
    is_featured: boolean;
  };
  isCurrentPlan: boolean;
  onUpgrade: (planId: string, billingCycle: 'monthly' | 'yearly', provider: 'stripe' | 'paypal') => void;
  loading: boolean;
  savings: number;
  savingsPercent: number;
}

export function PricingCard({ 
  plan, 
  isCurrentPlan, 
  onUpgrade, 
  loading,
  savings,
  savingsPercent
}: PricingCardProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showProviderChoice, setShowProviderChoice] = useState(false);

  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const monthlyPrice = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'free': return <Sparkles className="h-5 w-5" />;
      case 'pro': return <Zap className="h-5 w-5" />;
      case 'business': return <Star className="h-5 w-5" />;
      case 'enterprise': return <Crown className="h-5 w-5" />;
      default: return <Check className="h-5 w-5" />;
    }
  };

  const getPlanColor = (slug: string) => {
    switch (slug) {
      case 'free': return 'border-gray-200';
      case 'pro': return 'border-blue-200';
      case 'business': return 'border-purple-200 ring-2 ring-purple-100';
      case 'enterprise': return 'border-yellow-200';
      default: return 'border-gray-200';
    }
  };

  const formatFeatureValue = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  };

  const formatLimitValue = (key: string, value: any) => {
    if (value === -1) return 'Unlimited';
    if (key.includes('mb')) return `${value.toLocaleString()} MB`;
    return value.toLocaleString();
  };

  const getFeatureList = () => {
    const features = [];
    
    // Add limits as features
    if (plan.limits.receipts_per_month) {
      features.push({
        name: 'Monthly Receipts',
        value: formatLimitValue('receipts_per_month', plan.limits.receipts_per_month),
        included: true
      });
    }
    
    if (plan.limits.invoices_per_month) {
      features.push({
        name: 'Monthly Invoices',
        value: formatLimitValue('invoices_per_month', plan.limits.invoices_per_month),
        included: true
      });
    }

    if (plan.limits.storage_mb) {
      features.push({
        name: 'Storage Space',
        value: formatLimitValue('storage_mb', plan.limits.storage_mb),
        included: true
      });
    }

    if (plan.limits.users_max) {
      features.push({
        name: 'Team Members',
        value: formatLimitValue('users_max', plan.limits.users_max),
        included: true
      });
    }

    // Add feature toggles
    Object.entries(plan.features).forEach(([key, value]) => {
      const featureName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (typeof value === 'boolean') {
        features.push({
          name: featureName,
          value: null,
          included: value
        });
      } else if (value && value !== 'none') {
        features.push({
          name: featureName,
          value: formatFeatureValue(key, value),
          included: true
        });
      }
    });

    return features;
  };

  const handleUpgradeClick = () => {
    if (plan.slug === 'free') return; // Free plan doesn't need upgrade
    
    setShowProviderChoice(true);
  };

  const handleProviderSelect = (provider: 'stripe' | 'paypal') => {
    onUpgrade(plan.id, billingCycle, provider);
    setShowProviderChoice(false);
  };

  if (showProviderChoice) {
    return (
      <Card className={`relative ${getPlanColor(plan.slug)} h-full`}>
        <CardHeader className="text-center pb-8">
          <CardTitle className="flex items-center justify-center gap-2">
            {getPlanIcon(plan.slug)}
            {plan.name}
          </CardTitle>
          <CardDescription>Choose your payment method</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={() => handleProviderSelect('stripe')}
            disabled={loading}
          >
            Pay with Stripe
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleProviderSelect('paypal')}
            disabled={loading}
          >
            Pay with PayPal
          </Button>
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowProviderChoice(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative ${getPlanColor(plan.slug)} h-full flex flex-col`}>
      {plan.is_featured && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600">
          Most Popular
        </Badge>
      )}
      
      {isCurrentPlan && (
        <Badge className="absolute -top-3 right-4 bg-green-600">
          Current Plan
        </Badge>
      )}

      <CardHeader className="text-center pb-8">
        <CardTitle className="flex items-center justify-center gap-2">
          {getPlanIcon(plan.slug)}
          {plan.name}
        </CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        
        <div className="space-y-4">
          {/* Billing Toggle */}
          {plan.price_yearly > 0 && (
            <div className="flex items-center justify-center gap-4">
              <span className={billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}>
                Monthly
              </span>
              <Switch
                checked={billingCycle === 'yearly'}
                onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
              />
              <span className={billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}>
                Yearly
              </span>
            </div>
          )}

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">${monthlyPrice.toFixed(0)}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            
            {billingCycle === 'yearly' && plan.price_yearly > 0 && (
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Billed ${price}/year
                </p>
                {savingsPercent > 0 && (
                  <Badge variant="secondary" className="mt-1">
                    Save {savingsPercent}% (${savings.toFixed(0)}/year)
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Features List */}
        <div className="space-y-3 flex-1">
          {getFeatureList().map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              {feature.included ? (
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <div className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className={feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}>
                  {feature.name}
                </span>
                {feature.value && (
                  <span className="ml-2 text-sm font-medium text-blue-600">
                    {feature.value}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Action Button */}
        <div className="pt-4">
          {plan.slug === 'free' ? (
            <Button variant="outline" disabled className="w-full">
              Current Plan
            </Button>
          ) : isCurrentPlan ? (
            <Button variant="outline" disabled className="w-full">
              Current Plan
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={handleUpgradeClick}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Upgrade to ' + plan.name}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}