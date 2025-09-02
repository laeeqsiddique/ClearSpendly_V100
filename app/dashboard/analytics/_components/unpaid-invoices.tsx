"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";

interface UnpaidInvoicesProps {
  data?: {
    unpaidInvoices: Array<{
      id: string;
      clientName: string;
      amount: number;
      daysOverdue: number;
      issueDate: string;
      status: 'sent' | 'overdue' | 'viewed';
    }>;
    totalUnpaid: number;
    overdueAmount: number;
  };
  loading?: boolean;
}

export function UnpaidInvoices({ data, loading }: UnpaidInvoicesProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Outstanding Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Outstanding Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No outstanding invoices found
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string, daysOverdue: number) => {
    if (daysOverdue > 0) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    switch (status) {
      case 'viewed':
        return <Badge variant="secondary" className="text-xs">Viewed</Badge>;
      case 'sent':
        return <Badge variant="outline" className="text-xs">Sent</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const getUrgencyColor = (daysOverdue: number) => {
    if (daysOverdue > 30) return 'border-l-red-500 bg-red-50';
    if (daysOverdue > 0) return 'border-l-purple-500 bg-purple-50/50';
    return 'border-l-purple-300 bg-purple-50/30'; // Light purple for non-overdue
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Outstanding Invoices
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              ${data.totalUnpaid.toLocaleString()}
            </Badge>
            {data.overdueAmount > 0 && (
              <Badge variant="destructive">${data.overdueAmount.toLocaleString()} overdue</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.unpaidInvoices.map((invoice, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border-l-4 ${getUrgencyColor(invoice.daysOverdue)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{invoice.id}</span>
                  <span className="text-sm text-muted-foreground">• {invoice.clientName}</span>
                  {getStatusBadge(invoice.status, invoice.daysOverdue)}
                </div>
                <span className="font-semibold">${invoice.amount.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Issued: {invoice.issueDate}</span>
                  {invoice.daysOverdue > 0 && (
                    <span className="text-red-600 font-medium">
                      {invoice.daysOverdue} days overdue
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  Send Reminder
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg border">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-lg font-bold">${data.totalUnpaid.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-muted-foreground">Past Due</p>
            <p className="text-lg font-bold text-red-600">${data.overdueAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Action Tip */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
          <p className="text-sm font-medium">⚡ Collection Tip</p>
          <p className="text-xs text-muted-foreground mt-1">
            Follow up on overdue invoices every 7 days. Consider offering payment plans for large amounts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}