"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Users,
  Clock,
  DollarSign,
  ArrowUpRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ClientData {
  id: string;
  name: string;
  email: string;
  revenue: number;
  invoiceCount: number;
  avgPaymentDays: number;
  lastInvoiceDate: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface ClientPerformanceProps {
  data?: any[];
  detailed?: boolean;
}

export function ClientPerformance({ data, detailed = false }: ClientPerformanceProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentBadge = (days: number) => {
    if (days <= 15) return { label: "Fast", className: "bg-green-100 text-green-700 dark:bg-green-900/20" };
    if (days <= 30) return { label: "Normal", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/20" };
    if (days <= 45) return { label: "Slow", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20" };
    return { label: "Very Slow", className: "bg-red-100 text-red-700 dark:bg-red-900/20" };
  };

  const realClientData: ClientData[] = data?.slice(0, detailed ? 10 : 5).map((client, index) => ({
    id: client.client_id || `client-${index}`,
    name: client.client_name || `Client ${index + 1}`,
    email: client.client_email || 'No email provided',
    revenue: parseFloat(client.amount) || 0,
    invoiceCount: client.invoice_count || 1,
    avgPaymentDays: client.avg_payment_days || 30,
    lastInvoiceDate: client.last_invoice || new Date().toISOString(),
    trend: client.trend || 'stable',
    changePercent: client.change_percent || 0
  })) || [];

  const totalRevenue = realClientData.reduce((sum, client) => sum + client.revenue, 0);

  if (!data || data.length === 0) {
    return (
      <Card className={detailed ? "col-span-full" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Performance
          </CardTitle>
          <CardDescription>No client data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={detailed ? "col-span-full" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Performance
            </CardTitle>
            <CardDescription>
              {detailed ? "Detailed client analytics and payment patterns" : "Top performing clients"}
            </CardDescription>
          </div>
          {!detailed && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard/analytics?tab=clients')}
            >
              View All
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                {detailed && <TableHead className="text-center">Invoices</TableHead>}
                <TableHead className="text-center">Payment Speed</TableHead>
                {detailed && <TableHead className="text-center">Trend</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {realClientData.map((client) => {
                const paymentBadge = getPaymentBadge(client.avgPaymentDays);
                const revenuePercent = (client.revenue / totalRevenue) * 100;
                
                return (
                  <TableRow 
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/invoices?client=${client.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-medium">{formatCurrency(client.revenue)}</p>
                        {detailed && (
                          <Progress 
                            value={revenuePercent} 
                            className="h-1.5 mt-1"
                          />
                        )}
                      </div>
                    </TableCell>
                    {detailed && (
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {client.invoiceCount}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge className={cn(paymentBadge.className, "text-xs")}>
                          {paymentBadge.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {client.avgPaymentDays} days
                        </span>
                      </div>
                    </TableCell>
                    {detailed && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {client.trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : client.trend === 'down' ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                          <span className={cn(
                            "text-sm font-medium",
                            client.trend === 'up' ? "text-green-600" : 
                            client.trend === 'down' ? "text-red-600" : 
                            "text-muted-foreground"
                          )}>
                            {client.changePercent > 0 ? '+' : ''}{client.changePercent.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {detailed && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Client Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Average Payment Time</p>
                <p className="text-2xl font-bold">
                  {realClientData.length > 0 ? 
                    Math.round(realClientData.reduce((sum, c) => sum + c.avgPaymentDays, 0) / realClientData.length) : 0
                  } days
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold">{realClientData.length}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}