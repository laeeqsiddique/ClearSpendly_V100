import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { format, startOfMonth, endOfMonth } from "date-fns";

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

    // RLS will handle tenant filtering automatically based on user membership

    // Get basic P&L data with direct queries
    const { data: payments } = await supabase
      .from('payment')
      .select('amount')
      .gte('payment_date', fromDate)
      .lte('payment_date', toDate);

    const { data: expenses } = await supabase
      .from('receipt')
      .select('total_amount')
      .gte('receipt_date', fromDate)
      .lte('receipt_date', toDate);

    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const basicPnL = {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      profit_margin: profitMargin
    };

    // Get revenue breakdown by client (RLS handles tenant filtering)
    const { data: revenueByClient } = await supabase
      .from('client')
      .select(`
        name,
        invoice:invoice(
          payment_allocation:payment_allocation(
            allocated_amount,
            payment:payment(payment_date)
          )
        )
      `);

    const clientRevenue = revenueByClient?.map(client => {
      const payments = client.invoice
        ?.flatMap(inv => inv.payment_allocation || [])
        .filter(pa => {
          const paymentDate = new Date(pa.payment?.payment_date);
          return paymentDate >= new Date(fromDate) && paymentDate <= new Date(toDate);
        }) || [];
      
      const totalAmount = payments.reduce((sum, pa) => sum + (pa.allocated_amount || 0), 0);
      
      return {
        name: client.name,
        amount: totalAmount
      };
    }).filter(client => client.amount > 0)
      .sort((a, b) => b.amount - a.amount) || [];

    // Get expense breakdown with direct query (RLS handles tenant filtering)
    const { data: expenseBreakdown } = await supabase
      .from('receipt')
      .select('category, total_amount')
      .gte('receipt_date', fromDate)
      .lte('receipt_date', toDate);

    const expenseCategories = expenseBreakdown?.reduce((acc: any, expense) => {
      const category = expense.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + (expense.total_amount || 0);
      return acc;
    }, {});

    const expenseCategoriesArray = Object.entries(expenseCategories || {}).map(([category, amount]) => ({
      category,
      amount: Number(amount)
    })).sort((a, b) => b.amount - a.amount);

    // Get previous period for comparison
    const periodLength = Math.ceil(
      (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const prevStartDate = new Date(new Date(fromDate).getTime() - periodLength * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(new Date(fromDate).getTime() - 24 * 60 * 60 * 1000);

    // Get previous period data with direct queries
    const { data: prevPayments } = await supabase
      .from('payment')
      .select('amount')
      .gte('payment_date', format(prevStartDate, 'yyyy-MM-dd'))
      .lte('payment_date', format(prevEndDate, 'yyyy-MM-dd'));

    const { data: prevExpenses } = await supabase
      .from('receipt')
      .select('total_amount')
      .gte('receipt_date', format(prevStartDate, 'yyyy-MM-dd'))
      .lte('receipt_date', format(prevEndDate, 'yyyy-MM-dd'));

    const prevRevenue = prevPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const prevExpenseTotal = prevExpenses?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
    const prevNetProfit = prevRevenue - prevExpenseTotal;
    const prevProfitMargin = prevRevenue > 0 ? (prevNetProfit / prevRevenue) * 100 : 0;

    const prevPeriod = {
      total_revenue: prevRevenue,
      total_expenses: prevExpenseTotal,
      net_profit: prevNetProfit,
      profit_margin: prevProfitMargin
    };

    const response = {
      revenue: {
        total: basicPnL.total_revenue,
        byClient: clientRevenue
      },
      expenses: {
        total: basicPnL.total_expenses,
        byCategory: expenseCategoriesArray
      },
      netProfit: basicPnL.net_profit,
      profitMargin: basicPnL.profit_margin,
      previousPeriod: {
        revenue: prevPeriod.total_revenue,
        expenses: prevPeriod.total_expenses,
        netProfit: prevPeriod.net_profit,
        profitMargin: prevPeriod.profit_margin
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('P&L API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch P&L data" },
      { status: 500 }
    );
  }
}