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
import { SpendingInsights } from "./spending-insights";
import { 
  IconChartPie, 
  IconChartBar, 
  IconTrendingUp, 
  IconTrendingDown,
  IconBriefcase,
  IconUser,
  IconCar,
  IconToolsKitchen2,
  IconHome,
  IconDeviceLaptop
} from "@tabler/icons-react";

interface TagData {
  id: string;
  name: string;
  color: string;
  value: number;
  percentage: number;
  categoryPercentage: number;
  itemCount: number;
}

interface CategoryData {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
  trend: number;
  tags: TagData[];
  tagCount: number;
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

async function fetchCategoryBreakdown(startDate?: string, endDate?: string): Promise<ExpenseBreakdown> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    // Use tag categories API which provides more meaningful business categorization
    const tagResponse = await fetch(`/api/dashboard/tag-breakdown?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!tagResponse.ok) {
      throw new Error(`Tag categories API error: ${tagResponse.status}`);
    }

    const tagResult = await tagResponse.json();
    if (!tagResult.success) {
      throw new Error(tagResult.error || 'Failed to fetch tag categories');
    }

    // Transform tag categories to match our interface
    const categoriesWithIcons = tagResult.data.categories.map((cat: any) => ({
      ...cat,
      icon: getIconForCategory(cat.name),
    }));

    return {
      ...tagResult.data,
      categories: categoriesWithIcons
    };
  } catch (error) {
    console.error('Failed to fetch category breakdown:', error);
    
    // Final fallback to empty data
    return {
      totalAmount: 0,
      categories: [],
      monthlyComparison: {
        currentMonth: 0,
        previousMonth: 0,
        change: 0
      }
    };
  }
}

function getIconForCategory(categoryName: string): React.ReactNode {
  // Default icon mapping - you can expand this based on your tag categories
  const iconMap: Record<string, React.ReactNode> = {
    'Office Supplies': <IconDeviceLaptop className="h-4 w-4" />,
    'Travel & Transportation': <IconCar className="h-4 w-4" />,
    'Meals & Entertainment': <IconToolsKitchen2 className="h-4 w-4" />,
    'Professional Services': <IconBriefcase className="h-4 w-4" />,
    'Rent & Facilities': <IconHome className="h-4 w-4" />,
    'Personal': <IconUser className="h-4 w-4" />,
    'Non-Categorized': <IconUser className="h-4 w-4" />,
    'Unaccounted': <IconUser className="h-4 w-4 opacity-50" />,
    'Project': <IconBriefcase className="h-4 w-4" />,
    'Department': <IconBriefcase className="h-4 w-4" />,
    'Tax Status': <IconBriefcase className="h-4 w-4" />,
    'Client': <IconUser className="h-4 w-4" />,
    'Expense Type': <IconToolsKitchen2 className="h-4 w-4" />,
  };
  
  return iconMap[categoryName] || <IconBriefcase className="h-4 w-4" />;
}

interface CategoryBreakdownProps {
  startDate?: string;
  endDate?: string;
}

export function CategoryBreakdown({ startDate, endDate }: CategoryBreakdownProps = {}) {
  const [data, setData] = useState<ExpenseBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryBreakdown(startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) {
    return (
      <Card className="@container/card bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="h-6 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-64 animate-pulse"></div>
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
        <div className="bg-background border rounded-lg p-3 shadow-lg min-w-64">
          <div className="flex items-center gap-2 mb-2">
            {data.icon}
            <span className="font-medium">{data.name}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div>Total Amount: <span className="font-medium">${data.value.toLocaleString()}</span></div>
            <div>Percentage: <span className="font-medium">{data.percentage}%</span></div>
            {data.tagCount !== undefined && <div>Tags: <span className="font-medium">{data.tagCount}</span></div>}
            {data.id === 'unaccounted' && (
              <div className="text-xs text-muted-foreground mt-1 p-2 bg-gray-50 rounded">
                This includes tax, fees, and items that OCR couldn't categorize properly.
              </div>
            )}
            {data.tags && data.tags.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-1">Top Tags:</div>
                {data.tags.slice(0, 3).map((tag: TagData, index: number) => (
                  <div key={tag.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </div>
                    <span className="font-medium">${tag.value.toLocaleString()}</span>
                  </div>
                ))}
                {data.tags.length > 3 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    +{data.tags.length - 3} more tags
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t">
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
      <Card className="@container/card @4xl/main:col-span-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconChartPie className="h-5 w-5 text-purple-600" />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Tag Categories & Spending</span>
              </CardTitle>
              <CardDescription>
                Spending breakdown by tag categories. "Unaccounted" includes tax, fees, and OCR misses.
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
        <SpendingInsights startDate={startDate} endDate={endDate} />

        {selectedCategoryData && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
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
                
                {selectedCategoryData.tags && selectedCategoryData.tags.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Tag Breakdown:</span>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {selectedCategoryData.tags.map((tag) => (
                        <div key={tag.id} className="flex justify-between items-center text-sm bg-gray-50 rounded p-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-muted-foreground">{tag.name}</span>
                            <span className="text-xs text-muted-foreground">({tag.itemCount} items)</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${tag.value.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {tag.categoryPercentage}% of category
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {(!selectedCategoryData.tags || selectedCategoryData.tags.length === 0) && selectedCategoryData.id !== 'untagged' && (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                    <span className="text-sm">No individual tags in this category</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}