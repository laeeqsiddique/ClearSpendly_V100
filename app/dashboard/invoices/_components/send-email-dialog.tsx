"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  Send, 
  Clock, 
  Loader2,
  FileText,
  User,
  Calendar,
  DollarSign,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";

interface SendEmailDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    total_amount: number;
    due_date: string;
    stripe_payment_link_id?: string;
    stripe_payment_link_url?: string;
    paypal_payment_link_id?: string;
    paypal_payment_link_url?: string;
    client: {
      name: string;
      email: string;
      company_name?: string;
    };
  } | null;
  onEmailSent?: () => void;
}

interface EmailTemplate {
  type: 'new' | 'reminder' | 'payment_received';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultSubject: string;
  defaultMessage: string;
  available: boolean;
}

export function SendEmailDialog({ open, onClose, invoice, onEmailSent }: SendEmailDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (!invoice) return null;

  const daysOverdue = invoice.due_date ? 
    Math.max(0, Math.ceil((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const emailTemplates: EmailTemplate[] = [
    {
      type: 'new',
      label: 'Send Invoice',
      description: 'Send the invoice to your client for the first time',
      icon: Send,
      defaultSubject: `Invoice ${invoice.invoice_number} from Your Business`,
      defaultMessage: 'Please find attached your invoice. Thank you for your business!',
      available: ['draft', 'sent'].includes(invoice.status)
    },
    {
      type: 'reminder',
      label: 'Payment Reminder',
      description: `Send a payment reminder (${daysOverdue} days overdue)`,
      icon: Clock,
      defaultSubject: `Payment Reminder: Invoice ${invoice.invoice_number}`,
      defaultMessage: 'This is a friendly reminder that payment for this invoice is now overdue. Please process payment at your earliest convenience.',
      available: invoice.status === 'sent' && daysOverdue > 0
    },
    {
      type: 'payment_received',
      label: 'Payment Confirmation',
      description: 'Send a payment received confirmation',
      icon: DollarSign,
      defaultSubject: `Payment Received - Invoice ${invoice.invoice_number}`,
      defaultMessage: 'Thank you for your payment! We have successfully received your payment.',
      available: invoice.status === 'paid'
    }
  ];

  const availableTemplates = emailTemplates.filter(template => template.available);


  const handleTemplateSelect = (templateType: string) => {
    const template = emailTemplates.find(t => t.type === templateType);
    if (template) {
      setSelectedTemplate(templateType);
      setCustomSubject(template.defaultSubject);
      setCustomMessage(template.defaultMessage);
    }
  };


  const handleSendEmail = async () => {
    if (!selectedTemplate) {
      toast.error('Please select an email template');
      return;
    }

    if (!customSubject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    try {
      setSending(true);

      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          emailType: selectedTemplate,
          customSubject: customSubject.trim(),
          customMessage: customMessage.trim() || undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      toast.success('Email sent successfully!');
      onEmailSent?.();
      onClose();
      
      // Reset form
      setSelectedTemplate('');
      setCustomSubject('');
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Invoice Email
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Invoice Summary */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium">Invoice {invoice.invoice_number}</span>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{invoice.client.name}</div>
                    <div className="text-gray-600">{invoice.client.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-600">Due Date</div>
                    <div className={`font-medium ${daysOverdue > 0 ? 'text-red-600' : ''}`}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                      {daysOverdue > 0 && (
                        <span className="text-red-600 ml-1">({daysOverdue} days overdue)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-600">Amount</div>
                    <div className="font-medium">${invoice.total_amount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Template Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Choose Email Type</Label>
            
            {availableTemplates.length === 0 ? (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">No email templates are available for this invoice status.</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {availableTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <Card 
                      key={template.type}
                      className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                        selectedTemplate === template.type 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleTemplateSelect(template.type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selectedTemplate === template.type 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="font-medium">{template.label}</div>
                            <div className="text-sm text-gray-600">{template.description}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {selectedTemplate && (
            <>
              <div className="border-t my-6"></div>
              
              {/* Email Customization */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Customize Email</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Email subject line"
                    className="h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Custom Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message that will be included in the email"
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    This message will be included in the email along with the standard invoice information.
                  </p>
                </div>
              </div>

              {/* Payment Options Info */}
              {['new', 'reminder'].includes(selectedTemplate) && (
                <div className="pt-4 border-t">
                  <Alert className="border-blue-200 bg-blue-50">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      <strong>Payment Options:</strong> Stripe and PayPal payment options are configured in your email template settings and will automatically appear in the email if enabled.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleSendEmail} 
            disabled={!selectedTemplate || !customSubject.trim() || sending}
            className="min-w-[140px]"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}