"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  Loader2,
  Receipt,
  Car,
  FileText,
  Zap,
  Shield,
  Clock,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  features: string[];
  trialDays?: number;
  icon: React.ReactNode;
}

export default function SimpleOnboarding() {
  const [currentStep, setCurrentStep] = useState<"welcome" | "plan">("welcome");
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [userTenant, setUserTenant] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  // Fetch plans from Polar API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        console.log('Fetching plans from Polar API...');
        const response = await fetch('/api/plans/live');
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.success && data.plans) {
          // Transform to simple plan format - show all 3 plans
          const simplePlans = data.plans.map((plan: any) => {
            // Define features to exclude based on plan
            let excludedFeatures = [
              'Email support',
              'Advanced features'
            ];
            
            // Additional exclusions for specific plans
            if (plan.name === 'Free') {
              excludedFeatures.push('Team collaboration');
            }
            
            if (plan.name === 'Pro') {
              excludedFeatures.push('API access', 'Multi-user support', 'Team collaboration');
            }
            
            if (plan.name === 'Business') {
              excludedFeatures.push('Custom integrations', 'Priority support', 'Training sessions', 'Dedicated account manager');
            }
            
            const filteredFeatures = plan.features?.filter((f: any) => 
              f.included && !excludedFeatures.includes(f.name)
            ).map((f: any) => f.name) || [];
            
            console.log('Processing plan:', plan.name, 'polarProductId:', plan.polarProductId);
            
            return {
              id: plan.polarProductId,
              name: plan.name === 'Business' ? 'Multi-User' : plan.name,
              description: plan.description,
              monthlyPrice: plan.monthlyPrice,
              yearlyPrice: plan.yearlyPrice,
              popular: plan.popular,
              trialDays: 0, // No trials
              features: filteredFeatures,
              icon: plan.name === 'Free' ? <Sparkles className="w-5 h-5" /> : 
                    plan.name === 'Pro' ? <Zap className="w-5 h-5" /> : 
                    <Shield className="w-5 h-5" />
            };
          });
          
          setAvailablePlans(simplePlans);
          console.log(`✅ Loaded ${simplePlans.length} plans from Polar:`, simplePlans.map(p => p.name));
        } else {
          console.log('❌ API response invalid:', data);
          throw new Error('Invalid API response');
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        // Fallback plans - all 3 plans
        setAvailablePlans([
          {
            id: "free",
            name: "Free",
            description: "Perfect for getting started",
            monthlyPrice: 0,
            yearlyPrice: 0,
            icon: <Sparkles className="w-5 h-5" />,
            features: ["3 receipts per month", "3 invoices per month", "Basic OCR processing", "Dashboard analytics"]
          },
          {
            id: "pro",
            name: "Pro", 
            description: "Everything you need for business",
            monthlyPrice: 24.99,
            yearlyPrice: 249.99,
            popular: true,
            icon: <Zap className="w-5 h-5" />,
            features: ["Unlimited receipts", "Advanced OCR with AI", "Receipt image storage", "Advanced analytics", "Single user"]
          },
          {
            id: "business",
            name: "Multi-User",
            description: "Everything in the Pro plus Multi-User Plan for up to 5 users",
            monthlyPrice: 36.99,
            yearlyPrice: 369.99,
            icon: <Shield className="w-5 h-5" />,
            features: ["Everything in Pro", "Up to 5 team members", "Team collaboration"]
          }
        ]);
      } finally {
        setPlansLoading(false);
      }
    };
    
    fetchPlans();
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Get tenant if exists
      const { data: memberships } = await supabase
        .from('membership')
        .select('*, tenant(*)')
        .eq('user_id', user.id);
      
      if (memberships && memberships.length > 0) {
        setUserTenant(memberships[0].tenant);
      }
    };

    checkUser();
  }, [supabase, router]);

  const handleWelcomeNext = () => {
    if (!businessName.trim()) {
      toast.error("Please enter your business name to continue");
      return;
    }
    setCurrentStep("plan");
  };

  const handlePlanSelect = async (planId: string) => {
    console.log('handlePlanSelect called with planId:', planId);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Save business info
      await supabase.auth.updateUser({
        data: { 
          business_name: businessName,
          onboarding_step: 'plan_selected'
        }
      });

      if (planId === "free") {
        // Complete setup for free plan
        await completeOnboarding(planId);
      } else {
        // Direct purchase for paid plans - no trials since Free plan exists
        await startPaidPlan(planId);
      }
    } catch (error) {
      console.error('Plan selection error:', error);
      toast.error('Failed to select plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startPaidPlan = async (planId: string) => {
    console.log('startPaidPlan called with planId:', planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Ensure tenant exists before checkout
      let tenantId = userTenant?.id;
      if (!tenantId) {
        console.log('No tenant found, setting up tenant...');
        const setupResponse = await fetch('/api/setup-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!setupResponse.ok) {
          const errorData = await setupResponse.json();
          throw new Error(errorData.error || 'Failed to setup account');
        }

        const setupData = await setupResponse.json();
        tenantId = setupData.data?.tenant?.id;
        setUserTenant(setupData.data?.tenant);
        
        console.log('Tenant setup completed:', tenantId);
        
        // Add a small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!tenantId) {
        throw new Error('Failed to get tenant ID after setup');
      }

      console.log('Creating checkout session for tenant:', tenantId, 'plan:', planId);
      
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          plan_id: planId,
          billing_cycle: 'monthly',
          trial_mode: false,
          success_url: window.location.origin + '/dashboard?welcome=true',
          cancel_url: window.location.origin + '/onboarding'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Checkout API error:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      console.log('Checkout response:', data);
      
      if (data.success && data.checkout_url) {
        // Redirect to Polar checkout for payment
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Paid plan start error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start paid plan');
    }
  };

  const completeOnboarding = async (planId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Setup tenant if needed
      if (!userTenant) {
        const setupResponse = await fetch('/api/setup-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!setupResponse.ok) {
          const errorData = await setupResponse.json();
          throw new Error(errorData.error || 'Failed to setup account');
        }
      }

      // Mark onboarding complete
      await supabase.auth.updateUser({
        data: { 
          onboarding_completed: true,
          selected_plan: planId,
          business_name: businessName,
          onboarding_completed_at: new Date().toISOString()
        }
      });

      // Refresh session and redirect
      await supabase.auth.refreshSession();
      toast.success('Welcome to ClearSpendly! 🎉');
      
      setTimeout(() => {
        window.location.href = '/dashboard?welcome=true';
      }, 1000);

    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error('Failed to complete setup. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress indicator */}
        <div className="flex justify-center items-center mb-8">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              currentStep === "welcome" ? "bg-purple-600 text-white" : "bg-green-500 text-white"
            )}>
              {currentStep === "plan" ? <CheckCircle className="w-4 h-4" /> : "1"}
            </div>
            <div className={cn(
              "w-16 h-0.5 transition-colors",
              currentStep === "plan" ? "bg-green-500" : "bg-gray-300"
            )} />
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              currentStep === "plan" ? "bg-purple-600 text-white" : "bg-gray-300 text-gray-600"
            )}>
              2
            </div>
          </div>
        </div>

        {/* Welcome Step */}
        {currentStep === "welcome" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="max-w-2xl mx-auto border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Welcome to ClearSpendly
                </CardTitle>
                <p className="text-lg text-gray-600 mt-2">
                  Smart expense tracking made simple
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Key features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20">
                    <Receipt className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">Smart OCR</h3>
                    <p className="text-sm text-gray-600">AI-powered receipt scanning</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20">
                    <Car className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">Mileage Tracking</h3>
                    <p className="text-sm text-gray-600">Automatic deductions</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-950/20">
                    <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">Invoicing</h3>
                    <p className="text-sm text-gray-600">Professional billing</p>
                  </div>
                </div>

                {/* Business name input */}
                <div className="space-y-3">
                  <Label htmlFor="businessName" className="text-base font-medium">
                    What's your business name?
                  </Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter your business name"
                    className="h-12 text-base border-2 focus:border-purple-500"
                    autoComplete="organization"
                    autoFocus
                  />
                  <p className="text-sm text-gray-500">
                    We'll use this to personalize your experience
                  </p>
                </div>

                {/* Continue button */}
                <Button
                  onClick={handleWelcomeNext}
                  disabled={!businessName.trim() || loading}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-gray-500">
                  Takes less than 2 minutes • No credit card required
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Plan Selection Step */}
        {currentStep === "plan" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Choose Your Plan
              </h1>
              <p className="text-lg text-gray-600">
                Start free or choose a paid plan. Upgrade anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {plansLoading ? (
                // Loading skeleton
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-96 animate-pulse">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded w-20 mx-auto mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                availablePlans.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative transition-all duration-300 hover:shadow-lg cursor-pointer border-2 flex flex-col h-full min-h-[500px]",
                    selectedPlan === plan.id ? "border-purple-500 shadow-lg" : "border-gray-200 hover:border-purple-300",
                    plan.popular && "scale-105 shadow-lg"
                  )}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      {plan.icon && (
                        React.cloneElement(plan.icon as React.ReactElement, { 
                          className: "w-6 h-6 text-purple-600" 
                        })
                      )}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                    
                    <div className="mt-4">
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold text-gray-900">
                          ${plan.monthlyPrice}
                        </span>
                        {plan.monthlyPrice > 0 && (
                          <span className="text-gray-500 ml-2">/month</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-grow flex flex-col">
                    <div className="space-y-3 flex-grow mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="p-0.5 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => handlePlanSelect(plan.id)}
                      disabled={loading}
                      className={cn(
                        "group relative w-full h-14 text-base font-semibold transition-all duration-300 overflow-hidden",
                        "transform hover:scale-[1.02] active:scale-[0.98]",
                        "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
                        "text-white shadow-lg hover:shadow-xl",
                        plan.popular && "ring-2 ring-purple-300 shadow-xl hover:shadow-2xl"
                      )}
                    >
                      {/* Animated background shimmer */}
                      <div className="absolute inset-0 -top-10 -bottom-10 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      {/* Button content */}
                      <div className="relative flex items-center justify-center gap-3">
                        {loading && selectedPlan === plan.id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Processing...</span>
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
                ))
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 mt-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>No Setup Fees</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}