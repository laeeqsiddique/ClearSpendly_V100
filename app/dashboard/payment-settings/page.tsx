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
  ExternalLink
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
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gradient-to-r from-purple-200 to-blue-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                PayPal Link Settings
              </h1>
              <p className="text-muted-foreground">
                Configure PayPal.me links and payment instructions for your invoices.
              </p>
            </div>
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {saving ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* PayPal Email Settings */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  PayPal Email
                </CardTitle>
                <CardDescription>
                  Your PayPal business email where customers can send payments
                </CardDescription>
              </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paypal_email">PayPal Business Email</Label>
              <Input
                id="paypal_email"
                type="email"
                placeholder="business@example.com"
                value={settings.paypal_email}
                onChange={(e) => setSettings({ ...settings, paypal_email: e.target.value })}
                className="border-purple-200 focus:border-purple-500"
              />
              <p className="text-xs text-muted-foreground">
                This email will be included in invoice emails for customers to send PayPal payments
              </p>
            </div>

            {settings.paypal_email && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Email Preview:</p>
                    <p className="text-blue-700">
                      "Send payment to: {settings.paypal_email}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

            {/* PayPal.me Link Settings */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-purple-600" />
                  PayPal.me Link
                </CardTitle>
                <CardDescription>
                  Your PayPal.me link for quick payments with pre-filled amounts
                </CardDescription>
              </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paypal_me_link">PayPal.me Username</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
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
                  className="border-purple-200 focus:border-purple-500"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Just enter your PayPal.me username (the part after paypal.me/)
              </p>
            </div>

            {settings.paypal_me_link && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900">Button Preview:</p>
                    <div className="mt-2">
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled
                      >
                        💳 Pay $150.00 with PayPal
                      </Button>
                    </div>
                    <p className="text-green-700 mt-1">
                      Link: {formatPayPalMeLink(settings.paypal_me_link)}/150.00
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Payment Instructions */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Custom Payment Instructions
            </CardTitle>
            <CardDescription>
              Additional payment instructions to include in your invoice emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment_instructions">Payment Instructions (Optional)</Label>
              <Textarea
                id="payment_instructions"
                placeholder="e.g., Please include your invoice number in the payment reference..."
                value={settings.payment_instructions}
                onChange={(e) => setSettings({ ...settings, payment_instructions: e.target.value })}
                className="border-purple-200 focus:border-purple-500 min-h-[100px]"
                maxLength={500}
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Add any special payment instructions or requirements</span>
                <span>{settings.payment_instructions.length}/500</span>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Help Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">How PayPal Integration Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">1</div>
                  <span className="font-medium">Add your PayPal details above</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Enter your PayPal email and/or PayPal.me username
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">2</div>
                  <span className="font-medium">Send invoices as usual</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Your invoice emails will include PayPal payment options
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">3</div>
                  <span className="font-medium">Customers pay with PayPal</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  They click the PayPal button and pay directly to your account
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">4</div>
                  <span className="font-medium">Mark invoices as paid</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  When you receive payment, mark the invoice as paid in your dashboard
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Important Notes</h4>
                  <ul className="text-sm text-amber-800 mt-1 space-y-1">
                    <li>• Payments go directly to your PayPal account</li>
                    <li>• You'll need to manually mark invoices as paid when you receive payment</li>
                    <li>• Make sure your PayPal account can receive business payments</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    </section>
  );
}