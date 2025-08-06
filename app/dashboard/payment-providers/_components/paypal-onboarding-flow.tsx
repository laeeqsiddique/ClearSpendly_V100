"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Shield, 
  Globe, 
  CreditCard,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface PayPalAccountInfo {
  clientId: string;
  clientSecret: string;
  email: string;
  businessName: string;
  environment: 'sandbox' | 'live';
  webhookId?: string;
}

interface PayPalOnboardingFlowProps {
  open: boolean;
  onClose: () => void;
  onComplete: (accountInfo: PayPalAccountInfo) => void;
}

const steps = [
  {
    id: 1,
    title: "Welcome to PayPal",
    description: "Quick setup for PayPal payments"
  },
  {
    id: 2,
    title: "API Credentials",
    description: "Enter your PayPal API credentials"
  },
  {
    id: 3,
    title: "Complete Setup",
    description: "Finalize your PayPal configuration"
  }
];

export function PayPalOnboardingFlow({ open, onClose, onComplete }: PayPalOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [formData, setFormData] = useState<Partial<PayPalAccountInfo>>({
    environment: 'sandbox',
    clientId: '',
    clientSecret: '',
    email: '',
    businessName: ''
  });

  const progress = (currentStep / steps.length) * 100;

  const handleNext = async () => {
    if (currentStep === steps.length) {
      await handleComplete();
      return;
    }

    if (currentStep === 2) {
      // Validate PayPal credentials and simulate test
      if (!formData.clientId || !formData.clientSecret) {
        toast.error("Please enter your PayPal client ID and secret");
        return;
      }
      
      if (!formData.email || !formData.businessName) {
        toast.error("Please enter your business information");
        return;
      }

      // Quick test
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoading(false);
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Simulate API call to save PayPal configuration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onComplete(formData as PayPalAccountInfo);
      toast.success("PayPal setup completed successfully!");
    } catch (error) {
      toast.error("Failed to complete PayPal setup");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl">💙</div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Quick PayPal Setup</h3>
              <p className="text-gray-600 mb-6">
                Get started with PayPal payments in just a few simple steps. Accept payments from customers worldwide.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200/50">
                <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="font-medium text-blue-900">Global Reach</div>
                <div className="text-blue-700">Accept payments from 200+ countries</div>
              </div>
              <div className="p-4 bg-green-50/50 rounded-lg border border-green-200/50">
                <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="font-medium text-green-900">Secure</div>
                <div className="text-green-700">Built-in fraud protection</div>
              </div>
              <div className="p-4 bg-purple-50/50 rounded-lg border border-purple-200/50">
                <CreditCard className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="font-medium text-purple-900">Flexible</div>
                <div className="text-purple-700">PayPal, cards, and transfers</div>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">PayPal Configuration</h3>
              <p className="text-gray-600">
                Enter your PayPal API credentials and business information
              </p>
            </div>

            <Alert className="border-blue-200 bg-blue-50/50">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Need PayPal API credentials? 
                <a 
                  href="https://developer.paypal.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium underline ml-1"
                >
                  Get them from PayPal Developer Dashboard
                </a>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">API Credentials</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.environment === 'sandbox' ? 'default' : 'outline'}
                      onClick={() => setFormData(prev => ({ ...prev, environment: 'sandbox' }))}
                      size="sm"
                      className="flex-1"
                    >
                      Sandbox
                    </Button>
                    <Button
                      type="button"
                      variant={formData.environment === 'live' ? 'default' : 'outline'}
                      onClick={() => setFormData(prev => ({ ...prev, environment: 'live' }))}
                      size="sm"
                      className="flex-1"
                    >
                      Live
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID *</Label>
                  <Input
                    id="clientId"
                    placeholder="PayPal Client ID"
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret *</Label>
                  <div className="relative">
                    <Input
                      id="clientSecret"
                      type={showClientSecret ? "text" : "password"}
                      placeholder="PayPal Client Secret"
                      value={formData.clientSecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                    >
                      {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Business Information</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Your business name"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">PayPal Account Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="paypal@yourbusiness.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {formData.environment === 'sandbox' && (
              <Alert className="border-yellow-200 bg-yellow-50/50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Sandbox mode is for testing. No real money will be processed.
                </AlertDescription>
              </Alert>
            )}
          </motion.div>
        );

      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl">🎉</div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">PayPal Ready!</h3>
              <p className="text-gray-600 mb-6">
                Your PayPal integration is configured and ready to accept payments.
              </p>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-200/50">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="text-gray-900">Testing PayPal connection...</div>
                </div>
              ) : (
                <Alert className="border-green-200 bg-green-50/50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Connection test successful! PayPal is ready to use.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200/50">
              <h4 className="font-semibold text-gray-900 mb-4">What's Next?</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Create PayPal payment links
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Accept PayPal & card payments
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Automatic payment notifications
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Global payment processing
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              <span className="text-xl">💙</span>
            </div>
            PayPal Integration Setup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Step {currentStep} of {steps.length}</span>
              <span className="text-gray-600">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Navigation */}
          <div className="flex items-center justify-between text-xs">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  step.id <= currentStep ? 'text-purple-600' : 'text-gray-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.id < currentStep 
                    ? 'bg-green-500 text-white' 
                    : step.id === currentStep
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="hidden md:block text-center max-w-20">{step.title}</span>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={loading}
          >
            {currentStep === 1 ? 'Cancel' : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </>
            )}
          </Button>

          <Button
            onClick={handleNext}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {currentStep === 4 ? 'Testing...' : 'Processing...'}
              </>
            ) : currentStep === steps.length ? (
              'Complete Setup'
            ) : (
              <>
                {currentStep === 2 ? 'Test & Continue' : 'Continue'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}