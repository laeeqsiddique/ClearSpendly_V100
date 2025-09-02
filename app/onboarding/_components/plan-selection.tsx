"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  X, 
  Sparkles, 
  Zap, 
  Shield, 
  Users, 
  BarChart3,
  Clock,
  Star,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  recommended?: boolean;
  features: Feature[];
  limitations?: string[];
  trialDays?: number;
  badge?: string;
  icon?: React.ReactNode;
}

interface Feature {
  name: string;
  included: boolean;
  description?: string;
}

interface PlanSelectionProps {
  plans?: Plan[];
  selectedPlanId?: string;
  onPlanSelect: (planId: string) => void;
  onStartTrial?: (planId: string) => void;
  isTestMode?: boolean;
  className?: string;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started with expense tracking",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: <Sparkles className="w-5 h-5" />,
    features: [
      { name: "10 receipts per month", included: true },
      { name: "OCR processing with AI fallback", included: true },
      { name: "Smart tagging & categorization", included: true },
      { name: "Dashboard analytics & insights", included: true },
      { name: "Excel/CSV export", included: true },
      { name: "Basic AI chat support", included: true },
      { name: "Receipt image storage", included: false },
      { name: "Advanced AI features", included: false },
      { name: "Team collaboration", included: false },
      { name: "API access", included: false }
    ]
  },
  {
    id: "pro",
    name: "Pro",
    description: "Everything you need for serious expense management",
    monthlyPrice: 15,
    yearlyPrice: 150, // 2 months free
    popular: true,
    recommended: true,
    trialDays: 14,
    badge: "Most Popular",
    icon: <Zap className="w-5 h-5" />,
    features: [
      { name: "Unlimited receipts", included: true },
      { name: "Everything in Free plan", included: true },
      { name: "Advanced AI chat with Mistral LLM", included: true },
      { name: "Receipt image storage", included: true },
      { name: "Priority support", included: true },
      { name: "Advanced analytics & trends", included: true },
      { name: "Team collaboration (5 members)", included: true },
      { name: "API access", included: true, description: "Coming soon" },
      { name: "Custom integrations", included: false },
      { name: "White-label options", included: false }
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Advanced features for larger teams and organizations",
    monthlyPrice: 49,
    yearlyPrice: 490, // 2 months free  
    badge: "Advanced",
    icon: <Shield className="w-5 h-5" />,
    features: [
      { name: "Everything in Pro plan", included: true },
      { name: "Unlimited team members", included: true },
      { name: "Advanced reporting & analytics", included: true },
      { name: "Custom integrations", included: true },
      { name: "SSO authentication", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "White-label options", included: true },
      { name: "Custom OCR training", included: true },
      { name: "Advanced security features", included: true },
      { name: "99.9% SLA guarantee", included: true }
    ]
  }
];

export function PlanSelection({
  plans = DEFAULT_PLANS,
  selectedPlanId,
  onPlanSelect,
  onStartTrial,
  isTestMode = false,
  className
}: PlanSelectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedFeatureComparison, setSelectedFeatureComparison] = useState(false);

  // Add icons to plans that don't have them
  const plansWithIcons = plans.map(plan => {
    if (plan.icon) return plan;
    
    // Assign default icons based on plan name
    let icon = <Sparkles className="w-5 h-5" />; // Default
    if (plan.name.toLowerCase().includes('pro')) {
      icon = <Zap className="w-5 h-5" />;
    } else if (plan.name.toLowerCase().includes('business') || plan.name.toLowerCase().includes('enterprise')) {
      icon = <Shield className="w-5 h-5" />;
    } else if (plan.name.toLowerCase().includes('free')) {
      icon = <Sparkles className="w-5 h-5" />;
    }
    
    return { ...plan, icon };
  });

  const handlePlanSelect = (planId: string) => {
    onPlanSelect(planId);
  };

  const handleStartTrial = (planId: string) => {
    if (onStartTrial) {
      onStartTrial(planId);
    } else {
      onPlanSelect(planId);
    }
  };

  const getPrice = (plan: Plan) => {
    return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getSavings = (plan: Plan) => {
    if (!isYearly || plan.monthlyPrice === 0) return 0;
    const yearlyTotal = plan.monthlyPrice * 12;
    return yearlyTotal - plan.yearlyPrice;
  };

  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      {/* Mobile-first billing toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 p-4 sm:p-0">
        <div className="flex items-center space-x-4">
          <span className={cn("text-sm font-medium transition-colors", !isYearly ? "text-purple-600" : "text-gray-500")}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-purple-600 scale-110 sm:scale-100"
          />
          <span className={cn("text-sm font-medium transition-colors", isYearly ? "text-purple-600" : "text-gray-500")}>
            Yearly
          </span>
        </div>
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 px-2 py-1">
          Save up to 17%
        </Badge>
      </div>

      {/* Mobile-optimized trial information */}
      <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Free Trial Available</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-blue-600 leading-relaxed">
          Start with a 14-day free trial on Pro and Enterprise plans. No credit card required.
        </p>
      </div>

      {/* Mobile-optimized test mode indicator */}
      {isTestMode && (
        <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Test Mode Active</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-orange-600 leading-relaxed">
            This is a development environment. No real payments will be processed.
          </p>
        </div>
      )}

      {/* Mobile-first responsive plan cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {plansWithIcons.map((plan) => {
          const price = getPrice(plan);
          const savings = getSavings(plan);
          const isSelected = selectedPlanId === plan.id;
          const isPaidPlan = plan.monthlyPrice > 0;
          
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1",
                "min-h-[420px] sm:min-h-[480px] flex flex-col",
                isSelected && "ring-2 ring-purple-500 shadow-lg",
                plan.popular && "border-purple-200 shadow-md scale-105 sm:scale-110 z-10"
              )}
            >
              {/* Mobile-optimized popular badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 text-xs sm:text-sm shadow-md">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4 flex-shrink-0">
                <div className="flex flex-col items-center mb-3">
                  {plan.icon && (
                    <div className="p-2 bg-purple-50 rounded-full mb-2">
                      {React.cloneElement(plan.icon as React.ReactElement, { className: "w-6 h-6 text-purple-600" })}
                    </div>
                  )}
                  <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
                </div>
                <CardDescription className="text-sm px-2 leading-relaxed">{plan.description}</CardDescription>
                
                {/* Mobile-optimized pricing */}
                <div className="mt-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline justify-center">
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900">${price}</span>
                      {isPaidPlan && (
                        <span className="text-gray-500 ml-2 text-sm">
                          /{isYearly ? "year" : "month"}
                        </span>
                      )}
                    </div>
                    
                    {savings > 0 && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                          Save ${savings}/year
                        </Badge>
                      </div>
                    )}
                    
                    {plan.trialDays && (
                      <p className="text-xs text-purple-600 mt-2">
                        {plan.trialDays}-day free trial
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 flex-grow">
                {plan.features.slice(0, 6).map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 py-1">
                    {feature.included ? (
                      <div className="p-0.5 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-0.5 bg-gray-100 rounded-full flex-shrink-0 mt-0.5">
                        <X className="h-3 w-3 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-sm leading-relaxed break-words",
                        feature.included ? "text-gray-900 font-medium" : "text-gray-400 line-through"
                      )}>
                        {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{feature.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {plan.features.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-purple-600"
                    onClick={() => setSelectedFeatureComparison(true)}
                  >
                    View all features
                  </Button>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 mt-auto pt-4">
                {isPaidPlan && plan.trialDays && onStartTrial ? (
                  <>
                    <Button
                      onClick={() => handleStartTrial(plan.id)}
                      className="w-full h-11 sm:h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 text-sm sm:text-base"
                      size="lg"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Start {plan.trialDays || 14}-Day FREE Trial
                    </Button>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-2">
                        No credit card required • Cancel anytime
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => handlePlanSelect(plan.id)}
                        className="text-xs text-purple-600 hover:text-purple-700 h-auto p-1"
                        disabled={isTestMode && plan.monthlyPrice > 0}
                      >
                        Skip trial and pay now
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    onClick={() => handlePlanSelect(plan.id)}
                    variant={isSelected ? "secondary" : plan.popular ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "w-full h-11 sm:h-12 transition-all duration-200 text-sm sm:text-base",
                      plan.popular && !isSelected && "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg",
                      isSelected && "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
                      !plan.popular && !isSelected && "border-2 hover:border-purple-300 hover:bg-purple-50"
                    )}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Selected
                      </>
                    ) : plan.monthlyPrice === 0 ? (
                      "Get Started Free"
                    ) : (
                      "Select Plan"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Mobile-friendly feature comparison toggle */}
      <div className="text-center pt-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedFeatureComparison(!selectedFeatureComparison)}
          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors h-11 px-6 text-sm sm:text-base"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          {selectedFeatureComparison ? "Hide" : "Show"} Feature Comparison
        </Button>
      </div>

      {/* Feature comparison table */}
      {selectedFeatureComparison && (
        <FeatureComparisonTable plans={plansWithIcons} />
      )}
    </div>
  );
}

interface FeatureComparisonTableProps {
  plans: Plan[];
}

function FeatureComparisonTable({ plans }: FeatureComparisonTableProps) {
  // Get all unique features
  const allFeatures = Array.from(
    new Set(plans.flatMap(plan => plan.features.map(f => f.name)))
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <BarChart3 className="w-5 h-5" />
          Feature Comparison
        </CardTitle>
        <CardDescription className="text-sm">
          Compare all features across different plans
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile view - stacked cards */}
        <div className="block sm:hidden space-y-4">
          {plans.map(plan => (
            <Card key={plan.id} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {plan.icon}
                  {plan.name}
                  {plan.popular && (
                    <Badge className="bg-purple-100 text-purple-700 text-xs">Popular</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allFeatures.map((featureName) => {
                  const feature = plan.features.find(f => f.name === featureName);
                  return (
                    <div key={featureName} className="flex items-center gap-3">
                      {feature?.included ? (
                        <div className="p-0.5 bg-green-100 rounded-full flex-shrink-0">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-0.5 bg-gray-100 rounded-full flex-shrink-0">
                          <X className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      <span className={cn(
                        "text-sm",
                        feature?.included ? "text-gray-900" : "text-gray-400"
                      )}>
                        {featureName}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop view - table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2">
                <th className="text-left py-4 pr-4 font-semibold">Feature</th>
                {plans.map(plan => (
                  <th key={plan.id} className="text-center py-4 px-4 min-w-[140px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        {plan.icon}
                        <span className="font-semibold">{plan.name}</span>
                      </div>
                      {plan.popular && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">Popular</Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((featureName, index) => (
                <tr key={featureName} className={cn(
                  "border-b last:border-b-0 hover:bg-gray-50 transition-colors",
                  index % 2 === 0 && "bg-gray-25"
                )}>
                  <td className="py-4 pr-4 text-sm font-medium text-gray-900">{featureName}</td>
                  {plans.map(plan => {
                    const feature = plan.features.find(f => f.name === featureName);
                    return (
                      <td key={plan.id} className="py-4 px-4 text-center">
                        {feature?.included ? (
                          <div className="inline-flex p-1 bg-green-100 rounded-full">
                            <Check className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="inline-flex p-1 bg-gray-100 rounded-full">
                            <X className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}