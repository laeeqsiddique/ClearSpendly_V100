import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import puppeteer from 'puppeteer';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const exportFormat = searchParams.get('format') || 'pdf';
    const fromDate = searchParams.get('from') || format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const toDate = searchParams.get('to') || format(endOfMonth(new Date()), 'yyyy-MM-dd');

    // Get P&L data
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
      `);

    const clientRevenue = revenueByClient?.map(client => {
      const clientPayments = client.invoice
        ?.flatMap(inv => inv.payment_allocation || [])
        .filter(pa => {
          const paymentDate = new Date(pa.payment?.payment_date);
          return paymentDate >= new Date(fromDate) && paymentDate <= new Date(toDate);
        }) || [];
      
      const totalAmount = clientPayments.reduce((sum, pa) => sum + (pa.allocated_amount || 0), 0);
      
      return {
        name: client.name,
        amount: totalAmount
      };
    }).filter(client => client.amount > 0)
      .sort((a, b) => b.amount - a.amount) || [];

    // Get expense breakdown
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

    const pnlData = {
      revenue: {
        total: totalRevenue,
        byClient: clientRevenue
      },
      expenses: {
        total: totalExpenses,
        byCategory: expenseCategoriesArray
      },
      netProfit,
      profitMargin,
      dateRange: {
        from: fromDate,
        to: toDate
      }
    };

    if (exportFormat === 'excel') {
      return await generateExcelExport(pnlData);
    } else {
      return await generatePDFExport(pnlData);
    }

  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: "Failed to export analytics data" },
      { status: 500 }
    );
  }
}

async function generateExcelExport(data: any) {
  try {
    const wb = XLSX.utils.book_new();

    // P&L Summary Sheet
    const summaryData = [
      ['Profit & Loss Statement'],
      [`Period: ${data.dateRange.from} to ${data.dateRange.to}`],
      [''],
      ['REVENUE'],
      ['Total Revenue', `$${data.revenue.total.toLocaleString()}`],
      [''],
      ...data.revenue.byClient.map((client: any) => [client.name, `$${client.amount.toLocaleString()}`]),
      [''],
      ['EXPENSES'],
      ['Total Expenses', `$${data.expenses.total.toLocaleString()}`],
      [''],
      ...data.expenses.byCategory.map((expense: any) => [expense.category, `$${expense.amount.toLocaleString()}`]),
      [''],
      ['NET PROFIT', `$${data.netProfit.toLocaleString()}`],
      ['PROFIT MARGIN', `${data.profitMargin.toFixed(1)}%`]
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'P&L Summary');

    // Revenue Details Sheet
    const revenueData = [
      ['Revenue by Client'],
      ['Client Name', 'Amount'],
      ...data.revenue.byClient.map((client: any) => [client.name, client.amount])
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(revenueData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Revenue Details');

    // Expense Details Sheet
    const expenseData = [
      ['Expenses by Category'],
      ['Category', 'Amount'],
      ...data.expenses.byCategory.map((expense: any) => [expense.category, expense.amount])
    ];

    const ws3 = XLSX.utils.aoa_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Expense Details');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="P&L-Statement-${format(new Date(), 'yyyy-MM-dd')}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Excel export error:', error);
    throw error;
  }
}

async function generatePDFExport(data: any) {
  let browser;
  try {
    const html = generatePnLHTML(data);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });
    
    const page = await browser.newPage();
    
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2
    });
    
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });
    
    // Wait for fonts to load
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (document.fonts) {
          document.fonts.ready.then(() => resolve());
        } else {
          setTimeout(resolve, 1000);
        }
      });
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm', 
        left: '15mm',
        right: '15mm'
      }
    });
    
    await browser.close();
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="P&L-Statement-${format(new Date(), 'yyyy-MM-dd')}.pdf"`
      }
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('PDF export error:', error);
    throw error;
  }
}

function generatePnLHTML(data: any): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Profit & Loss Statement</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        @page { margin: 0; }
        .print-page { min-height: 100vh; padding: 40px; }
      </style>
    </head>
    <body class="bg-white">
      <div class="print-page max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Profit & Loss Statement</h1>
          <p class="text-gray-600">Period: ${format(new Date(data.dateRange.from + 'T12:00:00'), 'MMM d, yyyy')} - ${format(new Date(data.dateRange.to + 'T12:00:00'), 'MMM d, yyyy')}</p>
          <p class="text-sm text-gray-500 mt-2">Generated on ${format(new Date(), 'MMMM d, yyyy \\a\\t h:mm a')}</p>
        </div>

        <!-- Revenue Section -->
        <div class="mb-8">
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200 mb-4">
            <h2 class="text-xl font-bold text-green-800 mb-4">REVENUE</h2>
            <div class="flex justify-between items-center mb-4">
              <span class="font-semibold text-lg">Total Revenue</span>
              <span class="text-2xl font-bold text-green-700">${formatCurrency(data.revenue.total)}</span>
            </div>
            
            <div class="space-y-2">
              ${data.revenue.byClient.map((client: any) => `
                <div class="flex justify-between items-center py-2 border-b border-green-100 last:border-b-0">
                  <span class="text-green-700">${client.name}</span>
                  <span class="font-medium text-green-800">${formatCurrency(client.amount)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Expenses Section -->
        <div class="mb-8">
          <div class="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-lg border border-red-200 mb-4">
            <h2 class="text-xl font-bold text-red-800 mb-4">EXPENSES</h2>
            <div class="flex justify-between items-center mb-4">
              <span class="font-semibold text-lg">Total Expenses</span>
              <span class="text-2xl font-bold text-red-700">${formatCurrency(data.expenses.total)}</span>
            </div>
            
            <div class="space-y-2">
              ${data.expenses.byCategory.map((expense: any) => `
                <div class="flex justify-between items-center py-2 border-b border-red-100 last:border-b-0">
                  <span class="text-red-700">${expense.category}</span>
                  <span class="font-medium text-red-800">${formatCurrency(expense.amount)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Net Profit Section -->
        <div class="mb-8">
          <div class="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
            <h2 class="text-xl font-bold text-purple-800 mb-6">NET PROFIT</h2>
            
            <div class="space-y-4">
              <div class="flex justify-between items-center py-3 border-b border-purple-200">
                <span class="text-lg font-semibold">Total Revenue</span>
                <span class="text-lg font-bold text-green-600">${formatCurrency(data.revenue.total)}</span>
              </div>
              
              <div class="flex justify-between items-center py-3 border-b border-purple-200">
                <span class="text-lg font-semibold">Total Expenses</span>
                <span class="text-lg font-bold text-red-600">-${formatCurrency(data.expenses.total)}</span>
              </div>
              
              <div class="flex justify-between items-center py-4 border-t-2 border-purple-300">
                <span class="text-xl font-bold">NET PROFIT</span>
                <span class="text-3xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
                  ${formatCurrency(data.netProfit)}
                </span>
              </div>
              
              <div class="flex justify-between items-center py-2">
                <span class="text-lg font-semibold">Profit Margin</span>
                <span class="text-xl font-bold ${data.profitMargin >= 20 ? 'text-green-600' : data.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}">
                  ${data.profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center text-xs text-gray-500 mt-12 pt-6 border-t border-gray-200">
          <p>This P&L statement is based on cash basis accounting using paid invoices and recorded expenses.</p>
          <p class="mt-1">Generated by ClearSpendly Business Analytics</p>
        </div>
      </div>
    </body>
    </html>
  `;
}