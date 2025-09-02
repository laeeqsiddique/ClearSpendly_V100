"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  Wallet, 
  Mail, 
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  CreditCard,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface PaymentSettings {
  paypal_email: string;
  paypal_me_link: string;
  payment_instructions: string;
}

export default function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>({
    paypal_email: "",
    paypal_me_link: "",
    payment_instructions: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data: tenant } = await supabase
        .from('tenant')
        .select('paypal_email, paypal_me_link, payment_instructions')
        .eq('id', membership.tenant_id)
        .single();

      if (tenant) {
        setSettings({
          paypal_email: tenant.paypal_email || "",
          paypal_me_link: tenant.paypal_me_link || "",
          payment_instructions: tenant.payment_instructions || ""
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { error } = await supabase
        .from('tenant')
        .update({
          paypal_email: settings.paypal_email || null,
          paypal_me_link: settings.paypal_me_link || null,
          payment_instructions: settings.payment_instructions || null
        })
        .eq('id', membership.tenant_id);

      if (error) throw error;

      toast.success("Payment settings saved successfully!");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  const formatPayPalMeLink = (link: string) => {
    if (!link) return "";
    // Remove https://paypal.me/ if user included it
    const cleanLink = link.replace(/^https?:\/\/(www\.)?paypal\.me\//, "");
    return cleanLink ? `https://paypal.me/${cleanLink}` : "";
  };

  if (loading) {
    return (
      <section className="flex flex-col items-start justify-start p-3 sm:p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="w-full space-y-4 sm:space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-3">
            <div className="h-8 sm:h-10 bg-gradient-to-r from-purple-200 to-blue-200 rounded-lg w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded w-1/2 animate-pulse"></div>
          </div>
          
          {/* Cards Skeleton */}
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 bg-gradient-to-r from-purple-200 to-blue-200 rounded"></div>
                  <div className="h-5 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-1/3"></div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded w-1/4"></div>
                  <div className="h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded"></div>
                  <div className="h-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-start justify-start p-3 sm:p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Mobile-First Header */}
          <div className="flex flex-col gap-3 md:items-start">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                PayPal Settings
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Configure PayPal.me links and payment instructions for your invoices.
              </p>
            </div>
            
            {/* Mobile-Optimized Save Button */}
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="w-full md:w-auto min-h-[48px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              {saving ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2 animate-spin" />
                  <span className="text-base">Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  <span className="text-base">Save Settings</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="@container/main flex flex-1 flex-col gap-3 sm:gap-4">
          <div className="flex flex-col gap-4 py-2 sm:gap-6 sm:py-4">

            {/* PayPal Email Settings - Mobile Optimized */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="p-4 sm:p-6 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  PayPal Email
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-muted-foreground mt-2">
                  Your PayPal business email where customers can send payments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="paypal_email" className="text-sm font-medium text-gray-700">
                    PayPal Business Email
                  </Label>
                  <Input
                    id="paypal_email"
                    type="email"
                    placeholder="business@example.com"
                    value={settings.paypal_email}
                    onChange={(e) => setSettings({ ...settings, paypal_email: e.target.value })}
                    className="min-h-[48px] text-base sm:text-sm border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 transition-all duration-200"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    This email will be included in invoice emails for customers to send PayPal payments
                  </p>
                </div>

                {settings.paypal_email && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200/50">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-blue-100 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-sm flex-1">
                        <p className="font-medium text-blue-900 mb-1">Email Preview:</p>
                        <p className="text-blue-700 bg-white/50 p-2 rounded-lg border border-blue-200/50">
                          "Send payment to: {settings.paypal_email}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PayPal.me Link Settings - Mobile Optimized */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="p-4 sm:p-6 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                    <LinkIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  PayPal.me Link
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-muted-foreground mt-2">
                  Your PayPal.me link for quick payments with pre-filled amounts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="paypal_me_link" className="text-sm font-medium text-gray-700">
                    PayPal.me Username
                  </Label>
                  
                  {/* Mobile-Friendly Input with Prefix */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                    <div className="flex items-center w-full">
                      <span className="inline-flex items-center px-3 py-3 sm:py-2.5 text-sm font-medium text-purple-700 bg-gradient-to-r from-purple-100 to-blue-100 border border-r-0 border-purple-200 rounded-l-xl sm:whitespace-nowrap">
                        paypal.me/
                      </span>
                      <Input
                        id="paypal_me_link"
                        placeholder="yourbusiness"
                        value={settings.paypal_me_link.replace(/^https?:\/\/(www\.)?paypal\.me\//, "")}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          paypal_me_link: e.target.value.replace(/^https?:\/\/(www\.)?paypal\.me\//, "")
                        })}
                        className="min-h-[48px] text-base sm:text-sm border-purple-200 border-l-0 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-l-none rounded-r-xl flex-1 transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Just enter your PayPal.me username (the part after paypal.me/)
                  </p>
                </div>

                {settings.paypal_me_link && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-green-100 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-sm flex-1 space-y-3">
                        <p className="font-medium text-green-900">Button Preview:</p>
                        <div className="">
                          <Button 
                            size="sm" 
                            className="min-h-[40px] sm:min-h-[36px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-md"
                            disabled
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay $150.00 with PayPal
                          </Button>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg border border-green-200/50">
                          <p className="text-green-700 text-xs sm:text-sm break-all">
                            Link: {formatPayPalMeLink(settings.paypal_me_link)}/150.00
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custom Payment Instructions - Mobile Optimized */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="p-4 sm:p-6 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  Payment Instructions
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-muted-foreground mt-2">
                  Additional payment instructions to include in your invoice emails
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="payment_instructions" className="text-sm font-medium text-gray-700">
                    Custom Instructions (Optional)
                  </Label>
                  <Textarea
                    id="payment_instructions"
                    placeholder="e.g., Please include your invoice number in the payment reference, or contact support if you have any questions..."
                    value={settings.payment_instructions}
                    onChange={(e) => setSettings({ ...settings, payment_instructions: e.target.value })}
                    className="min-h-[120px] sm:min-h-[100px] text-base sm:text-sm border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl px-4 py-3 transition-all duration-200 resize-none"
                    maxLength={500}
                  />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Add any special payment instructions or requirements
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        settings.payment_instructions.length > 400 
                          ? 'bg-red-100 text-red-700' 
                          : settings.payment_instructions.length > 300 
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {settings.payment_instructions.length}/500
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Help Section - Mobile Optimized Collapsible */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader 
                className="p-4 sm:p-6 cursor-pointer transition-colors hover:bg-gray-50/50"
                onClick={() => setHelpExpanded(!helpExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                    <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                      <HelpCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    How PayPal Integration Works
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 h-8 w-8"
                  >
                    {helpExpanded ? (
                      <ChevronUp className="h-4 w-4 text-purple-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-purple-600" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              {helpExpanded && (
                <CardContent className="p-4 sm:p-6 pt-0 space-y-5">
                  {/* Mobile-First Step Layout */}
                  <div className="space-y-4">
                    {[
                      {
                        step: 1,
                        title: "Add your PayPal details above",
                        description: "Enter your PayPal email and/or PayPal.me username in the settings above",
                        icon: Mail
                      },
                      {
                        step: 2,
                        title: "Send invoices as usual",
                        description: "Your invoice emails will automatically include PayPal payment options for customers",
                        icon: FileText
                      },
                      {
                        step: 3,
                        title: "Customers pay with PayPal",
                        description: "They click the PayPal button and pay directly to your PayPal account",
                        icon: CreditCard
                      },
                      {
                        step: 4,
                        title: "Mark invoices as paid",
                        description: "When you receive payment, mark the invoice as paid in your dashboard",
                        icon: CheckCircle2
                      }
                    ].map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <div key={item.step} className="flex gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-xl border border-blue-100/50">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                              {item.step}
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-purple-600" />
                              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{item.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Important Notes */}
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/50">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-amber-100 rounded-full">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Important Notes
                        </h4>
                        <ul className="text-sm text-amber-800 space-y-2">
                          <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                            <span>Payments go directly to your PayPal account - no fees from our platform</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                            <span>You'll need to manually mark invoices as paid when you receive payment</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                            <span>Make sure your PayPal account can receive business payments</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}