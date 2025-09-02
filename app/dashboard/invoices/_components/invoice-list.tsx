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
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800"
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
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

  // Check if invoice is overdue
  const isOverdue = (invoice: Invoice) => {
    if (['paid', 'cancelled', 'draft'].includes(invoice.status)) return false;
    const today = new Date().toISOString().split('T')[0];
    return invoice.due_date < today;
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
      
      // Don't modify status for overdue - it's just a visual indicator now

      setInvoices(data || []);
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

  // Status change handler
  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success(`Invoice status updated to ${statusLabels[newStatus as keyof typeof statusLabels]}`);
      fetchInvoices(); // Refresh list
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  // Inline status selector component
  const InvoiceStatusSelector = ({ invoice }: { invoice: Invoice }) => {
    const [isChanging, setIsChanging] = useState(false);
    
    // Define allowed status transitions
    const allowedTransitions: { [key: string]: string[] } = {
      draft: ['sent', 'cancelled'],
      sent: ['paid', 'cancelled', 'draft'],
      paid: ['sent'], // Can reopen if needed
      cancelled: ['draft'] // Can reactivate
    };

    const availableStatuses = allowedTransitions[invoice.status] || [];
    
    // If no transitions available, show as static badge
    if (availableStatuses.length === 0) {
      return (
        <Badge 
          variant="secondary" 
          className={statusColors[invoice.status as keyof typeof statusColors]}
        >
          {statusLabels[invoice.status as keyof typeof statusLabels]}
        </Badge>
      );
    }

    return (
      <Select 
        value={invoice.status} 
        onValueChange={async (newStatus) => {
          setIsChanging(true);
          await handleStatusChange(invoice.id, newStatus);
          setIsChanging(false);
        }}
        disabled={isChanging}
      >
        <SelectTrigger 
          className={`w-auto h-6 border-0 px-2 text-xs font-medium ${statusColors[invoice.status as keyof typeof statusColors]} hover:opacity-80 transition-opacity`}
        >
          <SelectValue>
            {isChanging ? 'Updating...' : statusLabels[invoice.status as keyof typeof statusLabels]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableStatuses.map(status => (
            <SelectItem key={status} value={status}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  statusColors[status as keyof typeof statusColors].includes('red') ? 'bg-red-500' : 
                  statusColors[status as keyof typeof statusColors].includes('green') ? 'bg-green-500' : 
                  statusColors[status as keyof typeof statusColors].includes('blue') ? 'bg-blue-500' : 
                  statusColors[status as keyof typeof statusColors].includes('yellow') ? 'bg-yellow-500' : 
                  'bg-gray-500'
                }`}></div>
                {statusLabels[status as keyof typeof statusLabels]}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
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

  const getActionButtons = (invoice: Invoice) => {
    const canSend = ['draft'].includes(invoice.status);
    const canEdit = ['draft'].includes(invoice.status);
    const canDelete = ['draft', 'cancelled'].includes(invoice.status);
    const canMarkSent = ['draft'].includes(invoice.status);
    const canMarkPaid = ['sent'].includes(invoice.status);
    const canCancel = !['paid', 'cancelled'].includes(invoice.status);
    const canMarkDraft = ['sent'].includes(invoice.status);
    const canRecordPayment = !['cancelled'].includes(invoice.status) && getDisplayBalanceDue(invoice) > 0;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-2 touch-manipulation">
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
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 sm:space-x-4 animate-pulse">
                <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-20 sm:w-24"></div>
                <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24 sm:w-32"></div>
                <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-16 sm:w-20"></div>
                <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-12 sm:w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-start sm:items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Invoice List</CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10 sm:h-9 text-sm">
                <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6">
        {paginatedInvoices.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4">
              {statusFilter !== "all" 
                ? "Try adjusting your filter criteria"
                : "Create your first invoice to get started"
              }
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="block lg:hidden space-y-3">
              {paginatedInvoices.map((invoice) => (
                <div key={invoice.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{invoice.invoice_number}</span>
                      <InvoiceStatusSelector invoice={invoice} />
                      {isOverdue(invoice) && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    {getActionButtons(invoice)}
                  </div>
                  
                  {/* Client Info */}
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{invoice.client.name}</div>
                      {invoice.client.company_name && (
                        <div className="text-xs text-gray-500 truncate">{invoice.client.company_name}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">Issued:</span>
                      <span>{format(parseLocalDate(invoice.issue_date), 'MMM dd')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">Due:</span>
                      <span className={isOverdue(invoice) ? 'text-red-600 font-medium' : ''}>
                        {format(parseLocalDate(invoice.due_date), 'MMM dd')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Amount Info */}
                  <div className="grid grid-cols-3 gap-3 text-xs border-t pt-3">
                    <div className="text-center">
                      <div className="text-gray-600">Total</div>
                      <div className="font-medium">${getDisplayAmount(invoice).toFixed(0)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Paid</div>
                      <div className={`font-medium ${invoice.amount_paid > 0 ? 'text-green-600' : ''}`}>
                        ${invoice.amount_paid.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Balance</div>
                      <div className={`font-medium ${
                        getDisplayBalanceDue(invoice) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ${getDisplayBalanceDue(invoice).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop: Table Layout */}
            <div className="hidden lg:block overflow-x-auto">
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
                          isOverdue(invoice) ? 'text-red-600 font-medium' : ''
                        }`}>
                          {format(parseLocalDate(invoice.due_date), 'MMM dd, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <InvoiceStatusSelector invoice={invoice} />
                          {/* Overdue indicator */}
                          {isOverdue(invoice) && (
                            <Badge 
                              variant="secondary" 
                              className="bg-red-100 text-red-800"
                            >
                              Overdue
                            </Badge>
                          )}
                          {/* Payment status indicator */}
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
                </div>
                <div className="flex items-center justify-center sm:justify-end space-x-2">
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

    </Card>
  );
}