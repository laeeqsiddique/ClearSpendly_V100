import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const tenantId = await getTenantIdWithFallback(req);

    // Get receipts with their vendor categories
    let query = supabase
      .from('receipt')
      .select(`
        id,
        total_amount,
        receipt_date,
        vendor!inner(
          category
        )
      `)
      .eq('tenant_id', tenantId);
    
    if (startDate) {
      query = query.gte('receipt_date', startDate);
    }
    if (endDate) {
      query = query.lte('receipt_date', endDate);
    }
    
    const { data: receipts, error } = await query;

    if (error) {
      console.error('Error fetching category data:', error);
      throw error;
    }

    // Group by vendor category and calculate totals using receipt totals (includes tax)
    const categoryTotals = (receipts || []).reduce((acc, receipt) => {
      const category = receipt.vendor?.category || 'Non-Categorized';
      acc[category] = (acc[category] || 0) + (receipt.total_amount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Calculate total amount
    const totalAmount = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    // Format categories data
    const categories = Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((value / totalAmount) * 100 * 100) / 100 : 0,
        color: getCategoryColor(name),
        icon: getCategoryIcon(name),
        trend: Math.floor(Math.random() * 21) - 10, // Random trend for now
        subcategories: [] // TODO: Implement subcategories
      }))
      .sort((a, b) => b.value - a.value); // Sort by highest value first

    const breakdown = {
      totalAmount: Math.round(totalAmount * 100) / 100,
      categories,
      monthlyComparison: {
        currentMonth: Math.round(totalAmount * 100) / 100,
        previousMonth: Math.round(totalAmount * 0.85 * 100) / 100, // Mock previous month
        percentageChange: 15 // Mock change
      }
    };

    return NextResponse.json({ success: true, data: breakdown });
  } catch (error) {
    console.error("Category breakdown error:", error);
    return NextResponse.json(
      { error: "Failed to fetch category breakdown" },
      { status: 500 }
    );
  }
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Office Supplies': '#8884D8',
    'Travel & Transportation': '#82CA9D',
    'Meals & Entertainment': '#FFC658',
    'Professional Services': '#FF7C7C',
    'Equipment & Software': '#8DD1E1',
    'Rent & Facilities': '#D084D0',
    'Marketing & Advertising': '#FFED4E',
    'Utilities': '#FF9F9B',
    'Other': '#C4C4C4',
    'Non-Categorized': '#9CA3AF'
  };
  return colors[category] || '#9CA3AF';
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Office Supplies': 'IconDeviceLaptop',
    'Travel & Transportation': 'IconCar',
    'Meals & Entertainment': 'IconToolsKitchen2',
    'Professional Services': 'IconBriefcase',
    'Equipment & Software': 'IconDeviceLaptop',
    'Rent & Facilities': 'IconHome',
    'Other': 'IconUser'
  };
  return icons[category] || 'IconUser';
}