"use client";

import { useState } from "react";
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
  Star
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
    <div className={cn("space-y-6", className)}>
      {/* Billing toggle */}
      <div className="flex items-center justify-center space-x-4">
        <span className={cn("text-sm font-medium", !isYearly ? "text-purple-600" : "text-gray-500")}>
          Monthly
        </span>
        <Switch
          checked={isYearly}
          onCheckedChange={setIsYearly}
          className="data-[state=checked]:bg-purple-600"
        />
        <span className={cn("text-sm font-medium", isYearly ? "text-purple-600" : "text-gray-500")}>
          Yearly
          <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
            Save up to 17%
          </Badge>
        </span>
      </div>

      {/* Trial information */}
      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Free Trial Available</span>
        </div>
        <p className="text-xs text-blue-600">
          Start with a 14-day free trial on Pro and Enterprise plans. No credit card required.
        </p>
      </div>

      {/* Test mode indicator */}
      {isTestMode && (
        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Test Mode Active</span>
          </div>
          <p className="text-xs text-orange-600">
            This is a development environment. No real payments will be processed.
          </p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = getPrice(plan);
          const savings = getSavings(plan);
          const isSelected = selectedPlanId === plan.id;
          const isPaidPlan = plan.monthlyPrice > 0;
          
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-all duration-200 hover:shadow-lg",
                isSelected && "ring-2 ring-purple-500",
                plan.popular && "border-purple-200 shadow-md"
              )}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-2">
                  {plan.icon}
                  <CardTitle className="ml-2 text-xl">{plan.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                
                {/* Pricing */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">${price}</span>
                    {isPaidPlan && (
                      <span className="text-gray-500 ml-2">
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
              </CardHeader>

              <CardContent className="space-y-3">
                {plan.features.slice(0, 6).map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className={cn(
                        "text-sm",
                        feature.included ? "text-gray-900" : "text-gray-400 line-through"
                      )}>
                        {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
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

              <CardFooter className="flex flex-col gap-2">
                {isPaidPlan && plan.trialDays && onStartTrial ? (
                  <>
                    <Button
                      onClick={() => handleStartTrial(plan.id)}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Start Free Trial
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePlanSelect(plan.id)}
                      className="w-full"
                    >
                      Select Plan
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handlePlanSelect(plan.id)}
                    variant={isSelected ? "secondary" : plan.popular ? "default" : "outline"}
                    className={cn(
                      "w-full",
                      plan.popular && !isSelected && "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    )}
                  >
                    {isSelected ? "Selected" : plan.monthlyPrice === 0 ? "Get Started Free" : "Select Plan"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Feature comparison toggle */}
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => setSelectedFeatureComparison(!selectedFeatureComparison)}
          className="text-purple-600 hover:text-purple-700"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          {selectedFeatureComparison ? "Hide" : "Show"} Feature Comparison
        </Button>
      </div>

      {/* Feature comparison table */}
      {selectedFeatureComparison && (
        <FeatureComparisonTable plans={plans} />
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Feature Comparison
        </CardTitle>
        <CardDescription>
          Compare all features across different plans
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 pr-4">Feature</th>
              {plans.map(plan => (
                <th key={plan.id} className="text-center py-3 px-4 min-w-[120px]">
                  <div className="flex items-center justify-center gap-2">
                    {plan.icon}
                    <span className="font-medium">{plan.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allFeatures.map((featureName) => (
              <tr key={featureName} className="border-b last:border-b-0">
                <td className="py-3 pr-4 text-sm font-medium">{featureName}</td>
                {plans.map(plan => {
                  const feature = plan.features.find(f => f.name === featureName);
                  return (
                    <td key={plan.id} className="py-3 px-4 text-center">
                      {feature?.included ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}