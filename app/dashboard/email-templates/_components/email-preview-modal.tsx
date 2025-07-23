"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, X, Palette, Eye, Sparkles } from "lucide-react";
import { SecureImage } from "@/components/ui/secure-image";

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding: {
    businessName: string;
    tagline?: string;
    logoUrl?: string;
    email: string;
    phone?: string;
    website?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    emailSettings: {
      fromName: string;
      replyToEmail: string;
      includeBusinessInfo: boolean;
      includeUnsubscribe: boolean;
      footerText: string;
    };
  };
}

export function EmailPreviewModal({ isOpen, onClose, branding }: EmailPreviewModalProps) {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"invoice" | "reminder" | "confirmation">("invoice");
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates for modal:', error);
    }
  };

  // Get template for current tab
  const getTemplateForType = (type: "invoice" | "reminder" | "confirmation") => {
    const templateType = type === 'invoice' ? 'invoice' : 
                        type === 'reminder' ? 'payment_reminder' : 
                        'payment_received';
    const template = templates.find(t => t.template_type === templateType) || templates[0];
    return template;
  };

  const sampleInvoiceData = {
    invoiceNumber: "INV-2024-001",
    clientName: "John Doe",
    amount: "$1,250.00",
    dueDate: "February 15, 2024",
    businessName: branding.businessName,
  };

  const EmailTemplate = ({ type }: { type: "invoice" | "reminder" | "confirmation" }) => {
    const template = getTemplateForType(type);
    const primaryColor = template?.primary_color || '#667eea';
    const secondaryColor = template?.secondary_color || '#764ba2';
    const headerStyle = template?.header_style || 'gradient';

    const getContent = () => {
      switch (type) {
        case "invoice":
          return {
            subject: `Invoice ${sampleInvoiceData.invoiceNumber} from ${sampleInvoiceData.businessName}`,
            greeting: "We've prepared your invoice. Please find the invoice PDF attached to this email.",
            mainContent: (
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Number:</span>
                    <span className="font-semibold">{sampleInvoiceData.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">{sampleInvoiceData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-semibold">{sampleInvoiceData.dueDate}</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    📎 Invoice PDF is attached to this email
                  </p>
                </div>
              </div>
            ),
            actionButton: null,
          };
        case "reminder":
          return {
            subject: `Friendly Reminder: Invoice ${sampleInvoiceData.invoiceNumber} is 5 days overdue`,
            greeting: "We hope you're doing well! This is a friendly reminder about an outstanding invoice that needs your attention.",
            mainContent: (
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
                <p className="text-amber-800 mb-4">
                  Invoice {sampleInvoiceData.invoiceNumber} for {sampleInvoiceData.amount} was due on {sampleInvoiceData.dueDate}.
                </p>
                <p className="text-gray-700 mb-3">
                  We understand things can get busy. Please let us know if you have any questions or concerns about this invoice.
                </p>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    📎 Updated invoice PDF is attached for your reference
                  </p>
                </div>
              </div>
            ),
            actionButton: null,
          };
        case "confirmation":
          return {
            subject: `Thank you! Payment received for Invoice ${sampleInvoiceData.invoiceNumber}`,
            greeting: "Thank you for your payment! We've successfully received and processed your payment.",
            mainContent: (
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                <p className="text-green-800 mb-4">
                  Payment of {sampleInvoiceData.amount} has been received for Invoice {sampleInvoiceData.invoiceNumber}.
                </p>
                <p className="text-gray-700 mb-3">
                  Your account is now up to date. Thank you for your prompt payment!
                </p>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    📎 Payment confirmation and updated invoice are attached
                  </p>
                </div>
              </div>
            ),
            actionButton: null,
          };
      }
    };

    const content = getContent();

    return (
      <div className="bg-white">
        <div className="max-w-[600px] mx-auto">
          {/* Email Container */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100/50 backdrop-blur-sm">
            {/* Header with actual template colors */}
            <div 
              className="p-8 text-center relative overflow-hidden"
              style={{
                background: headerStyle === 'solid' ? primaryColor : 
                           headerStyle === 'minimal' ? '#ffffff' :
                           `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: headerStyle === 'minimal' ? '#1a1a1a' : '#ffffff',
                borderBottom: headerStyle === 'minimal' ? '1px solid #e1e4e8' : 'none'
              }}
            >
              {/* Decorative Pattern Overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
              </div>
              <div className="relative z-10">
              {branding.logoUrl && (
                <SecureImage
                  path={branding.logoUrl}
                  alt={branding.businessName}
                  className="h-16 w-auto mx-auto mb-4 filter brightness-0 invert"
                />
              )}
                <h1 className={`text-2xl font-bold ${headerStyle === 'minimal' ? 'text-gray-900' : 'text-white'}`}>
                  {branding.businessName}
                </h1>
                {branding.tagline && (
                  <p className={`mt-2 ${headerStyle === 'minimal' ? 'text-gray-600' : 'text-white/90'}`}>
                    {branding.tagline}
                  </p>
                )}
              </div>
            </div>

            {/* Email Body */}
            <div className="p-8">
              <p className="text-gray-700 mb-6">Hi {sampleInvoiceData.clientName},</p>
              
              <p className="text-gray-700 mb-6">{content.greeting}</p>

              {content.mainContent}

              {/* Action Button - Only show if actionButton exists */}
              {content.actionButton && (
                <div className="text-center mt-8">
                  <button 
                    className="text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                    style={{
                      background: headerStyle === 'solid' ? primaryColor : 
                                 `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                    }}
                  >
                    {content.actionButton}
                  </button>
                </div>
              )}

              {/* Footer Message */}
              {branding.emailSettings.footerText && (
                <p className="text-gray-600 text-sm mt-8 text-center italic">
                  {branding.emailSettings.footerText}
                </p>
              )}
            </div>

            {/* Email Footer */}
            <div className="bg-gray-50 p-6 text-center text-sm text-gray-600">
              {branding.logoUrl && (
                <SecureImage
                  path={branding.logoUrl}
                  alt={branding.businessName}
                  className="h-10 w-auto mx-auto mb-3 opacity-75"
                />
              )}
              
              <div className="space-y-1">
                <p className="font-semibold">{branding.businessName}</p>
                <p>{branding.email}</p>
                {branding.phone && <p>{branding.phone}</p>}
                {branding.website && (
                  <p>
                    <a href={branding.website} className="text-blue-600 hover:underline">
                      {branding.website.replace(/^https?:\/\//, '')}
                    </a>
                  </p>
                )}
              </div>

              {branding.address?.line1 && branding.emailSettings.includeBusinessInfo && (
                <div className="text-xs text-gray-500 mt-3 pt-3 border-t">
                  <p>{branding.address.line1}</p>
                  {branding.address.line2 && <p>{branding.address.line2}</p>}
                  <p>
                    {branding.address.city}, {branding.address.state} {branding.address.postalCode}
                  </p>
                  <p>{branding.address.country}</p>
                </div>
              )}

              {branding.emailSettings.includeUnsubscribe && (
                <p className="text-xs text-gray-400 mt-3">
                  <a href="#" className="hover:underline">Unsubscribe</a> from these emails
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-7xl h-[95vh] max-h-[950px] p-0 flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 border-0 shadow-2xl">
        <DialogHeader className="px-8 py-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white shrink-0 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  Email Preview Studio
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </DialogTitle>
                <DialogDescription className="text-purple-100 text-base">
                  Preview how your branded emails will look across all templates
                </DialogDescription>
              </div>
            </div>
            <Button 
              onClick={onClose}
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-3 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shrink-0">
            <div className="flex flex-col gap-3">
              {/* Top Row - Template Selection */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Palette className="w-3 h-3 text-gray-500 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 shrink-0">Templates:</span>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <Button
                      variant={activeTab === "invoice" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("invoice")}
                      className={`text-xs px-2 py-1 rounded-md font-medium transition-all duration-200 min-w-0 ${
                        activeTab === "invoice" 
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md border-0" 
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Invoice
                    </Button>
                    <Button
                      variant={activeTab === "reminder" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("reminder")}
                      className={`text-xs px-2 py-1 rounded-md font-medium transition-all duration-200 min-w-0 ${
                        activeTab === "reminder" 
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md border-0" 
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Reminder
                    </Button>
                    <Button
                      variant={activeTab === "confirmation" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("confirmation")}
                      className={`text-xs px-2 py-1 rounded-md font-medium transition-all duration-200 min-w-0 ${
                        activeTab === "confirmation" 
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md border-0" 
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Payment
                    </Button>
                  </div>
                </div>

                {/* View Mode - Compact */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-1.5 py-0.5 text-xs">
                    Live
                  </Badge>
                  <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewMode("desktop")}
                      className={`text-xs px-1.5 py-1 rounded-sm transition-all duration-200 ${
                        previewMode === "desktop" 
                          ? "bg-white text-gray-900 shadow-sm" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Monitor className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewMode("mobile")}
                      className={`text-xs px-1.5 py-1 rounded-sm transition-all duration-200 ${
                        previewMode === "mobile" 
                          ? "bg-white text-gray-900 shadow-sm" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Smartphone className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
            <div className="min-h-full p-6 sm:p-8">
              <div className={`mx-auto transition-all duration-300 ease-in-out ${
                previewMode === "mobile" 
                  ? "max-w-[375px] transform scale-95" 
                  : "max-w-[750px]"
              }`}>
                <div className="relative">
                  {/* Device Frame Effect */}
                  <div className={`absolute inset-0 rounded-2xl ${
                    previewMode === "mobile" 
                      ? "bg-gray-800 p-2 shadow-2xl" 
                      : "bg-white/40 backdrop-blur-sm border border-white/60 shadow-xl p-4"
                  }`}>
                  </div>
                  <div className="relative z-10">
                    <EmailTemplate type={activeTab} />
                  </div>
                </div>
              </div>
              
              {/* Preview Info Footer */}
              <div className="max-w-[750px] mx-auto mt-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-white/60 shadow-sm">
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live Preview</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <span>Using: {branding.businessName}</span>
                    <span className="text-gray-400">•</span>
                    <span>{previewMode === "mobile" ? "Mobile" : "Desktop"} View</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}