"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconTrendingDown, IconTrendingUp, IconCar, IconCurrencyDollar, IconRoute, IconCalendar } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentIRSRate, formatIRSRate } from "../_utils/irs-rate";

interface MileageStats {
  selectedPeriod: {
    miles: number;
    deduction: number;
    trips: number;
  };
  thisMonth: {
    miles: number;
    deduction: number;
    trips: number;
  };
  thisYear: {
    miles: number;
    deduction: number;
    trips: number;
  };
  lastMonth: {
    miles: number;
    deduction: number;
  };
}

interface MileageStatsProps {
  refreshTrigger?: number;
  startDate?: string;
  endDate?: string;
}

export function MileageStats({ refreshTrigger, startDate, endDate }: MileageStatsProps) {
  const [stats, setStats] = useState<MileageStats>({
    selectedPeriod: { miles: 0, deduction: 0, trips: 0 },
    thisMonth: { miles: 0, deduction: 0, trips: 0 },
    thisYear: { miles: 0, deduction: 0, trips: 0 },
    lastMonth: { miles: 0, deduction: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [irsRate, setIrsRate] = useState(0.655);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
    getCurrentIRSRate().then(setIrsRate);
  }, [refreshTrigger, startDate, endDate]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const thisYearEnd = new Date(now.getFullYear(), 11, 31); // Last day of current year

      // Selected period stats (from date filter)
      let selectedPeriodData = null;
      if (startDate && endDate) {
        const { data, error } = await supabase
          .from('mileage_log')
          .select('miles, deduction_amount, date')
          .eq('tenant_id', membership.tenant_id)
          .gte('date', startDate)
          .lte('date', endDate);
        
        if (!error) selectedPeriodData = data;
      }

      // This month stats
      const { data: thisMonthData, error: thisMonthError } = await supabase
        .from('mileage_log')
        .select('miles, deduction_amount, date')
        .eq('tenant_id', membership.tenant_id)
        .gte('date', thisMonthStart.toISOString().split('T')[0])
        .lte('date', thisMonthEnd.toISOString().split('T')[0]);

      // Last month stats
      const { data: lastMonthData } = await supabase
        .from('mileage_log')
        .select('miles, deduction_amount')
        .eq('tenant_id', membership.tenant_id)
        .gte('date', lastMonthStart.toISOString().split('T')[0])
        .lte('date', lastMonthEnd.toISOString().split('T')[0]);

      // This year stats
      const { data: thisYearData, error: thisYearError } = await supabase
        .from('mileage_log')
        .select('miles, deduction_amount, date')
        .eq('tenant_id', membership.tenant_id)
        .gte('date', thisYearStart.toISOString().split('T')[0])
        .lte('date', thisYearEnd.toISOString().split('T')[0]);

      // Debug logging
      if (thisMonthError) console.error('This month error:', thisMonthError);
      if (thisYearError) console.error('This year error:', thisYearError);
      
      console.log('Date ranges:', {
        thisMonthStart: thisMonthStart.toISOString().split('T')[0],
        thisMonthEnd: thisMonthEnd.toISOString().split('T')[0],
        thisYearStart: thisYearStart.toISOString().split('T')[0],
        thisYearEnd: thisYearEnd.toISOString().split('T')[0]
      });
      
      console.log('Data results:', {
        thisMonthData: thisMonthData?.length || 0,
        thisYearData: thisYearData?.length || 0,
        thisMonthSample: thisMonthData?.[0]
      });

      const calculateStats = (data: any[]) => {
        if (!data || data.length === 0) return { miles: 0, deduction: 0, trips: 0 };
        
        const miles = data.reduce((sum, item) => sum + (item.miles || 0), 0);
        const deduction = data.reduce((sum, item) => sum + (item.deduction_amount || item.miles * irsRate), 0);
        
        return {
          miles: Math.round(miles * 10) / 10,
          deduction: Math.round(deduction * 100) / 100,
          trips: data.length,
        };
      };

      setStats({
        selectedPeriod: calculateStats(selectedPeriodData),
        thisMonth: calculateStats(thisMonthData),
        thisYear: calculateStats(thisYearData),
        lastMonth: {
          miles: calculateStats(lastMonthData).miles,
          deduction: calculateStats(lastMonthData).deduction,
        },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrowthPercentage = () => {
    if (stats.lastMonth.miles === 0) return null;
    const growth = ((stats.thisMonth.miles - stats.lastMonth.miles) / stats.lastMonth.miles) * 100;
    return Math.round(growth);
  };

  const growth = getGrowthPercentage();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24"></div>
              <div className="h-8 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconCar className="h-4 w-4 text-blue-600" />
            Miles (Selected Period)
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {stats.selectedPeriod.miles}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              <IconRoute />
              Business miles
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.selectedPeriod.trips} trips recorded
          </div>
          <div className="text-muted-foreground">
            IRS rate: {formatIRSRate(irsRate)} per mile
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconCurrencyDollar className="h-4 w-4 text-green-600" />
            Tax Deduction (Selected)
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            ${stats.selectedPeriod.deduction.toFixed(2)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              Selected Period
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            ${stats.thisYear.deduction.toFixed(0)} year-to-date
          </div>
          <div className="text-muted-foreground">
            {growth !== null && growth >= 0 ? `+${growth}%` : growth !== null ? `${growth}%` : 'No change'} vs last month
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconRoute className="h-4 w-4 text-purple-600" />
            Business Trips (Selected)
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {stats.selectedPeriod.trips}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              Selected Period
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.thisYear.trips} trips this year
          </div>
          <div className="text-muted-foreground">
            {stats.selectedPeriod.miles > 0 ? `${(stats.selectedPeriod.miles / stats.selectedPeriod.trips).toFixed(1)} avg miles/trip` : 'No trips yet'}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4 text-orange-600" />
            Year Total Deduction
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            ${stats.thisYear.deduction.toFixed(0)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCalendar />
              year to date
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.thisYear.miles} total miles • {stats.thisYear.trips} trips
          </div>
          <div className="text-muted-foreground">
            Track for Schedule C tax filing
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}