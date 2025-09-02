"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  CreditCard,
  Building,
  CheckCircle,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Users,
  Target
} from "lucide-react";

import { ProgressTracker, ProgressBar, type OnboardingStep } from "./progress-tracker";
import { TestModeBanner, TestCreditCardHelper, QuickFillTestData, type TestCardData } from "./test-mode-banner";
import { PlanSelection, type Plan } from "./plan-selection";
import { BusinessSetupForm, type BusinessSetupFormData } from "./business-setup-form";

export const dynamic = 'force-dynamic';

interface EnhancedOnboardingProps {
  isTestMode?: boolean;
}

export default function EnhancedOnboarding({ isTestMode = process.env.NODE_ENV === 'development' }: EnhancedOnboardingProps) {
  const [currentStepId, setCurrentStepId] = useState("welcome");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [businessData, setBusinessData] = useState<Partial<BusinessSetupFormData>>({});
  const [loading, setLoading] = useState(false);
  const [userTenant, setUserTenant] = useState<any>(null);
  const [paymentMethodRequired, setPaymentMethodRequired] = useState(false);
  const [trialMode, setTrialMode] = useState(true); // Default to trial mode for paid plans
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  const onboardingSteps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome",
      description: "Get started with Flowvya",
      required: false, // Welcome step shouldn't block progression
      completed: completedSteps.includes("welcome")
    },
    {
      id: "business-setup",
      title: "Business Information",
      description: "Tell us about your business",
      required: false, // Allow users to skip business setup
      completed: completedSteps.includes("business-setup")
    },
    {
      id: "plan-selection",
      title: "Choose Your Plan",
      description: "Select the plan that fits your needs",
      required: false, // Allow users to skip plan selection (default to free)
      completed: completedSteps.includes("plan-selection")
    },
    {
      id: "payment-setup",
      title: "Payment Method",
      description: "Set up payment for paid plans",
      required: selectedPlan !== "free" && !trialMode,
      completed: completedSteps.includes("payment-setup")
    },
    {
      id: "welcome-email",
      title: "Welcome Email",
      description: "Confirm your email and get started",
      required: false,
      completed: completedSteps.includes("welcome-email")
    }
  ];

  // Fetch plans from Polar API on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const response = await fetch('/api/plans/live');
        const data = await response.json();
        
        if (data.success && data.plans) {
          setAvailablePlans(data.plans);
          console.log(`Loaded ${data.plans.length} plans from ${data.source}`);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        // Plans will fall back to defaults in PlanSelection component
      } finally {
        setPlansLoading(false);
      }
    };
    
    fetchPlans();
  }, []);

  useEffect(() => {
    const checkUserAndTenant = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/sign-in');
          return;
        }

        // Fetch user's membership information
        const { data: memberships, error: membershipError } = await supabase
          .from('membership')
          .select('*')
          .eq('user_id', user.id);
        
        if (membershipError) {
          console.error('Error fetching membership:', membershipError);
        } else if (memberships && memberships.length > 0) {
          // Get the tenant details
          const { data: tenant, error: tenantError } = await supabase
            .from('tenant')
            .select('*')
            .eq('id', memberships[0].tenant_id)
            .single();
          
          if (tenantError) {
            console.error('Error fetching tenant:', tenantError);
          } else if (tenant) {
            setUserTenant(tenant);
          }
        }
        
        // Check for payment success/cancel in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        
        if (paymentStatus === 'success') {
          handleStepCompletion('payment-setup');
          toast.success('Payment successful! Your subscription is now active.');
          // Move to welcome email step
          setCurrentStepId('welcome-email');
        } else if (paymentStatus === 'cancelled') {
          toast.error('Payment was cancelled. You can try again or continue with the trial.');
        }
        
      } catch (error) {
        console.error('Error checking user tenant:', error);
      }
    };

    checkUserAndTenant();
  }, [supabase, router]);

  const handleStepCompletion = (stepId: string) => {
    setCompletedSteps(prev => [...new Set([...prev, stepId])]);
  };

  const handleNext = () => {
    const currentIndex = onboardingSteps.findIndex(step => step.id === currentStepId);
    const nextStep = onboardingSteps[currentIndex + 1];
    
    if (nextStep) {
      // Skip payment setup if not required
      if (nextStep.id === "payment-setup" && !nextStep.required) {
        const paymentIndex = onboardingSteps.findIndex(step => step.id === "payment-setup");
        const afterPayment = onboardingSteps[paymentIndex + 1];
        if (afterPayment) {
          setCurrentStepId(afterPayment.id);
        }
      } else {
        setCurrentStepId(nextStep.id);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    const currentIndex = onboardingSteps.findIndex(step => step.id === currentStepId);
    const previousStep = onboardingSteps[currentIndex - 1];
    
    if (previousStep) {
      setCurrentStepId(previousStep.id);
    }
  };

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    setPaymentMethodRequired(planId !== "free" && !trialMode);
    handleStepCompletion("plan-selection");
    
    // For paid plans, navigate to payment setup
    if (planId !== "free" && !trialMode) {
      handleNext();
    } else {
      // For free plan, skip payment setup
      handleStepCompletion("payment-setup");
    }
  };

  const handleStartTrial = async (planId: string) => {
    setLoading(true);
    try {
      setSelectedPlan(planId);
      setTrialMode(true);
      setPaymentMethodRequired(false);
      handleStepCompletion("plan-selection");
      
      // Get current user and tenant info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Create trial subscription via API
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: userTenant?.id,
          plan_id: planId,
          billing_cycle: 'monthly',
          success_url: window.location.origin + '/onboarding?step=welcome-email',
          trial_mode: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start trial');
      }

      const data = await response.json();
      
      if (data.success && data.trial) {
        handleStepCompletion("payment-setup"); // Skip payment setup for trials
        toast.success(`${data.subscription?.plan_name || planId} trial started! You can add payment details later.`);
        handleNext(); // Move to next step
      } else {
        throw new Error('Trial creation failed');
      }
    } catch (error) {
      console.error('Trial creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start trial');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessSetup = async (data: BusinessSetupFormData) => {
    setLoading(true);
    try {
      setBusinessData(data);
      handleStepCompletion("business-setup");
      
      // Save business data to user metadata or tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: { 
            business_setup: data,
            onboarding_business_complete: true
          }
        });
        
        if (error) {
          console.error('Error saving business data:', error);
          toast.error('Failed to save business information');
          return;
        }
      }
      
      toast.success("Business information saved!");
      handleNext();
    } catch (error) {
      console.error('Business setup error:', error);
      toast.error('Failed to save business information');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSetup = async (paymentData: any) => {
    setLoading(true);
    try {
      // Get current user and tenant info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      if (!userTenant?.id) {
        throw new Error('No tenant found');
      }

      // Create checkout session for paid subscription
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: userTenant.id,
          plan_id: selectedPlan,
          billing_cycle: paymentData.billingCycle || 'monthly',
          success_url: window.location.origin + '/onboarding?step=welcome-email&payment=success',
          cancel_url: window.location.origin + '/onboarding?step=payment-setup&payment=cancelled',
          trial_mode: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.success && data.checkout_url) {
        // Redirect to Polar checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
      
    } catch (error) {
      console.error('Payment setup error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to set up payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWelcomeEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email-templates/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: 'welcome',
          recipientEmail: (await supabase.auth.getUser()).data.user?.email,
          data: {
            businessName: businessData.companyName || 'Your Business',
            selectedPlan: selectedPlan,
            trialMode: trialMode
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send welcome email');
      }

      handleStepCompletion("welcome-email");
      toast.success("Welcome email sent!");
    } catch (error) {
      console.error('Welcome email error:', error);
      toast.error('Failed to send welcome email');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Authentication error. Please sign in again.');
        router.push('/sign-in');
        return;
      }
      
      // Setup tenant and membership if not already done
      if (!userTenant) {
        const setupResponse = await fetch('/api/setup-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!setupResponse.ok) {
          const errorData = await setupResponse.json();
          console.error('Setup tenant failed:', errorData);
          toast.error(`Failed to setup your account: ${errorData.error || 'Unknown error'}`);
          return;
        }

        const setupData = await setupResponse.json();
        
        if (!setupData.success) {
          console.error('Setup response indicates failure:', setupData);
          toast.error('Account setup was not successful');
          return;
        }
      }
      
      // Mark onboarding as completed
      const { error } = await supabase.auth.updateUser({
        data: { 
          onboarding_completed: true,
          selected_plan: selectedPlan,
          trial_mode: trialMode,
          onboarding_completed_at: new Date().toISOString(),
          business_setup: businessData
        }
      });

      if (error) {
        console.error('Error updating user metadata:', error);
        toast.error('Failed to complete onboarding setup');
        return;
      }
      
      // Force a session refresh
      await supabase.auth.refreshSession();
      
      toast.success('Welcome to ClearSpendly! Setting up your dashboard...');
      
      // Initialize tenant features if needed
      if (userTenant?.id) {
        try {
          await fetch('/api/features/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenant_id: userTenant.id,
              action: 'initialize'
            })
          });
        } catch (error) {
          console.error('Error initializing features:', error);
        }
      }
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(`Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip optional steps
    const requiredSteps = onboardingSteps.filter(step => step.required);
    const allRequiredCompleted = requiredSteps.every(step => completedSteps.includes(step.id));
    
    if (allRequiredCompleted) {
      handleComplete();
    } else {
      toast.error("Please complete all required steps before continuing");
    }
  };

  const handleUseTestCard = (cardData: TestCardData) => {
    // Auto-fill payment form with test data
    toast.success(`Test card ${cardData.type} selected`);
  };

  const handleFillTestData = (data: any) => {
    setBusinessData(data);
    toast.success("Test business data filled!");
  };

  const currentStep = onboardingSteps.find(step => step.id === currentStepId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Test mode banner */}
        <TestModeBanner isTestMode={isTestMode} />
        
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Progress sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Your Progress
                </CardTitle>
                <ProgressBar steps={onboardingSteps} currentStepId={currentStepId} />
              </CardHeader>
              <CardContent>
                <ProgressTracker 
                  steps={onboardingSteps}
                  currentStepId={currentStepId}
                />
              </CardContent>
            </Card>

            {/* Test mode helpers */}
            {isTestMode && (
              <div className="mt-6 space-y-4">
                <QuickFillTestData onFillTestData={handleFillTestData} />
                {currentStepId === "payment-setup" && (
                  <TestCreditCardHelper onUseTestCard={handleUseTestCard} />
                )}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Card className="min-h-[600px]">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {currentStepId === "welcome" && <Sparkles className="w-8 h-8 text-purple-600" />}
                  {currentStepId === "business-setup" && <Building className="w-8 h-8 text-purple-600" />}
                  {currentStepId === "plan-selection" && <Target className="w-8 h-8 text-purple-600" />}
                  {currentStepId === "payment-setup" && <CreditCard className="w-8 h-8 text-purple-600" />}
                  {currentStepId === "welcome-email" && <Mail className="w-8 h-8 text-purple-600" />}
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {currentStep?.title}
                </CardTitle>
                <CardDescription className="text-lg text-gray-600">
                  {currentStep?.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">
                {/* Welcome Step */}
                {currentStepId === "welcome" && (
                  <div className="text-center space-y-8 py-8">
                    <div>
                      <h3 className="text-2xl font-semibold mb-4">
                        Welcome to Flowvya!
                      </h3>
                      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Let's set up your account to get the most out of our AI-powered expense management platform.
                        This should only take a few minutes.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                      <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                        <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                        <h4 className="font-semibold mb-2">AI-Powered OCR</h4>
                        <p className="text-sm text-gray-600">Advanced receipt processing with machine learning</p>
                      </div>
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                        <h4 className="font-semibold mb-2">Team Collaboration</h4>
                        <p className="text-sm text-gray-600">Work together with your team seamlessly</p>
                      </div>
                      <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
                        <h4 className="font-semibold mb-2">Smart Automation</h4>
                        <p className="text-sm text-gray-600">Automatic categorization and expense tracking</p>
                      </div>
                    </div>

                    <Alert className="max-w-2xl mx-auto border-blue-200 bg-blue-50">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>Free Plan Included:</strong> You'll start with 10 free receipts per month, 
                        full OCR processing, and access to our dashboard analytics.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Business Setup Step */}
                {currentStepId === "business-setup" && (
                  <BusinessSetupForm
                    onSubmit={handleBusinessSetup}
                    onSkip={() => handleNext()}
                    initialData={businessData}
                    isLoading={loading}
                  />
                )}

                {/* Plan Selection Step */}
                {currentStepId === "plan-selection" && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-2">Choose Your Plan</h3>
                      <p className="text-gray-600">
                        Select the plan that best fits your business needs. You can upgrade or downgrade at any time.
                      </p>
                    </div>
                    
                    <PlanSelection
                      plans={availablePlans.length > 0 ? availablePlans : undefined}
                      selectedPlanId={selectedPlan}
                      onPlanSelect={handlePlanSelect}
                      onStartTrial={handleStartTrial}
                      isTestMode={isTestMode}
                    />
                  </div>
                )}

                {/* Mobile-first Payment Setup Step */}
                {currentStepId === "payment-setup" && (
                  <div className="space-y-6">
                    <div className="text-center px-4">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-3">Payment Method</h3>
                      <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                        Add a payment method for your {selectedPlan} plan subscription.
                      </p>
                      {trialMode && (
                        <div className="mt-4 inline-flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <Badge className="bg-green-100 text-green-700 px-3 py-1 text-xs sm:text-sm font-medium">
                            14-day free trial - No charge until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Mobile-optimized Payment Interface */}
                    <div className="max-w-lg mx-auto px-4">
                      <Card className="border-2 shadow-lg">
                        <CardHeader className="text-center pb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CreditCard className="w-8 h-8 text-purple-600" />
                          </div>
                          <CardTitle className="text-lg sm:text-xl">Payment Details</CardTitle>
                          <CardDescription className="text-sm leading-relaxed">
                            {trialMode ? "Required for when your trial ends" : "Your subscription will start immediately"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Plan Summary */}
                          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">Selected Plan</span>
                              <Badge className="bg-purple-100 text-purple-700 capitalize">
                                {selectedPlan}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {selectedPlan === "pro" && "Everything you need for serious expense management"}
                              {selectedPlan === "enterprise" && "Advanced features for larger teams"}
                              {selectedPlan === "free" && "Perfect for getting started"}
                            </div>
                          </div>

                          {/* Security Information */}
                          <div className="text-center space-y-3">
                            <h4 className="font-semibold text-gray-900">Secure Payment with Polar</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              You'll be redirected to our secure payment partner to complete your subscription.
                              Your payment information is encrypted and never stored on our servers.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                              <Shield className="w-4 h-4" />
                              <span>256-bit SSL encryption</span>
                            </div>
                          </div>
                          
                          {/* Process Steps */}
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                            <p className="text-blue-800 font-medium mb-3 text-sm">What happens next:</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                Secure payment processing with Polar
                              </div>
                              <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                Instant access to {selectedPlan} features
                              </div>
                              <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                Email confirmation with receipt
                              </div>
                            </div>
                          </div>
                          
                          {/* Touch-friendly buttons */}
                          <div className="space-y-3 pt-2">
                            <Button
                              onClick={() => handlePaymentSetup({ billingCycle: 'monthly' })}
                              disabled={loading}
                              size="lg"
                              className="w-full h-12 sm:h-13 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base font-medium"
                            >
                              {loading ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              ) : (
                                <CreditCard className="w-5 h-5 mr-2" />
                              )}
                              Continue to Payment
                            </Button>
                            
                            {isTestMode && (
                              <Button
                                onClick={() => handlePaymentSetup({ testMode: true, billingCycle: 'monthly' })}
                                variant="outline"
                                size="lg"
                                className="w-full h-12 text-orange-600 border-2 border-orange-300 hover:bg-orange-50 transition-colors text-base font-medium"
                                disabled={loading}
                              >
                                <Shield className="w-5 h-5 mr-2" />
                                Simulate Payment (Test Mode)
                              </Button>
                            )}
                            
                            {/* Skip option for trial */}
                            {trialMode && (
                              <Button
                                onClick={() => handleNext()}
                                variant="ghost"
                                size="lg"
                                className="w-full h-11 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors text-sm"
                              >
                                Skip for now (Add payment later)
                              </Button>
                            )}
                          </div>

                          {/* Trust indicators */}
                          <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Shield className="w-3 h-3" />
                              <span>Secure</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CheckCircle className="w-3 h-3" />
                              <span>Trusted</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CreditCard className="w-3 h-3" />
                              <span>PCI Compliant</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Welcome Email Step */}
                {currentStepId === "welcome-email" && (
                  <div className="text-center space-y-6 py-8">
                    <div>
                      <Mail className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                      <h3 className="text-2xl font-semibold mb-2">You're Almost Done!</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Would you like us to send you a welcome email with quick start tips and important account information?
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                      <Button
                        onClick={handleSendWelcomeEmail}
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                        Send Welcome Email
                      </Button>
                      <Button
                        onClick={handleNext}
                        variant="outline"
                      >
                        Skip Email
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Navigation buttons */}
                <div className="flex justify-between items-center pt-4">
                  <div className="flex gap-2">
                    {onboardingSteps.findIndex(step => step.id === currentStepId) > 0 && (
                      <Button
                        onClick={handlePrevious}
                        variant="outline"
                        disabled={loading}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                    )}
                    
                    {!currentStep?.required && (
                      <Button
                        onClick={handleSkip}
                        variant="ghost"
                        disabled={loading}
                      >
                        Skip This Step
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {currentStepId === "welcome-email" ? (
                      <Button
                        onClick={handleComplete}
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Complete Setup
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        disabled={loading || (currentStep?.required && !completedSteps.includes(currentStepId))}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <>
                            Next
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}