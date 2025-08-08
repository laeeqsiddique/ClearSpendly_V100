"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  FileText, 
  Printer,
  FileSpreadsheet
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PnLData {
  revenue: {
    total: number;
    byClient: Array<{ name: string; amount: number }>;
  };
  expenses: {
    total: number;
    byCategory: Array<{ category: string; amount: number }>;
  };
  netProfit: number;
  profitMargin: number;
  previousPeriod?: {
    revenue: number;
    expenses: number;
    netProfit: number;
    profitMargin: number;
  };
}

interface ProfitLossStatementProps {
  data?: PnLData;
  dateRange?: DateRange;
}

export function ProfitLossStatement({ data, dateRange }: ProfitLossStatementProps) {
  const [pnlData, setPnlData] = useState<PnLData | null>(data || null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (!data) {
      fetchPnLData();
    } else {
      setPnlData(data);
    }
  }, [data, dateRange]);

  const fetchPnLData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (dateRange?.from) {
        params.append('from', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        params.append('to', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/analytics/pnl?${params}`);
      if (!response.ok) throw new Error('Failed to fetch P&L data');
      
      const pnl = await response.json();
      setPnlData(pnl);
    } catch (error) {
      console.error('Error fetching P&L:', error);
      toast.error('Failed to load P&L data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams();
      params.append('format', exportFormat);
      
      if (dateRange?.from) {
        params.append('from', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        params.append('to', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/analytics/export?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `P&L-Statement-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`P&L statement exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export P&L statement');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">Profit & Loss Statement</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pnlData) {
    return (
      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">Profit & Loss Statement</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Use real data
  const realPnLData: PnLData = pnlData;

  return (
    <Card className="print:shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Profit & Loss Statement</CardTitle>
            <CardDescription>
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                : 'Current Period'}
            </CardDescription>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Revenue Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">REVENUE</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{formatCurrency(realPnLData.revenue.total)}</span>
            </div>
          </div>
          <div className="space-y-2 ml-4">
            {realPnLData.revenue.byClient.map((client, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{client.name}</span>
                <span>{formatCurrency(client.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Expenses Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">EXPENSES</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{formatCurrency(realPnLData.expenses.total)}</span>
            </div>
          </div>
          <div className="space-y-2 ml-4">
            {realPnLData.expenses.byCategory.map((expense, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{expense.category}</span>
                <span>{formatCurrency(expense.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Net Profit Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">NET PROFIT</h3>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-3xl font-bold",
                realPnLData.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatCurrency(realPnLData.netProfit)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">PROFIT MARGIN</h3>
            <span className={cn(
              "text-2xl font-bold",
              realPnLData.profitMargin >= 50 ? "text-green-600 dark:text-green-400" : 
              realPnLData.profitMargin >= 20 ? "text-yellow-600 dark:text-yellow-400" : 
              "text-red-600 dark:text-red-400"
            )}>
              {realPnLData.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Summary Box */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-3">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Gross Revenue</p>
              <p className="font-semibold">{formatCurrency(realPnLData.revenue.total)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Expenses</p>
              <p className="font-semibold">{formatCurrency(realPnLData.expenses.total)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net Profit</p>
              <p className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(realPnLData.netProfit)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Margin</p>
              <p className="font-semibold">{realPnLData.profitMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-xs text-muted-foreground pt-4 print:pt-8">
          <p>This P&L statement is based on cash basis accounting using paid invoices and recorded expenses.</p>
          <p>Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
        </div>
      </CardContent>
    </Card>
  );
}