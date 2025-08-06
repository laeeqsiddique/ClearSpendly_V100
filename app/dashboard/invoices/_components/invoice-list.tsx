"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MoreHorizontal, 
  Edit, 
  Send, 
  Download, 
  Trash2, 
  Eye, 
  DollarSign,
  Search,
  Filter,
  Calendar,
  User,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Receipt,
  History
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { parseLocalDate } from "@/lib/date-utils";
import { toast } from "sonner";
import { InvoicePDFViewer } from "./invoice-pdf-viewer";
import { SendEmailDialog } from "./send-email-dialog";
import { PaymentLinkManager } from "./payment-link-manager";
import { InvoicePaymentHistory } from "./invoice-payment-history";

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  payment_status?: string;
  subtotal: number;
  tax_rate: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  subject?: string;
  stripe_payment_link_id?: string;
  stripe_payment_link_url?: string;
  client: {
    name: string;
    email: string;
    company_name?: string;
  };
  template: {
    show_tax: boolean;
  };
}

interface InvoiceListProps {
  refreshTrigger?: number;
  startDate?: string;
  endDate?: string;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800"
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled"
};

export function InvoiceList({ refreshTrigger, startDate, endDate }: InvoiceListProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentManager, setShowPaymentManager] = useState(false);

  const supabase = createClient();

  // Helper function to get the correct amount to display based on tax settings
  const getDisplayAmount = (invoice: Invoice) => {
    return invoice.template.show_tax ? invoice.total_amount : invoice.subtotal;
  };

  // Helper function to get the correct balance due based on tax settings
  const getDisplayBalanceDue = (invoice: Invoice) => {
    const displayAmount = getDisplayAmount(invoice);
    return displayAmount - invoice.amount_paid;
  };

  useEffect(() => {
    fetchInvoices();
  }, [refreshTrigger, startDate, endDate]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      let query = supabase
        .from('invoice')
        .select(`
          id,
          invoice_number,
          issue_date,
          due_date,
          status,
          payment_status,
          subtotal,
          tax_rate,
          total_amount,
          amount_paid,
          balance_due,
          subject,
          stripe_payment_link_id,
          stripe_payment_link_url,
          client:client_id (
            name,
            email,
            company_name
          ),
          template:template_id (
            show_tax
          )
        `)
        .eq('tenant_id', membership.tenant_id);

      // Apply date filter if provided
      if (startDate && endDate) {
        query = query
          .gte('issue_date', startDate)
          .lte('issue_date', endDate);
      }

      const { data, error } = await query.order('issue_date', { ascending: false });

      if (error) throw error;
      
      // Update overdue status for invoices past due date
      const today = new Date().toISOString().split('T')[0];
      const updatedInvoices = (data || []).map(invoice => {
        if (invoice.due_date < today && ['sent', 'viewed'].includes(invoice.status)) {
          return { ...invoice, status: 'overdue' };
        }
        return invoice;
      });

      setInvoices(updatedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesStatus;
  });

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const handleSendInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowEmailDialog(true);
  };

  const handleEmailSent = () => {
    fetchInvoices(); // Refresh to update status
  };

  const handleManagePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentManager(true);
  };

  const handlePaymentLinkUpdated = () => {
    fetchInvoices(); // Refresh to update payment link info
  };

  const handleViewPDF = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setShowPDFViewer(true);
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    // This will be handled by the PDF viewer component
    handleViewPDF(invoiceId);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoice')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error("Failed to delete invoice");
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      const statusLabels = {
        'sent': 'sent',
        'paid': 'paid',
        'cancelled': 'cancelled'
      };

      const { error } = await supabase
        .from('invoice')
        .update({ 
          status: newStatus
        })
        .eq('id', invoiceId);

      if (error) throw error;
      
      toast.success(`Invoice marked as ${statusLabels[newStatus as keyof typeof statusLabels] || newStatus}`);
      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error("Failed to update invoice status");
    }
  };

  const getActionButtons = (invoice: Invoice) => {
    const canSend = ['draft', 'viewed'].includes(invoice.status);
    const canEdit = ['draft'].includes(invoice.status);
    const canDelete = ['draft', 'cancelled'].includes(invoice.status);
    const canManagePayment = !['cancelled'].includes(invoice.status);
    const canMarkSent = ['draft'].includes(invoice.status);
    const canMarkPaid = ['sent', 'viewed', 'overdue'].includes(invoice.status);
    const canCancel = !['paid', 'cancelled'].includes(invoice.status);
    const canMarkDraft = ['sent', 'viewed'].includes(invoice.status);
    const canRecordPayment = !['cancelled'].includes(invoice.status) && getDisplayBalanceDue(invoice) > 0;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleViewPDF(invoice.id)}>
            <Eye className="w-4 h-4 mr-2" />
            View PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownloadPDF(invoice.id)}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </DropdownMenuItem>
          {canSend && (
            <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
              <Send className="w-4 h-4 mr-2" />
              Send Invoice
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {invoice.status === 'overdue' && (
            <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
              <Send className="w-4 h-4 mr-2" />
              Send Reminder
            </DropdownMenuItem>
          )}
          
          {/* Status Change Options */}
          {canMarkDraft && (
            <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'draft')}>
              <Edit className="w-4 h-4 mr-2" />
              Mark as Unsent (Draft)
            </DropdownMenuItem>
          )}
          {canMarkSent && (
            <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'sent')}>
              <Clock className="w-4 h-4 mr-2" />
              Mark as Sent
            </DropdownMenuItem>
          )}
          {canMarkPaid && (
            <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Paid
            </DropdownMenuItem>
          )}
          {canCancel && (
            <DropdownMenuItem 
              onClick={() => handleStatusChange(invoice.id, 'cancelled')}
              className="text-red-600"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Invoice
            </DropdownMenuItem>
          )}
          
          {canRecordPayment && (
            <DropdownMenuItem onClick={() => router.push(`/dashboard/payments/record?invoice=${invoice.id}`)}>
              <Receipt className="w-4 h-4 mr-2" />
              Record Payment
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <InvoicePaymentHistory 
              invoice={invoice}
              trigger={
                <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent">
                  <History className="w-4 h-4 mr-2" />
                  Payment History
                </div>
              }
            />
          </DropdownMenuItem>
          {canManagePayment && (
            <DropdownMenuItem onClick={() => handleManagePayment(invoice)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Link
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem 
              onClick={() => handleDeleteInvoice(invoice.id)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24"></div>
                <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32"></div>
                <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-20"></div>
                <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <CardTitle>Invoice List</CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {paginatedInvoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-4">
              {statusFilter !== "all" 
                ? "Try adjusting your filter criteria"
                : "Create your first invoice to get started"
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{invoice.client.name}</div>
                            {invoice.client.company_name && (
                              <div className="text-sm text-gray-500">{invoice.client.company_name}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{format(parseLocalDate(invoice.issue_date), 'MMM dd, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`${
                          invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''
                        }`}>
                          {format(parseLocalDate(invoice.due_date), 'MMM dd, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={statusColors[invoice.status as keyof typeof statusColors]}
                          >
                            {statusLabels[invoice.status as keyof typeof statusLabels]}
                          </Badge>
                          {invoice.payment_status && invoice.payment_status !== 'unpaid' && (
                            <Badge 
                              variant="secondary" 
                              className={
                                invoice.payment_status === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {invoice.payment_status === 'partial' 
                                ? `Partial (${Math.round((invoice.amount_paid / getDisplayAmount(invoice)) * 100)}%)`
                                : 'Paid'
                              }
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${getDisplayAmount(invoice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={invoice.amount_paid > 0 ? 'text-green-600 font-medium' : ''}>
                          ${invoice.amount_paid.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${
                          getDisplayBalanceDue(invoice) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ${getDisplayBalanceDue(invoice).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getActionButtons(invoice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* PDF Viewer Modal */}
      {selectedInvoiceId && (
        <InvoicePDFViewer
          invoiceId={selectedInvoiceId}
          open={showPDFViewer}
          onClose={() => {
            setShowPDFViewer(false);
            setSelectedInvoiceId(null);
          }}
        />
      )}

      {/* Send Email Dialog */}
      {selectedInvoice && (
        <SendEmailDialog
          open={showEmailDialog}
          onClose={() => {
            setShowEmailDialog(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          onEmailSent={handleEmailSent}
        />
      )}

      {/* Payment Link Manager */}
      {selectedInvoice && (
        <PaymentLinkManager
          open={showPaymentManager}
          onClose={() => {
            setShowPaymentManager(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          onPaymentLinkUpdated={handlePaymentLinkUpdated}
        />
      )}
    </Card>
  );
}