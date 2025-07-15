"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useState, useEffect } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  IconChartPie, 
  IconChartBar, 
  IconTrendingUp, 
  IconTrendingDown,
  IconBriefcase,
  IconUser,
  IconCar,
  IconUtensils,
  IconHome,
  IconLaptop
} from "@tabler/icons-react";

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
  trend: number;
  subcategories?: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

interface ExpenseBreakdown {
  totalAmount: number;
  categories: CategoryData[];
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
    change: number;
  };
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'
];

const CATEGORY_ICONS = {
  'Office Supplies': <IconLaptop className="h-4 w-4" />,
  'Travel & Transportation': <IconCar className="h-4 w-4" />,
  'Meals & Entertainment': <IconUtensils className="h-4 w-4" />,
  'Professional Services': <IconBriefcase className="h-4 w-4" />,
  'Rent & Facilities': <IconHome className="h-4 w-4" />,
  'Personal': <IconUser className="h-4 w-4" />,
};

async function fetchCategoryBreakdown(): Promise<ExpenseBreakdown> {
  // TODO: Replace with actual API call
  await new Promise(resolve => setTimeout(resolve, 400));
  
  return {
    totalAmount: 2847.32,
    categories: [
      {
        name: 'Office Supplies',
        value: 856.40,
        percentage: 30.1,
        color: COLORS[0],
        icon: CATEGORY_ICONS['Office Supplies'],
        trend: 12.5,
        subcategories: [
          { name: 'Software & Subscriptions', value: 420.00, percentage: 49.1 },
          { name: 'Hardware & Equipment', value: 289.50, percentage: 33.8 },
          { name: 'Stationery', value: 146.90, percentage: 17.1 }
        ]
      },
      {
        name: 'Travel & Transportation',
        value: 672.50,
        percentage: 23.6,
        color: COLORS[1],
        icon: CATEGORY_ICONS['Travel & Transportation'],
        trend: -5.2,
        subcategories: [
          { name: 'Flight & Hotels', value: 450.00, percentage: 66.9 },
          { name: 'Local Transport', value: 134.25, percentage: 20.0 },
          { name: 'Fuel & Parking', value: 88.25, percentage: 13.1 }
        ]
      },
      {
        name: 'Meals & Entertainment',
        value: 543.80,
        percentage: 19.1,
        color: COLORS[2],
        icon: CATEGORY_ICONS['Meals & Entertainment'],
        trend: 8.7,
        subcategories: [
          { name: 'Client Meals', value: 298.50, percentage: 54.9 },
          { name: 'Team Lunches', value: 156.80, percentage: 28.8 },
          { name: 'Conference Events', value: 88.50, percentage: 16.3 }
        ]
      },
      {
        name: 'Professional Services',
        value: 432.20,
        percentage: 15.2,
        color: COLORS[3],
        icon: CATEGORY_ICONS['Professional Services'],
        trend: 22.1,
        subcategories: [
          { name: 'Legal & Accounting', value: 245.00, percentage: 56.7 },
          { name: 'Consulting', value: 123.70, percentage: 28.6 },
          { name: 'Marketing Services', value: 63.50, percentage: 14.7 }
        ]
      },
      {
        name: 'Rent & Facilities',
        value: 342.42,
        percentage: 12.0,
        color: COLORS[4],
        icon: CATEGORY_ICONS['Rent & Facilities'],
        trend: 0.0,
        subcategories: [
          { name: 'Office Rent', value: 200.00, percentage: 58.4 },
          { name: 'Utilities', value: 89.42, percentage: 26.1 },
          { name: 'Cleaning & Maintenance', value: 53.00, percentage: 15.5 }
        ]
      }
    ],
    monthlyComparison: {
      currentMonth: 2847.32,
      previousMonth: 2621.80,
      change: 8.6
    }
  };
}

export function CategoryBreakdown() {
  const [data, setData] = useState<ExpenseBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryBreakdown()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = data.categories.map((cat, index) => ({
    ...cat,
    fill: cat.color
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            {data.icon}
            <span className="font-medium">{data.name}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div>Amount: <span className="font-medium">${data.value.toLocaleString()}</span></div>
            <div>Percentage: <span className="font-medium">{data.percentage}%</span></div>
            <div className="flex items-center gap-1">
              Trend: 
              <span className={`font-medium flex items-center gap-1 ${data.trend > 0 ? 'text-green-600' : data.trend < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {data.trend > 0 ? <IconTrendingUp className="h-3 w-3" /> : data.trend < 0 ? <IconTrendingDown className="h-3 w-3" /> : null}
                {data.trend > 0 ? '+' : ''}{data.trend}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const onCategoryClick = (entry: any) => {
    setSelectedCategory(selectedCategory === entry.name ? null : entry.name);
  };

  const selectedCategoryData = selectedCategory ? 
    data.categories.find(cat => cat.name === selectedCategory) : null;

  return (
    <div className="grid grid-cols-1 @4xl/main:grid-cols-3 gap-4">
      <Card className="@container/card @4xl/main:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconChartPie className="h-5 w-5" />
                Expense Categories
              </CardTitle>
              <CardDescription>
                Spending breakdown by category for this month
              </CardDescription>
            </div>
            <CardAction>
              <ToggleGroup
                type="single"
                value={viewType}
                onValueChange={(value) => value && setViewType(value as 'pie' | 'bar')}
                variant="outline"
              >
                <ToggleGroupItem value="pie" size="sm">
                  <IconChartPie className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="bar" size="sm">
                  <IconChartBar className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {viewType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    onClick={onCategoryClick}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={selectedCategory === entry.name ? '#000' : 'none'}
                        strokeWidth={selectedCategory === entry.name ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => (
                      <span className="text-sm">
                        {value} (${entry.payload?.value.toLocaleString()})
                      </span>
                    )}
                  />
                </PieChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    onClick={onCategoryClick}
                    className="cursor-pointer"
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Comparison</CardTitle>
            <CardDescription>vs previous month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Month</span>
              <span className="font-medium">${data.monthlyComparison.currentMonth.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Previous Month</span>
              <span className="font-medium">${data.monthlyComparison.previousMonth.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Change</span>
              <Badge variant={data.monthlyComparison.change > 0 ? "destructive" : "secondary"}>
                {data.monthlyComparison.change > 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                {data.monthlyComparison.change > 0 ? '+' : ''}{data.monthlyComparison.change}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {selectedCategoryData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {selectedCategoryData.icon}
                {selectedCategoryData.name}
              </CardTitle>
              <CardDescription>
                ${selectedCategoryData.value.toLocaleString()} ({selectedCategoryData.percentage}% of total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Trend</span>
                  <Badge variant={selectedCategoryData.trend > 0 ? "destructive" : selectedCategoryData.trend < 0 ? "secondary" : "outline"}>
                    {selectedCategoryData.trend > 0 ? <IconTrendingUp className="h-3 w-3" /> : 
                     selectedCategoryData.trend < 0 ? <IconTrendingDown className="h-3 w-3" /> : null}
                    {selectedCategoryData.trend > 0 ? '+' : ''}{selectedCategoryData.trend}%
                  </Badge>
                </div>
                
                {selectedCategoryData.subcategories && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Breakdown:</span>
                    {selectedCategoryData.subcategories.map((sub, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{sub.name}</span>
                        <div className="text-right">
                          <div className="font-medium">${sub.value.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{sub.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Categories</CardTitle>
            <CardDescription>by spending amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categories.slice(0, 3).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${category.value.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{category.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}