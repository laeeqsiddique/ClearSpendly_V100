"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Lock, 
  Crown, 
  Zap, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  Star
} from 'lucide-react';
import { FeatureGatingContext, FeatureAccess, FeatureGateProps } from '@/lib/types/subscription';

// Feature Gating Context
const FeatureContext = createContext<FeatureGatingContext | null>(null);

export function FeatureGatingProvider({ 
  children, 
  planSlug, 
  planFeatures, 
  planLimits, 
  usage 
}: { 
  children: React.ReactNode;
  planSlug: string;
  planFeatures: Record<string, any>;
  planLimits: Record<string, any>;
  usage: Record<string, number>;
}) {
  const checkFeature = (feature: string): FeatureAccess => {
    const hasFeature = planFeatures[feature] === true;
    const limit = planLimits[feature];
    const currentUsage = usage[feature] || 0;
    
    if (hasFeature && (limit === -1 || limit === undefined)) {
      return {
        feature,
        allowed: true,
        upgradeRequired: false
      };
    }
    
    if (hasFeature && limit > 0) {
      return {
        feature,
        allowed: currentUsage < limit,
        limit,
        currentUsage,
        upgradeRequired: currentUsage >= limit
      };
    }
    
    return {
      feature,
      allowed: false,
      upgradeRequired: true,
      nextTierFeatures: getNextTierFeatures(feature)
    };
  };

  const canUseFeature = (feature: string): boolean => {
    return checkFeature(feature).allowed;
  };

  const getRemainingUsage = (feature: string): number => {
    const limit = planLimits[feature];
    const currentUsage = usage[feature] || 0;
    
    if (limit === -1 || limit === undefined) return -1;
    return Math.max(0, limit - currentUsage);
  };

  const getNextTierFeatures = (feature: string): string[] => {
    // This would be configured based on your plan hierarchy
    const tierFeatures: Record<string, string[]> = {
      'ai_processing': ['Advanced AI processing', 'Custom AI models', 'Bulk processing'],
      'custom_branding': ['Logo upload', 'Custom colors', 'White-label solution'],
      'api_access': ['REST API', 'Webhooks', 'Custom integrations'],
      'advanced_analytics': ['Custom reports', 'Data export', 'Real-time dashboards']
    };
    
    return tierFeatures[feature] || [];
  };

  const contextValue: FeatureGatingContext = {
    planSlug,
    planFeatures,
    planLimits,
    usage,
    checkFeature,
    canUseFeature,
    getRemainingUsage
  };

  return (
    <FeatureContext.Provider value={contextValue}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatureGating() {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatureGating must be used within a FeatureGatingProvider');
  }
  return context;
}

// Feature Gate Component
export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { checkFeature } = useFeatureGating();
  const featureAccess = checkFeature(feature);

  if (featureAccess.allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <FeatureUpgradePrompt 
      feature={feature}
      featureAccess={featureAccess}
    />
  );
}

// Usage Limit Indicator
export function UsageLimitIndicator({ 
  feature,
  showDetails = true 
}: { 
  feature: string; 
  showDetails?: boolean;
}) {
  const { checkFeature } = useFeatureGating();
  const featureAccess = checkFeature(feature);

  if (!featureAccess.limit || featureAccess.limit === -1) {
    return null;
  }

  const percentage = ((featureAccess.currentUsage || 0) / featureAccess.limit) * 100;
  const remaining = featureAccess.limit - (featureAccess.currentUsage || 0);

  const getStatusColor = () => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 90) return 'text-orange-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Progress value={Math.min(percentage, 100)} className="w-16 h-1" />
        <span className={getStatusColor()}>
          {remaining > 0 ? `${remaining} left` : 'Limit reached'}
        </span>
      </div>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Usage Limit</span>
            <Badge variant="outline" className={getStatusColor()}>
              {featureAccess.currentUsage}/{featureAccess.limit}
            </Badge>
          </div>
          
          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-2"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{featureAccess.currentUsage} used</span>
            <span>{remaining > 0 ? `${remaining} remaining` : 'Limit reached'}</span>
          </div>

          {percentage >= 85 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full mt-2">
                  <Zap className="h-3 w-3 mr-1" />
                  Upgrade for More
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upgrade Your Plan</DialogTitle>
                  <DialogDescription>
                    You're approaching your usage limit for this feature.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm">
                    Upgrade to a higher plan to get more capacity and unlock additional features.
                  </p>
                  <Button className="w-full">
                    View Plans <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Feature Upgrade Prompt
function FeatureUpgradePrompt({ 
  feature, 
  featureAccess 
}: { 
  feature: string; 
  featureAccess: FeatureAccess;
}) {
  const getFeatureDisplayName = (feature: string) => {
    const displayNames: Record<string, string> = {
      'ai_processing': 'AI Processing',
      'custom_branding': 'Custom Branding',
      'api_access': 'API Access',
      'advanced_analytics': 'Advanced Analytics',
      'priority_support': 'Priority Support',
      'unlimited_storage': 'Unlimited Storage'
    };
    
    return displayNames[feature] || feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="border-dashed border-2 border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardContent className="p-6 text-center">
        <div className="space-y-4">
          <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-purple-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {getFeatureDisplayName(feature)} Not Available
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This feature is not included in your current plan.
            </p>
          </div>

          {featureAccess.nextTierFeatures && featureAccess.nextTierFeatures.length > 0 && (
            <div className="text-left bg-white rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Unlock with upgrade:
              </h4>
              {featureAccess.nextTierFeatures.map((tierFeature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {tierFeature}
                </div>
              ))}
            </div>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upgrade Your Plan</DialogTitle>
                <DialogDescription>
                  Unlock {getFeatureDisplayName(feature)} and more premium features
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <h4 className="font-medium">Premium Features</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Advanced AI processing capabilities</li>
                    <li>• Custom branding and white-label options</li>
                    <li>• Full API access and webhooks</li>
                    <li>• Priority customer support</li>
                    <li>• Advanced analytics and reporting</li>
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    Learn More
                  </Button>
                  <Button className="flex-1">
                    Choose Plan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// Feature Preview Component
export function FeaturePreview({ 
  feature, 
  title, 
  description, 
  previewContent 
}: {
  feature: string;
  title: string;
  description: string;
  previewContent: React.ReactNode;
}) {
  const { canUseFeature } = useFeatureGating();
  const hasAccess = canUseFeature(feature);

  return (
    <Card className={`relative overflow-hidden ${!hasAccess ? 'opacity-75' : ''}`}>
      {!hasAccess && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Lock className="h-8 w-8 text-gray-500 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Upgrade to unlock</p>
            <Button size="sm">
              <Crown className="h-3 w-3 mr-1" />
              View Plans
            </Button>
          </div>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {!hasAccess && <Lock className="h-4 w-4 text-gray-500" />}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        {previewContent}
      </CardContent>
    </Card>
  );
}