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
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [businessData, setBusinessData] = useState<Partial<BusinessSetupFormData>>({});
  const [loading, setLoading] = useState(false);
  const [userTenant, setUserTenant] = useState<any>(null);
  const [paymentMethodRequired, setPaymentMethodRequired] = useState(false);
  const [trialMode, setTrialMode] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const onboardingSteps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome",
      description: "Get started with ClearSpendly",
      required: true,
      completed: completedSteps.includes("welcome")
    },
    {
      id: "business-setup",
      title: "Business Information",
      description: "Tell us about your business",
      required: true,
      completed: completedSteps.includes("business-setup")
    },
    {
      id: "plan-selection",
      title: "Choose Your Plan",
      description: "Select the plan that fits your needs",
      required: true,
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

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setPaymentMethodRequired(planId !== "free" && !trialMode);
    handleStepCompletion("plan-selection");
  };

  const handleStartTrial = (planId: string) => {
    setSelectedPlan(planId);
    setTrialMode(true);
    setPaymentMethodRequired(false);
    handleStepCompletion("plan-selection");
    handleStepCompletion("payment-setup"); // Skip payment setup for trials
    toast.success("Trial started! You can add payment details later.");
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
      // Handle payment method setup
      // This would integrate with Stripe/PayPal
      console.log('Setting up payment:', paymentData);
      
      handleStepCompletion("payment-setup");
      toast.success("Payment method added successfully!");
      handleNext();
    } catch (error) {
      console.error('Payment setup error:', error);
      toast.error('Failed to set up payment method');
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
      
      // Setup tenant and membership
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
      
      // Mark onboarding as completed
      const { error } = await supabase.auth.updateUser({
        data: { 
          onboarding_completed: true,
          selected_plan: selectedPlan,
          trial_mode: trialMode,
          onboarding_completed_at: new Date().toISOString()
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
                        Welcome to {userTenant?.name || 'ClearSpendly'}!
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
                      selectedPlanId={selectedPlan}
                      onPlanSelect={handlePlanSelect}
                      onStartTrial={handleStartTrial}
                      isTestMode={isTestMode}
                    />
                  </div>
                )}

                {/* Payment Setup Step */}
                {currentStepId === "payment-setup" && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-2">Payment Method</h3>
                      <p className="text-gray-600">
                        Add a payment method for your {selectedPlan} plan subscription.
                      </p>
                      {trialMode && (
                        <Badge className="mt-2 bg-green-100 text-green-700">
                          14-day free trial - No charge until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>

                    {/* Payment form would go here */}
                    <Card className="max-w-md mx-auto">
                      <CardHeader>
                        <CardTitle>Payment Details</CardTitle>
                        <CardDescription>
                          {trialMode ? "Required for when your trial ends" : "Your subscription will start immediately"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                          <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Payment form integration</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Stripe/PayPal integration would be implemented here
                          </p>
                        </div>
                        
                        {isTestMode && (
                          <div className="text-center">
                            <Button
                              onClick={() => handlePaymentSetup({ testMode: true })}
                              variant="outline"
                              className="text-orange-600 border-orange-300"
                            >
                              Simulate Payment Setup
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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