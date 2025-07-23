"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileWarning, 
  Receipt as ReceiptIcon, 
  Calculator,
  ArrowRight,
  DollarSign
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface QuickActionsData {
  overdueCount: number;
  unprocessedCount: number;
  taxDeductible: number;
}

interface QuickActionsProps {
  data?: QuickActionsData;
}

export function QuickActions({ data }: QuickActionsProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const actions = [
    {
      title: "Overdue Invoices",
      value: data?.overdueCount || 0,
      description: "invoices need attention",
      icon: FileWarning,
      color: "from-red-500 to-pink-600",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      iconColor: "text-red-600 dark:text-red-400",
      action: () => router.push('/dashboard/invoices?status=overdue'),
      buttonText: "Review Overdue"
    },
    {
      title: "Unprocessed Receipts",
      value: data?.unprocessedCount || 0,
      description: "receipts pending OCR",
      icon: ReceiptIcon,
      color: "from-orange-500 to-amber-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      action: () => router.push('/dashboard/receipts?status=pending'),
      buttonText: "Process Receipts"
    },
    {
      title: "Tax Deductions YTD",
      value: formatCurrency(data?.taxDeductible || 0),
      description: "in deductible expenses",
      icon: Calculator,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      iconColor: "text-green-600 dark:text-green-400",
      action: () => router.push('/dashboard/analytics?tab=pnl'),
      buttonText: "View Tax Summary"
    }
  ];

  if (!data || (data.overdueCount === 0 && data.unprocessedCount === 0)) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        const hasAction = (action.title === "Overdue Invoices" && action.value > 0) ||
                         (action.title === "Unprocessed Receipts" && action.value > 0) ||
                         action.title === "Tax Deductions YTD";

        return (
          <Card
            key={index}
            className={cn(
              "relative overflow-hidden transition-all",
              hasAction && "hover:shadow-lg cursor-pointer"
            )}
            onClick={hasAction ? action.action : undefined}
          >
            {/* Gradient Background */}
            <div className={cn(
              "absolute inset-0 opacity-5 bg-gradient-to-br",
              action.color
            )} />
            
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg", action.bgColor)}>
                  <Icon className={cn("h-5 w-5", action.iconColor)} />
                </div>
                {hasAction && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {action.title}
                </p>
                <p className="text-2xl font-bold">
                  {typeof action.value === 'string' ? action.value : action.value}
                </p>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
              
              {hasAction && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 -ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.action();
                  }}
                >
                  {action.buttonText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}