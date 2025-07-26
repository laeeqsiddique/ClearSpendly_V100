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

    // Get basic P&L data using the database function
    let pnlData = null;
    
    try {
      const { data, error: pnlError } = await supabase
        .rpc('get_basic_pnl', {
          p_start_date: fromDate,
          p_end_date: toDate
        });

      if (pnlError) {
        console.error('P&L query error:', pnlError);
        // Use fallback calculations
        pnlData = [{ total_revenue: 0, total_expenses: 0, net_profit: 0, profit_margin: 0 }];
      } else {
        pnlData = data;
      }
    } catch (error) {
      console.error('P&L function error:', error);
      // Use fallback calculations
      pnlData = [{ total_revenue: 0, total_expenses: 0, net_profit: 0, profit_margin: 0 }];
    }

    const basicPnL = pnlData?.[0] || {
      total_revenue: 0,
      total_expenses: 0,
      net_profit: 0,
      profit_margin: 0
    };

    // Get revenue breakdown by client
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
      `)
      .eq('tenant_id', tenant_id);

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

    // Get expense breakdown using the database function
    const { data: expenseBreakdown } = await supabase
      .rpc('get_expense_breakdown', {
        p_tenant_id: tenant_id,
        p_start_date: fromDate,
        p_end_date: toDate
      });

    const expenseCategories = expenseBreakdown?.map(expense => ({
      category: expense.category,
      amount: parseFloat(expense.total_amount)
    })) || [];

    // Get previous period for comparison
    const periodLength = Math.ceil(
      (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const prevStartDate = new Date(new Date(fromDate).getTime() - periodLength * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(new Date(fromDate).getTime() - 24 * 60 * 60 * 1000);

    let previousPnL = null;
    
    try {
      const { data } = await supabase
        .rpc('get_basic_pnl', {
          p_start_date: format(prevStartDate, 'yyyy-MM-dd'),
          p_end_date: format(prevEndDate, 'yyyy-MM-dd')
        });
      previousPnL = data;
    } catch (error) {
      console.error('Previous P&L error:', error);
      previousPnL = null;
    }

    const prevPeriod = previousPnL?.[0];

    const response = {
      revenue: {
        total: parseFloat(basicPnL.total_revenue),
        byClient: clientRevenue
      },
      expenses: {
        total: parseFloat(basicPnL.total_expenses),
        byCategory: expenseCategories
      },
      netProfit: parseFloat(basicPnL.net_profit),
      profitMargin: parseFloat(basicPnL.profit_margin),
      previousPeriod: prevPeriod ? {
        revenue: parseFloat(prevPeriod.total_revenue),
        expenses: parseFloat(prevPeriod.total_expenses),
        netProfit: parseFloat(prevPeriod.net_profit),
        profitMargin: parseFloat(prevPeriod.profit_margin)
      } : undefined
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