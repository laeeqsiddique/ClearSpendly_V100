"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Check, 
  Sparkles, 
  Zap, 
  Shield,
  Clock,
  CheckCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimplePlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  popular?: boolean;
  features: string[];
  trialDays?: number;
  icon: React.ReactNode;
}

interface SimplePlanSelectionProps {
  plans: SimplePlan[];
  selectedPlanId?: string;
  onPlanSelect: (planId: string) => void;
  loading?: boolean;
  className?: string;
}

export function SimplePlanSelection({
  plans,
  selectedPlanId,
  onPlanSelect,
  loading = false,
  className
}: SimplePlanSelectionProps) {

  return (
    <div className={cn("space-y-6", className)}>
      {/* Trust indicator */}
      <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">14-Day Free Trial</span>
        </div>
        <p className="text-sm text-green-600">
          Start free, no credit card required. Cancel anytime.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const isPaidPlan = plan.monthlyPrice > 0;
          
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-all duration-300 hover:shadow-lg cursor-pointer",
                "border-2 min-h-[400px] flex flex-col",
                isSelected && "border-purple-500 shadow-lg scale-[1.02]",
                !isSelected && "border-gray-200 hover:border-purple-300",
                plan.popular && "ring-2 ring-purple-200 shadow-md"
              )}
              onClick={() => onPlanSelect(plan.id)}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 shadow-md">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4 flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {plan.icon && (
                    React.cloneElement(plan.icon as React.ReactElement, { 
                      className: "w-7 h-7 text-purple-600" 
                    })
                  )}
                </div>
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                
                {/* Pricing */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.monthlyPrice}
                    </span>
                    {isPaidPlan && (
                      <span className="text-gray-500 ml-2">/month</span>
                    )}
                  </div>
                  
                </div>
              </CardHeader>

              <CardContent className="flex-grow flex flex-col">
                {/* Features */}
                <div className="space-y-3 flex-grow mb-8">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="p-1 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Selection button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlanSelect(plan.id);
                  }}
                  disabled={loading}
                  className={cn(
                    "group relative w-full h-14 text-base font-semibold transition-all duration-300 overflow-hidden mt-auto",
                    "transform hover:scale-[1.02] active:scale-[0.98]",
                    isSelected 
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                      : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
                    !isSelected && "text-white shadow-lg hover:shadow-xl",
                    plan.popular && !isSelected && "ring-2 ring-purple-300 shadow-xl hover:shadow-2xl"
                  )}
                >
                  {/* Animated background shimmer */}
                  <div className="absolute inset-0 -top-10 -bottom-10 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  {/* Button content */}
                  <div className="relative flex items-center justify-center gap-3">
                    {loading && selectedPlanId === plan.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : isSelected ? (
                      <>
                        <CheckCircle className="w-5 h-5 group-hover:animate-pulse" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        {plan.monthlyPrice === 0 ? (
                          <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                        ) : plan.name === 'Pro' ? (
                          <Zap className="w-5 h-5 group-hover:animate-pulse" />
                        ) : (
                          <Shield className="w-5 h-5 group-hover:animate-pulse" />
                        )}
                        <span>{plan.monthlyPrice === 0 ? "Start Free" : "Get Started"}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </div>
                  
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/10 to-white/5"></div>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security indicators */}
      <div className="flex flex-wrap justify-center items-center gap-8 pt-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Bank-level Security</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Cancel Anytime</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>No Hidden Fees</span>
        </div>
      </div>
    </div>
  );
}