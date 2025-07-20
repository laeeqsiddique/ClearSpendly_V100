"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getCurrentIRSRate } from "../_utils/irs-rate";
import { ChevronLeft, ChevronRight, Car, DollarSign, Route } from "lucide-react";

interface MonthlyData {
  month: number;
  year: number;
  trips: number;
  miles: number;
  deduction: number;
}

interface MonthlyViewProps {
  refreshTrigger?: number;
}

export function MonthlyView({ refreshTrigger }: MonthlyViewProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [irsRate, setIrsRate] = useState(0.655);
  const supabase = createClient();

  useEffect(() => {
    fetchMonthlyData();
    getCurrentIRSRate().then(setIrsRate);
  }, [refreshTrigger, selectedYear]);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      // Fetch data for the selected year
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31);

      const { data: mileageData, error } = await supabase
        .from('mileage_log')
        .select('date, miles, deduction_amount')
        .eq('tenant_id', membership.tenant_id)
        .gte('date', yearStart.toISOString().split('T')[0])
        .lte('date', yearEnd.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching monthly data:', error);
        return;
      }

      // Group data by month
      const monthlyStats: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        year: selectedYear,
        trips: 0,
        miles: 0,
        deduction: 0,
      }));

      if (mileageData) {
        mileageData.forEach((log) => {
          const date = new Date(log.date);
          const month = date.getMonth();
          
          monthlyStats[month].trips += 1;
          monthlyStats[month].miles += log.miles || 0;
          monthlyStats[month].deduction += log.deduction_amount || (log.miles * irsRate);
        });
      }

      setMonthlyData(monthlyStats);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthIndex = () => {
    const today = new Date();
    return today.getFullYear() === selectedYear ? today.getMonth() : -1;
  };

  const getMonthName = (monthIndex: number) => {
    return new Date(selectedYear, monthIndex, 1).toLocaleString('default', { month: 'long' });
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    const newYear = direction === 'prev' ? selectedYear - 1 : selectedYear + 1;
    const currentYear = new Date().getFullYear();
    
    // Limit to reasonable range (current year - 5 to current year + 1)
    if (newYear >= currentYear - 5 && newYear <= currentYear + 1) {
      setSelectedYear(newYear);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32 animate-pulse"></div>
          <div className="h-8 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-20"></div>
                  <div className="h-8 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-16"></div>
                  <div className="h-3 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-12"></div>
                  <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-14"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentMonthIndex = getCurrentMonthIndex();
  const yearTotals = monthlyData.reduce(
    (acc, month) => ({
      trips: acc.trips + month.trips,
      miles: acc.miles + month.miles,
      deduction: acc.deduction + month.deduction,
    }),
    { trips: 0, miles: 0, deduction: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Monthly Summary</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleYearChange('prev')}
              disabled={selectedYear <= new Date().getFullYear() - 5}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Badge variant="secondary" className="px-4 py-1 text-sm font-medium">
              {selectedYear}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleYearChange('next')}
              disabled={selectedYear >= new Date().getFullYear() + 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Year Totals */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-blue-600">
            <Route className="w-4 h-4" />
            <span className="font-medium">{yearTotals.trips} trips</span>
          </div>
          <div className="flex items-center gap-1 text-purple-600">
            <Car className="w-4 h-4" />
            <span className="font-medium">{yearTotals.miles.toFixed(1)} miles</span>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium">${yearTotals.deduction.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {monthlyData.map((monthData, index) => {
          const isCurrentMonth = index === currentMonthIndex;
          const hasData = monthData.trips > 0;
          
          return (
            <Card 
              key={index} 
              className={`transition-all duration-200 hover:shadow-lg ${
                isCurrentMonth 
                  ? 'border-blue-500 bg-blue-50/50 shadow-md' 
                  : hasData 
                    ? 'border-green-200 bg-green-50/30' 
                    : 'border-gray-200 bg-white/80'
              }`}
            >
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{getMonthName(index)}</h4>
                    {isCurrentMonth && (
                      <Badge variant="default" className="text-xs px-2 py-0">
                        Current
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">
                      {monthData.trips}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {monthData.trips === 1 ? 'trip' : 'trips'}
                    </div>
                    
                    {hasData && (
                      <>
                        <div className="text-sm font-medium text-purple-600">
                          {monthData.miles.toFixed(1)} mi
                        </div>
                        <div className="text-sm font-medium text-green-600">
                          ${monthData.deduction.toFixed(2)}
                        </div>
                      </>
                    )}
                    
                    {!hasData && (
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>0 mi</div>
                        <div>$0.00</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Year Summary for Mobile */}
      <div className="md:hidden">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <h4 className="font-semibold text-blue-800">Year {selectedYear} Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col items-center">
                  <Route className="w-4 h-4 text-blue-600 mb-1" />
                  <span className="font-medium">{yearTotals.trips}</span>
                  <span className="text-xs text-muted-foreground">trips</span>
                </div>
                <div className="flex flex-col items-center">
                  <Car className="w-4 h-4 text-purple-600 mb-1" />
                  <span className="font-medium">{yearTotals.miles.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">miles</span>
                </div>
                <div className="flex flex-col items-center">
                  <DollarSign className="w-4 h-4 text-green-600 mb-1" />
                  <span className="font-medium">${yearTotals.deduction.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">deduction</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}