import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTenantIdWithFallback } from '@/lib/api-tenant';

interface Insight {
  type: 'increase' | 'decrease' | 'anomaly' | 'achievement' | 'warning';
  icon: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'error';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tenantId = await getTenantIdWithFallback(req);
    const insights: Insight[] = [];

    // Get current and previous period dates
    const now = new Date();
    const currentPeriodStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const currentPeriodEnd = endDate ? new Date(endDate) : new Date();
    
    const periodDuration = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDuration);

    // 1. Get tag spending comparison
    const { data: currentTags } = await supabase
      .from('receipt_item_tag')
      .select(`
        receipt_item!inner(
          total_price,
          receipt!inner(
            receipt_date,
            tenant_id
          )
        ),
        tag!inner(
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .gte('receipt_item.receipt.receipt_date', currentPeriodStart.toISOString().split('T')[0])
      .lte('receipt_item.receipt.receipt_date', currentPeriodEnd.toISOString().split('T')[0]);

    const { data: previousTags } = await supabase
      .from('receipt_item_tag')
      .select(`
        receipt_item!inner(
          total_price,
          receipt!inner(
            receipt_date,
            tenant_id
          )
        ),
        tag!inner(
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .gte('receipt_item.receipt.receipt_date', previousPeriodStart.toISOString().split('T')[0])
      .lte('receipt_item.receipt.receipt_date', previousPeriodEnd.toISOString().split('T')[0]);

    // Calculate spending by tag
    const currentSpending = new Map<string, number>();
    const previousSpending = new Map<string, number>();

    (currentTags || []).forEach((item: any) => {
      const tagName = item.tag.name;
      const amount = item.receipt_item.total_price || 0;
      currentSpending.set(tagName, (currentSpending.get(tagName) || 0) + amount);
    });

    (previousTags || []).forEach((item: any) => {
      const tagName = item.tag.name;
      const amount = item.receipt_item.total_price || 0;
      previousSpending.set(tagName, (previousSpending.get(tagName) || 0) + amount);
    });

    // Find significant changes
    let maxIncrease = { tag: '', percentage: 0, amount: 0 };
    let maxDecrease = { tag: '', percentage: -999, amount: 0 };

    currentSpending.forEach((currentAmount, tagName) => {
      const previousAmount = previousSpending.get(tagName) || 0;
      if (previousAmount > 0) {
        const change = ((currentAmount - previousAmount) / previousAmount) * 100;
        if (change > maxIncrease.percentage && currentAmount > 50) { // Ignore small amounts
          maxIncrease = { tag: tagName, percentage: change, amount: currentAmount };
        }
      } else if (currentAmount > 50) {
        // New category this period
        maxIncrease = { tag: tagName, percentage: 100, amount: currentAmount };
      }
    });

    previousSpending.forEach((previousAmount, tagName) => {
      const currentAmount = currentSpending.get(tagName) || 0;
      if (previousAmount > 0 && currentAmount < previousAmount) {
        const change = ((currentAmount - previousAmount) / previousAmount) * 100;
        if (change < maxDecrease.percentage && previousAmount > 50) {
          maxDecrease = { tag: tagName, percentage: change, amount: currentAmount };
        }
      }
    });

    // Add spending change insights
    if (maxIncrease.percentage > 30) {
      insights.push({
        type: 'increase',
        icon: '📈',
        message: `You spent ${Math.round(maxIncrease.percentage)}% more on ${maxIncrease.tag} this period`,
        severity: maxIncrease.percentage > 100 ? 'warning' : 'info'
      });
    }

    if (maxDecrease.percentage < -30) {
      insights.push({
        type: 'decrease',
        icon: '📉',
        message: `${maxDecrease.tag} spending down ${Math.abs(Math.round(maxDecrease.percentage))}% - nice saving!`,
        severity: 'success'
      });
    }

    // 2. Detect anomalies (unusual charges)
    const { data: recentReceipts } = await supabase
      .from('receipt')
      .select('*, vendor!inner(name)')
      .eq('tenant_id', tenantId)
      .gte('receipt_date', currentPeriodStart.toISOString().split('T')[0])
      .lte('receipt_date', currentPeriodEnd.toISOString().split('T')[0])
      .order('total_amount', { ascending: false })
      .limit(10);

    // Get historical average for anomaly detection
    const { data: historicalReceipts } = await supabase
      .from('receipt')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .lt('receipt_date', currentPeriodStart.toISOString().split('T')[0])
      .limit(100);

    if (historicalReceipts && historicalReceipts.length > 10) {
      const amounts = historicalReceipts.map(r => r.total_amount || 0);
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / amounts.length);
      
      // Find anomalies (2+ standard deviations from mean)
      const threshold = avg + (2 * stdDev);
      
      (recentReceipts || []).forEach((receipt: any) => {
        if (receipt.total_amount > threshold && receipt.total_amount > 100) {
          insights.push({
            type: 'anomaly',
            icon: '⚠️',
            message: `Unusual charge: $${receipt.total_amount.toLocaleString()} at ${receipt.vendor.name}`,
            severity: 'warning'
          });
          return; // Only show one anomaly
        }
      });
    }

    // 3. Tag completion status
    const { data: untaggedCount } = await supabase
      .from('receipt')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('receipt_date', currentPeriodStart.toISOString().split('T')[0])
      .lte('receipt_date', currentPeriodEnd.toISOString().split('T')[0])
      .not('id', 'in', `(select receipt_id from receipt_tag)`)
      .not('id', 'in', `(select receipt_id from receipt_item inner join receipt_item_tag on receipt_item.id = receipt_item_tag.receipt_item_id)`);

    const { data: totalCount } = await supabase
      .from('receipt')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('receipt_date', currentPeriodStart.toISOString().split('T')[0])
      .lte('receipt_date', currentPeriodEnd.toISOString().split('T')[0]);

    if (totalCount && totalCount > 0) {
      const taggedPercentage = ((totalCount - (untaggedCount || 0)) / totalCount) * 100;
      
      if (taggedPercentage === 100) {
        insights.push({
          type: 'achievement',
          icon: '✅',
          message: '100% receipts tagged - great job!',
          severity: 'success'
        });
      } else if (untaggedCount && untaggedCount > 3) {
        insights.push({
          type: 'warning',
          icon: '🏷️',
          message: `${untaggedCount} receipts need tags`,
          severity: 'warning'
        });
      }
    }

    // 4. Spending pace insight
    const daysInPeriod = Math.ceil(periodDuration / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((new Date().getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    const percentPeriodComplete = (daysElapsed / daysInPeriod) * 100;

    const { data: currentTotal } = await supabase
      .from('receipt')
      .select('total_amount.sum()')
      .eq('tenant_id', tenantId)
      .gte('receipt_date', currentPeriodStart.toISOString().split('T')[0])
      .lte('receipt_date', currentPeriodEnd.toISOString().split('T')[0])
      .single();

    const { data: previousTotal } = await supabase
      .from('receipt')
      .select('total_amount.sum()')
      .eq('tenant_id', tenantId)
      .gte('receipt_date', previousPeriodStart.toISOString().split('T')[0])
      .lte('receipt_date', previousPeriodEnd.toISOString().split('T')[0])
      .single();

    if (currentTotal && previousTotal && percentPeriodComplete > 50) {
      const projectedTotal = (currentTotal / percentPeriodComplete) * 100;
      if (projectedTotal > previousTotal * 1.2) {
        insights.push({
          type: 'warning',
          icon: '💸',
          message: `On track to spend ${Math.round((projectedTotal / previousTotal - 1) * 100)}% more this period`,
          severity: 'warning'
        });
      }
    }

    // Limit to top 4 insights
    const topInsights = insights.slice(0, 4);

    return NextResponse.json({ 
      success: true, 
      data: { 
        insights: topInsights,
        periodInfo: {
          startDate: currentPeriodStart.toISOString().split('T')[0],
          endDate: currentPeriodEnd.toISOString().split('T')[0],
          daysElapsed,
          daysInPeriod
        }
      } 
    });

  } catch (error) {
    console.error("Insights API error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}