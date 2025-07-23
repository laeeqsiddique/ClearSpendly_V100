"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Mail, 
  Eye, 
  FileText,
  Loader2,
  AlertCircle,
  RefreshCcw
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePDF, downloadInvoicePDF } from "@/lib/pdf-generator";
import { toast } from "sonner";
import { SendEmailDialog } from "./send-email-dialog";

interface InvoicePDFViewerProps {
  invoiceId: string;
  open: boolean;
  onClose: () => void;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  subject?: string;
  notes?: string;
  terms?: string;
  footer_text?: string;
  currency: string;
  client: any;
  template: any;
  items: any[];
  business: any;
}

export function InvoicePDFViewer({ invoiceId, open, onClose }: InvoicePDFViewerProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoiceData();
    }
  }, [open, invoiceId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant membership found");

      // Fetch invoice with all related data
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice')
        .select(`
          *,
          client:client_id (*),
          template:template_id (*),
          items:invoice_item (*)
        `)
        .eq('id', invoiceId)
        .eq('tenant_id', membership.tenant_id)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) throw new Error("Invoice not found");

      // Get business information from user profile or tenant
      const { data: profile } = await supabase
        .from('tenant')
        .select('*')
        .eq('id', membership.tenant_id)
        .single();

      const businessInfo = {
        name: profile?.name || "Your Business",
        email: user.email || "",
        phone: profile?.phone || "",
        website: profile?.website || "",
        address_line1: profile?.address_line1 || "",
        address_line2: profile?.address_line2 || "",
        city: profile?.city || "",
        state: profile?.state || "",
        postal_code: profile?.postal_code || "",
        country: profile?.country || "United States"
      };

      const completeInvoiceData: InvoiceData = {
        ...invoiceData,
        business: businessInfo,
        items: invoiceData.items || []
      };


      setInvoice(completeInvoiceData);
      await generatePDFPreview(completeInvoiceData);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError(error instanceof Error ? error.message : "Failed to load invoice");
      toast.error("Failed to load invoice data");
    } finally {
      setLoading(false);
    }
  };

  const generatePDFPreview = async (invoiceData: InvoiceData) => {
    try {
      setGenerating(true);
      
      // Use new HTML-to-PDF API for preview (pass data directly to avoid auth issues)
      const response = await fetch('/api/invoices/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceData: invoiceData })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const pdfBlob = await response.blob();
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError("Failed to generate PDF preview");
      toast.error("Failed to generate PDF preview");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;

    try {
      setGenerating(true);
      
      // Use new HTML-to-PDF API for download (pass data directly to avoid auth issues)
      const response = await fetch('/api/invoices/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceData: invoice })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error("Failed to download PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = () => {
    setShowEmailDialog(true);
  };

  const handleEmailSent = () => {
    // Refresh invoice data to update status
    fetchInvoiceData();
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
      <DialogContent className="max-w-[95vw] w-[1600px] max-h-[95vh] h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Invoice Preview
                  </DialogTitle>
                  {invoice && (
                    <p className="text-gray-600 text-sm">
                      #{invoice.invoice_number} • {invoice.client.name}
                    </p>
                  )}
                </div>
              </div>
              {invoice && (
                <Badge className={`${getStatusColor(invoice.status)} border shadow-sm`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={!invoice}
                className="border-blue-200 hover:bg-blue-50 hover:border-blue-300"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                disabled={!invoice || generating}
                className="bg-[#0071e3] hover:bg-[#0051a2] text-white"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-50 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#0071e3]" />
                <div>
                  <h3 className="font-medium text-gray-900">Loading Invoice</h3>
                  <p className="text-gray-500 text-sm mt-1">Please wait...</p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <Card className="w-96 border-red-200">
                <CardContent className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Error Loading Invoice</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Button 
                    onClick={fetchInvoiceData} 
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : generating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#0071e3]" />
                <div>
                  <h3 className="font-medium text-gray-900">Generating Preview</h3>
                  <p className="text-gray-500 text-sm mt-1">This may take a moment...</p>
                </div>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="h-full bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Invoice PDF Preview"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Eye className="w-12 h-12 text-blue-400 mx-auto" />
                <div>
                  <h3 className="font-medium text-gray-900">No Preview Available</h3>
                  <p className="text-gray-500 text-sm mt-1">Unable to generate PDF preview</p>
                </div>
                <Button 
                  onClick={() => invoice && generatePDFPreview(invoice)} 
                  variant="outline"
                  className="mt-2 border-blue-200 hover:bg-blue-50"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Regenerate Preview
                </Button>
              </div>
            </div>
          )}
        </div>

        {invoice && (
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-t px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">Invoice #{invoice.invoice_number}</span>
                <span className="text-blue-300">•</span>
                <span className="text-gray-600">{invoice.client.name}</span>
                <span className="text-blue-300">•</span>
                <span className="font-medium text-gray-900">${invoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="text-gray-600 font-medium">
                Due: {new Date(invoice.due_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
        )}

        {/* Send Email Dialog */}
        {invoice && (
          <SendEmailDialog
            open={showEmailDialog}
            onClose={() => setShowEmailDialog(false)}
            invoice={{
              id: invoice.id,
              invoice_number: invoice.invoice_number,
              status: invoice.status,
              total_amount: invoice.total_amount,
              due_date: invoice.due_date,
              client: invoice.client
            }}
            onEmailSent={handleEmailSent}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}