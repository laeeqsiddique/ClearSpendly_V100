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
  Star,
  Shield
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

// Mobile-First Usage Limit Indicator
export function UsageLimitIndicator({ 
  feature,
  showDetails = true,
  compact = false 
}: { 
  feature: string; 
  showDetails?: boolean;
  compact?: boolean;
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

  const getBgColor = () => {
    if (percentage >= 100) return 'bg-red-50';
    if (percentage >= 90) return 'bg-orange-50';
    if (percentage >= 75) return 'bg-yellow-50';
    return 'bg-blue-50';
  };

  const getBorderColor = () => {
    if (percentage >= 100) return 'border-red-200';
    if (percentage >= 90) return 'border-orange-200';
    if (percentage >= 75) return 'border-yellow-200';
    return 'border-blue-200';
  };

  // Compact mobile view
  if (!showDetails || compact) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
        <div className="flex-1 min-w-0">
          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-2 sm:h-2.5" 
          />
        </div>
        <span className={cn("font-medium whitespace-nowrap", getStatusColor())}>
          {remaining > 0 ? `${remaining} left` : 'Limit reached'}
        </span>
      </div>
    );
  }

  // Mobile-first detailed view
  return (
    <Card className={cn(
      "border-l-4 transition-all duration-200 hover:shadow-md",
      getBorderColor().replace('border-', 'border-l-')
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          {/* Header with mobile-optimized layout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="font-medium text-sm sm:text-base text-gray-900">Usage Limit</span>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-medium px-2 py-1",
                  getStatusColor(),
                  getBgColor(),
                  getBorderColor()
                )}
              >
                {featureAccess.currentUsage}/{featureAccess.limit}
              </Badge>
              {percentage >= 90 && (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
            </div>
          </div>
          
          {/* Progress bar with enhanced mobile visibility */}
          <div className="space-y-2">
            <Progress 
              value={Math.min(percentage, 100)} 
              className="h-3 sm:h-2.5"
            />
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
              <span>{featureAccess.currentUsage} used</span>
              <span className="font-medium">
                {remaining > 0 ? `${remaining} remaining` : 'Limit reached'}
              </span>
            </div>
          </div>

          {/* Mobile-friendly upgrade prompt */}
          {percentage >= 85 && (
            <div className={cn("p-3 rounded-lg border", getBgColor(), getBorderColor())}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-900">
                  {percentage >= 100 ? 'Limit Reached' : 'Almost at Limit'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                {percentage >= 100 
                  ? 'Upgrade now to continue using this feature.' 
                  : "You're approaching your usage limit. Upgrade to get more capacity."
                }
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="w-full h-9 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium"
                  >
                    <Zap className="h-3 w-3 mr-2" />
                    Upgrade for More
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-auto">
                  <DialogHeader className="text-center">
                    <DialogTitle className="text-lg sm:text-xl">Upgrade Your Plan</DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                      You're approaching your usage limit for this feature.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Upgrade to a higher plan to get more capacity and unlock additional premium features.
                      </p>
                    </div>
                    <Button 
                      className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
                    >
                      View Plans <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile-First Feature Upgrade Prompt
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
    <Card className="border-dashed border-2 border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 sm:p-6 text-center">
        <div className="space-y-4 sm:space-y-5">
          {/* Mobile-optimized icon */}
          <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
          </div>
          
          {/* Mobile-friendly text layout */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
              {getFeatureDisplayName(feature)} Not Available
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed px-2 sm:px-0">
              This feature is not included in your current plan.
            </p>
          </div>

          {/* Mobile-optimized feature list */}
          {featureAccess.nextTierFeatures && featureAccess.nextTierFeatures.length > 0 && (
            <div className="text-left bg-white rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3 border border-gray-100 shadow-sm">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Unlock with upgrade:
              </h4>
              <div className="space-y-2">
                {featureAccess.nextTierFeatures.map((tierFeature, index) => (
                  <div key={index} className="flex items-start gap-2 sm:gap-3">
                    <div className="p-0.5 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-600 leading-relaxed">
                      {tierFeature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile-friendly upgrade button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                size="lg"
                className="w-full h-11 sm:h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md mx-auto">
              <DialogHeader className="text-center">
                <DialogTitle className="text-lg sm:text-xl">Upgrade Your Plan</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed px-2">
                  Unlock {getFeatureDisplayName(feature)} and more premium features
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <h4 className="font-medium text-gray-900">Premium Features</h4>
                  </div>
                  <div className="space-y-2">
                    {[
                      'Advanced AI processing capabilities',
                      'Custom branding and white-label options',
                      'Full API access and webhooks',
                      'Priority customer support',
                      'Advanced analytics and reporting'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-full flex-shrink-0 mt-2"></div>
                        <span className="text-sm text-gray-600 leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Mobile-stacked buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-11 border-2 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Learn More
                  </Button>
                  <Button 
                    className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
                  >
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

// Mobile-First Feature Preview Component
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
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-md",
      !hasAccess && "opacity-75"
    )}>
      {!hasAccess && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center p-4">
          <div className="text-center space-y-3 max-w-xs">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-gray-500" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Upgrade to unlock</p>
              <p className="text-xs text-gray-500 leading-relaxed">This feature is available in higher plans</p>
            </div>
            <Button 
              size="sm" 
              className="h-9 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
            >
              <Crown className="h-3 w-3 mr-2" />
              View Plans
            </Button>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          {title}
          {!hasAccess && <Lock className="h-4 w-4 text-gray-400" />}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        {previewContent}
      </CardContent>
    </Card>
  );
}