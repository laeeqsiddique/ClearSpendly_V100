"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle, 
  Upload, 
  Sparkles, 
  BarChart3,
  ArrowRight,
  Loader2
} from "lucide-react";

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userTenant, setUserTenant] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

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
            console.log('User tenant:', tenant);
          }
        } else {
          console.log('No membership found for user');
        }
      } catch (error) {
        console.error('Error checking user tenant:', error);
      }
    };

    checkUserAndTenant();
  }, [supabase, router]);

  const steps = [
    {
      title: "Welcome to ClearSpendly!",
      description: "Let's get you started with AI-powered receipt management",
      content: (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              Welcome to {userTenant?.name || 'your organization'}!
            </h3>
            <p className="text-muted-foreground">
              You're all set up with a free account that includes 10 receipts per month.
              Let's explore what you can do with ClearSpendly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="secondary">AI Receipt Processing</Badge>
            <Badge variant="secondary">Smart Categorization</Badge>
            <Badge variant="secondary">Expense Analytics</Badge>
          </div>
        </div>
      )
    },
    {
      title: "Upload Your First Receipt",
      description: "Experience our AI-powered OCR technology",
      content: (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Upload & Process Receipts</h3>
            <p className="text-muted-foreground">
              Simply take a photo or upload an image of your receipt. Our AI will:
            </p>
            <ul className="text-left mt-4 space-y-2 max-w-sm mx-auto">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Extract all transaction details
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Categorize expenses automatically
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Generate searchable records
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Explore Your Dashboard",
      description: "See insights and analytics for your expenses",
      content: (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Rich Analytics Dashboard</h3>
            <p className="text-muted-foreground">
              Your dashboard provides powerful insights including:
            </p>
            <ul className="text-left mt-4 space-y-2 max-w-sm mx-auto">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                Monthly spending trends
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                Category breakdowns
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                AI-powered insights
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    console.log('Current step:', currentStep, 'Total steps:', steps.length);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    console.log('Completing onboarding...');
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      
      // Mark onboarding as completed in user metadata
      const { data: updateData, error } = await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      });

      if (error) {
        console.error('Error updating user metadata:', error);
        toast.error('Failed to complete onboarding');
        return;
      }
      
      console.log('User metadata updated:', updateData);

      // Force a session refresh to ensure the metadata is updated
      const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
      }
      
      console.log('Session refreshed:', sessionData?.user?.user_metadata);
      
      toast.success('Welcome to ClearSpendly!');
      
      // Use window.location for a hard redirect to ensure middleware runs fresh
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500); // Small delay to ensure metadata is propagated
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      // Mark onboarding as completed even when skipping
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      });

      if (error) {
        console.error('Error updating user metadata:', error);
      }

      // Force a session refresh
      await supabase.auth.refreshSession();
      
      // Use window.location for a hard redirect
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      router.push('/dashboard'); // Fallback to regular navigation
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index <= currentStep 
                      ? 'bg-purple-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {steps[currentStep].title}
          </CardTitle>
          <CardDescription className="text-lg">
            {steps[currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="min-h-[300px] flex items-center justify-center">
            {steps[currentStep].content}
          </div>
          
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Skip onboarding
            </Button>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </Button>
              )}
              <Button 
                onClick={handleNext}
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : currentStep === steps.length - 1 ? (
                  'Get Started'
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}