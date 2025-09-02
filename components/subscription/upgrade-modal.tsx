"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Check, 
  X,
  Zap, 
  Shield, 
  Star,
  CreditCard,
  ArrowRight,
  Sparkles,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  recommended?: boolean;
  features: Array<{
    name: string;
    included: boolean;
    description?: string;
  }>;
  badge?: string;
  icon: React.ReactNode;
}

interface UpgradeModalProps {
  currentPlan: string;
  plans?: Plan[];
  onUpgrade: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: "pro",
    name: "Pro",
    description: "Everything you need for serious expense management",
    monthlyPrice: 15,
    yearlyPrice: 150,
    popular: true,
    recommended: true,
    badge: "Most Popular",
    icon: <Zap className="w-5 h-5" />,
    features: [
      { name: "Unlimited receipts", included: true },
      { name: "Advanced AI processing", included: true },
      { name: "Receipt image storage", included: true },
      { name: "Priority support", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Team collaboration (5 members)", included: true },
      { name: "API access", included: true },
      { name: "Custom integrations", included: false },
      { name: "White-label options", included: false }
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Advanced features for larger teams and organizations",
    monthlyPrice: 49,
    yearlyPrice: 490,
    badge: "Advanced",
    icon: <Shield className="w-5 h-5" />,
    features: [
      { name: "Everything in Pro plan", included: true },
      { name: "Unlimited team members", included: true },
      { name: "Advanced reporting", included: true },
      { name: "Custom integrations", included: true },
      { name: "SSO authentication", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "White-label options", included: true },
      { name: "Custom OCR training", included: true },
      { name: "99.9% SLA guarantee", included: true }
    ]
  }
];

export function UpgradeModal({
  currentPlan,
  plans = DEFAULT_PLANS,
  onUpgrade,
  isLoading = false,
  children
}: UpgradeModalProps) {
  const [isYearly, setIsYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showAllFeatures, setShowAllFeatures] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(false);

  // Filter out plans that are the same or lower than current plan
  const availablePlans = plans.filter(plan => {
    const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
    return planHierarchy[plan.id as keyof typeof planHierarchy] > planHierarchy[currentPlan as keyof typeof planHierarchy];
  });

  const handleUpgrade = (planId: string) => {
    onUpgrade(planId, isYearly ? 'yearly' : 'monthly');
    setIsOpen(false);
  };

  const getPrice = (plan: Plan) => {
    return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getSavings = (plan: Plan) => {
    if (!isYearly || plan.monthlyPrice === 0) return 0;
    const yearlyTotal = plan.monthlyPrice * 12;
    return yearlyTotal - plan.yearlyPrice;
  };

  const toggleFeatures = (planId: string) => {
    setShowAllFeatures(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b p-4 sm:p-6 z-10">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl sm:text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              Unlock premium features and get more out of ClearSpendly
            </DialogDescription>
          </DialogHeader>
          
          {/* Mobile-first billing toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-4">
            <div className="flex items-center space-x-4">
              <span className={cn(
                "text-sm font-medium transition-colors",
                !isYearly ? "text-purple-600" : "text-gray-500"
              )}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-purple-600 scale-110 sm:scale-100"
              />
              <span className={cn(
                "text-sm font-medium transition-colors",
                isYearly ? "text-purple-600" : "text-gray-500"
              )}>
                Yearly
              </span>
            </div>
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 px-2 py-1">
              Save up to 17%
            </Badge>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {availablePlans.length === 0 ? (
            <div className="text-center py-8">
              <Crown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                You're on the highest plan!
              </h3>
              <p className="text-gray-600">
                You already have access to all our premium features.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {availablePlans.map((plan) => {
                const price = getPrice(plan);
                const savings = getSavings(plan);
                const isSelected = selectedPlan === plan.id;
                const featuresShown = showAllFeatures[plan.id] ? plan.features : plan.features.slice(0, 6);
                
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1",
                      "flex flex-col",
                      isSelected && "ring-2 ring-purple-500 shadow-lg",
                      plan.popular && "border-purple-200 shadow-md scale-105 sm:scale-110 z-10"
                    )}
                  >
                    {/* Popular badge */}
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                        <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 text-xs sm:text-sm shadow-md">
                          {plan.badge}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4 flex-shrink-0">
                      <div className="flex flex-col items-center mb-3">
                        <div className="p-2 bg-purple-50 rounded-full mb-2">
                          {React.cloneElement(plan.icon as React.ReactElement, { className: "w-6 h-6 text-purple-600" })}
                        </div>
                        <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="text-sm px-2 leading-relaxed">
                        {plan.description}
                      </CardDescription>
                      
                      {/* Pricing */}
                      <div className="mt-4">
                        <div className="flex flex-col items-center">
                          <div className="flex items-baseline justify-center">
                            <span className="text-3xl sm:text-4xl font-bold text-gray-900">${price}</span>
                            <span className="text-gray-500 ml-2 text-sm">
                              /{isYearly ? "year" : "month"}
                            </span>
                          </div>
                          
                          {savings > 0 && (
                            <div className="mt-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                Save ${savings}/year
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 flex-grow">
                      {featuresShown.map((feature, index) => (
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
                              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                {feature.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {plan.features.length > 6 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          onClick={() => toggleFeatures(plan.id)}
                        >
                          {showAllFeatures[plan.id] ? (
                            <>
                              Show Less <ChevronUp className="w-3 h-3 ml-1" />
                            </>
                          ) : (
                            <>
                              Show All Features <ChevronDown className="w-3 h-3 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>

                    <div className="p-4 pt-0 mt-auto">
                      <Button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isLoading}
                        size="lg"
                        className={cn(
                          "w-full h-11 sm:h-12 transition-all duration-200 text-sm sm:text-base font-medium",
                          plan.popular 
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg"
                            : "border-2 hover:border-purple-300 hover:bg-purple-50 text-purple-700"
                        )}
                        variant={plan.popular ? "default" : "outline"}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Upgrade to {plan.name}
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Shield className="w-3 h-3" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Instant Access</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Star className="w-3 h-3" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}