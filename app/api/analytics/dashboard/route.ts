import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    // Get date range from query params
    const fromDate = searchParams.get('from') || format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const toDate = searchParams.get('to') || format(endOfMonth(new Date()), 'yyyy-MM-dd');
    
    // Calculate previous period for comparison
    const currentStart = new Date(fromDate);
    const currentEnd = new Date(toDate);
    const periodLength = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - periodLength);
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);

    // With RLS properly implemented, we don't need to manually get tenant_id
    // The RLS policies will automatically filter based on user's membership
    console.log('Analytics dashboard using authenticated user:', user.id);

    // Fetch current period revenue (RLS handles tenant filtering)
    const { data: currentRevenue } = await supabase
      .from('payment')
      .select('amount')
      .gte('payment_date', fromDate)
      .lte('payment_date', toDate);

    // Fetch previous period revenue
    const { data: previousRevenue } = await supabase
      .from('payment')
      .select('amount')
      .gte('payment_date', format(previousStart, 'yyyy-MM-dd'))
      .lte('payment_date', format(previousEnd, 'yyyy-MM-dd'));

    // Fetch current period expenses (RLS handles tenant filtering)
    const { data: currentExpenses } = await supabase
      .from('receipt')
      .select('total_amount')
      .gte('receipt_date', fromDate)
      .lte('receipt_date', toDate);
    
    console.log('Expenses query result:', { count: currentExpenses?.length || 0 });

    // Fetch previous period expenses
    const { data: previousExpenses } = await supabase
      .from('receipt')
      .select('total_amount')
      .gte('receipt_date', format(previousStart, 'yyyy-MM-dd'))
      .lte('receipt_date', format(previousEnd, 'yyyy-MM-dd'));

    // Fetch outstanding invoices
    const { data: outstandingInvoices } = await supabase
      .from('invoice')
      .select('balance_due')
      .gt('balance_due', 0);

    // Calculate metrics
    const currentRevenueTotal = currentRevenue?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const previousRevenueTotal = previousRevenue?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const currentExpensesTotal = currentExpenses?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
    const previousExpensesTotal = previousExpenses?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
    const outstandingTotal = outstandingInvoices?.reduce((sum, item) => sum + (item.balance_due || 0), 0) || 0;

    const currentProfit = currentRevenueTotal - currentExpensesTotal;
    const previousProfit = previousRevenueTotal - previousExpensesTotal;

    // Calculate percentage changes
    const revenueChange = previousRevenueTotal > 0 
      ? ((currentRevenueTotal - previousRevenueTotal) / previousRevenueTotal) * 100 
      : 0;
    const expenseChange = previousExpensesTotal > 0 
      ? ((currentExpensesTotal - previousExpensesTotal) / previousExpensesTotal) * 100 
      : 0;
    const profitChange = previousProfit !== 0 
      ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100 
      : 0;

    // Fetch top clients with more details
    const { data: topClients } = await supabase
      .from('client')
      .select(`
        id,
        name,
        email,
        invoice:invoice(
          id,
          total_amount,
          issue_date,
          payment_allocation:payment_allocation(
            allocated_amount,
            payment:payment(payment_date)
          )
        )
      `)
      .limit(10);

    // Process client data to calculate metrics
    const processedClients = topClients?.map(client => {
      const payments = client.invoice
        ?.flatMap(inv => inv.payment_allocation || [])
        .filter(pa => {
          const paymentDate = new Date(pa.payment?.payment_date);
          return paymentDate >= new Date(fromDate) && paymentDate <= new Date(toDate);
        }) || [];
      
      const totalRevenue = payments.reduce((sum, pa) => sum + (pa.allocated_amount || 0), 0);
      
      // Calculate average payment days (simplified)
      const avgPaymentDays = payments.length > 0 ? 25 : 30; // Default estimate
      
      return {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        amount: totalRevenue,
        invoice_count: client.invoice?.length || 0,
        avg_payment_days: avgPaymentDays,
        last_invoice: client.invoice?.[0]?.issue_date || null,
        trend: 'stable',
        change_percent: 0
      };
    }).filter(client => client.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5) || [];

    // Simple monthly revenue data for last 3 months
    const threeMonthsAgo = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
    const monthlyRevenue = [];
    
    // Create simple monthly data for last 3 months
    for (let i = 2; i >= 0; i--) {
      const monthStart = format(subMonths(startOfMonth(new Date()), i), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd');
      const monthLabel = format(subMonths(new Date(), i), 'yyyy-MM');
      
      // Get payments for this month
      const { data: monthPayments } = await supabase
        .from('payment')
        .select('amount')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd);
      
      // Get expenses for this month  
      const { data: monthExpenses } = await supabase
        .from('receipt')
        .select('total_amount')
        .gte('receipt_date', monthStart)
        .lte('receipt_date', monthEnd);
      
      const monthIncome = monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const monthExpenseTotal = monthExpenses?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
      
      monthlyRevenue.push({
        month: monthLabel,
        revenue: monthIncome,
        expenses: monthExpenseTotal
      });
    }

    // Fetch expense breakdown with direct query (RLS handles tenant filtering)
    const { data: receipts } = await supabase
      .from('receipt')
      .select('category, total_amount')
      .gte('receipt_date', fromDate)
      .lte('receipt_date', toDate);
    
    const expensesByCategory = receipts?.reduce((acc: any, receipt) => {
      const category = receipt.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + (receipt.total_amount || 0);
      return acc;
    }, {}) || {};

    // Quick actions data
    const { data: overdueInvoices } = await supabase
      .from('invoice')
      .select('id')
      .eq('status', 'overdue');

    const { data: unprocessedReceipts } = await supabase
      .from('receipt')
      .select('id')
      .eq('ocr_status', 'pending');

    const heroMetrics = {
      revenue: {
        current: currentRevenueTotal,
        previous: previousRevenueTotal,
        change: revenueChange,
        trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable',
        alert: revenueChange < -20 ? 'Revenue down significantly' : undefined
      },
      expenses: {
        current: currentExpensesTotal,
        previous: previousExpensesTotal,
        change: expenseChange,
        trend: expenseChange > 0 ? 'up' : expenseChange < 0 ? 'down' : 'stable',
        alert: expenseChange > 30 ? 'Expenses increased significantly' : undefined
      },
      netProfit: {
        current: currentProfit,
        previous: previousProfit,
        change: profitChange,
        trend: profitChange > 0 ? 'up' : profitChange < 0 ? 'down' : 'stable',
        alert: currentProfit < 0 ? 'Operating at a loss' : undefined
      },
      outstandingInvoices: {
        current: outstandingTotal,
        previous: 0,
        change: 0,
        trend: 'stable',
        alert: overdueInvoices && overdueInvoices.length > 3 ? `${overdueInvoices.length} invoices overdue` : undefined
      }
    };

    const quickActions = {
      overdueCount: overdueInvoices?.length || 0,
      unprocessedCount: unprocessedReceipts?.length || 0,
      taxDeductible: currentExpensesTotal * 0.7, // Rough estimate
    };

    // Simple expense breakdown for new components
    const expenseBreakdown = {
      categories: Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount: Number(amount),
        count: currentExpenses?.filter(e => (e.category || 'Uncategorized') === category).length || 0
      })),
      totalExpenses: currentExpensesTotal
    };

    // Cash flow data
    const cashFlowData = {
      monthlyData: monthlyRevenue?.map((month: any) => ({
        month: new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        income: month.revenue || 0,
        expenses: month.expenses || 0,
        profit: (month.revenue || 0) - (month.expenses || 0)
      })) || [],
      currentMonth: {
        income: currentRevenueTotal,
        expenses: currentExpensesTotal,
        profit: currentProfit
      }
    };

    // Unpaid invoices data
    const { data: unpaidInvoicesData } = await supabase
      .from('invoice')
      .select(`
        id,
        invoice_number,
        client:client(name),
        total_amount,
        balance_due,
        issue_date,
        status,
        due_date
      `)
      .gt('balance_due', 0)
      .order('issue_date', { ascending: false })
      .limit(10);

    const unpaidInvoices = {
      unpaidInvoices: unpaidInvoicesData?.map(invoice => {
        const dueDate = new Date(invoice.due_date || invoice.issue_date);
        const today = new Date();
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          id: invoice.invoice_number || invoice.id, // Use invoice_number if available, fallback to id
          clientName: invoice.client?.name || 'Unknown Client',
          amount: invoice.balance_due || 0,
          daysOverdue,
          issueDate: new Date(invoice.issue_date).toLocaleDateString(),
          status: daysOverdue > 0 ? 'overdue' : invoice.status || 'sent'
        };
      }) || [],
      totalUnpaid: outstandingTotal,
      overdueAmount: unpaidInvoicesData?.reduce((sum, inv) => {
        const dueDate = new Date(inv.due_date || inv.issue_date);
        const today = new Date();
        const isOverdue = today > dueDate;
        return sum + (isOverdue ? (inv.balance_due || 0) : 0);
      }, 0) || 0
    };

    return NextResponse.json({
      heroMetrics,
      quickActions,
      topClients: processedClients,
      clientData: processedClients,
      revenueData: monthlyRevenue,
      expenseData: expensesByCategory || {},
      // New simple component data
      expenseBreakdown,
      cashFlowData,
      unpaidInvoices,
      dateRange: { from: fromDate, to: toDate }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}