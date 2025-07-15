"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const description = "Daily spending analytics chart";

const chartData = [
  { date: "2024-04-01", business: 125.50, personal: 89.32 },
  { date: "2024-04-02", business: 234.75, personal: 156.89 },
  { date: "2024-04-03", business: 189.25, personal: 98.45 },
  { date: "2024-04-04", business: 345.80, personal: 201.67 },
  { date: "2024-04-05", business: 456.30, personal: 178.90 },
  { date: "2024-04-06", business: 298.75, personal: 245.60 },
  { date: "2024-04-07", business: 167.40, personal: 134.25 },
  { date: "2024-04-08", business: 523.85, personal: 298.70 },
  { date: "2024-04-09", business: 78.50, personal: 67.30 },
  { date: "2024-04-10", business: 302.45, personal: 189.80 },
  { date: "2024-04-11", business: 421.30, personal: 267.50 },
  { date: "2024-04-12", business: 234.80, personal: 156.90 },
  { date: "2024-04-13", business: 398.65, personal: 278.40 },
  { date: "2024-04-14", business: 145.20, personal: 123.70 },
  { date: "2024-04-15", business: 198.45, personal: 145.30 },
  { date: "2024-04-16", business: 267.80, personal: 189.60 },
  { date: "2024-04-17", business: 543.20, personal: 345.80 },
  { date: "2024-04-18", business: 432.65, personal: 298.40 },
  { date: "2024-04-19", business: 289.30, personal: 167.50 },
  { date: "2024-04-20", business: 156.75, personal: 123.40 },
  { date: "2024-04-21", business: 234.50, personal: 178.90 },
  { date: "2024-04-22", business: 298.80, personal: 145.60 },
  { date: "2024-04-23", business: 187.40, personal: 201.30 },
  { date: "2024-04-24", business: 456.90, personal: 267.50 },
  { date: "2024-04-25", business: 321.45, personal: 234.80 },
  { date: "2024-04-26", business: 123.60, personal: 98.70 },
  { date: "2024-04-27", business: 498.30, personal: 378.90 },
  { date: "2024-04-28", business: 189.75, personal: 145.20 },
  { date: "2024-04-29", business: 367.50, personal: 223.40 },
  { date: "2024-04-30", business: 532.80, personal: 345.60 },
  { date: "2024-05-01", business: 234.90, personal: 178.50 },
  { date: "2024-05-02", business: 398.60, personal: 298.30 },
  { date: "2024-05-03", business: 289.45, personal: 167.80 },
  { date: "2024-05-04", business: 456.20, personal: 378.40 },
  { date: "2024-05-05", business: 567.85, personal: 345.90 },
  { date: "2024-05-06", business: 634.70, personal: 456.20 },
  { date: "2024-05-07", business: 432.50, personal: 267.30 },
  { date: "2024-05-08", business: 198.75, personal: 145.60 },
  { date: "2024-05-09", business: 267.30, personal: 189.40 },
  { date: "2024-05-10", business: 398.90, personal: 298.70 },
  { date: "2024-05-11", business: 421.80, personal: 234.50 },
  { date: "2024-05-12", business: 256.45, personal: 178.90 },
  { date: "2024-05-13", business: 234.60, personal: 145.30 },
  { date: "2024-05-14", business: 567.40, personal: 423.80 },
  { date: "2024-05-15", business: 598.30, personal: 345.70 },
  { date: "2024-05-16", business: 421.70, personal: 356.90 },
  { date: "2024-05-17", business: 634.50, personal: 378.60 },
  { date: "2024-05-18", business: 378.90, personal: 298.40 },
  { date: "2024-05-19", business: 289.60, personal: 167.80 },
  { date: "2024-05-20", business: 234.80, personal: 189.50 },
  { date: "2024-05-21", business: 145.30, personal: 123.70 },
  { date: "2024-05-22", business: 167.40, personal: 98.60 },
  { date: "2024-05-23", business: 334.80, personal: 267.90 },
  { date: "2024-05-24", business: 398.50, personal: 189.70 },
  { date: "2024-05-25", business: 278.90, personal: 234.60 },
  { date: "2024-05-26", business: 267.30, personal: 145.80 },
  { date: "2024-05-27", business: 534.60, personal: 398.40 },
  { date: "2024-05-28", business: 289.50, personal: 167.90 },
  { date: "2024-05-29", business: 134.70, personal: 98.50 },
  { date: "2024-05-30", business: 432.80, personal: 267.60 },
  { date: "2024-05-31", business: 234.90, personal: 189.70 },
  { date: "2024-06-01", business: 267.40, personal: 178.50 },
  { date: "2024-06-02", business: 598.70, personal: 378.90 },
  { date: "2024-06-03", business: 145.80, personal: 123.60 },
  { date: "2024-06-04", business: 567.30, personal: 345.80 },
  { date: "2024-06-05", business: 123.90, personal: 98.70 },
  { date: "2024-06-06", business: 378.60, personal: 234.50 },
  { date: "2024-06-07", business: 421.50, personal: 334.80 },
  { date: "2024-06-08", business: 498.90, personal: 289.60 },
  { date: "2024-06-09", business: 567.80, personal: 434.70 },
  { date: "2024-06-10", business: 234.60, personal: 167.90 },
  { date: "2024-06-11", business: 156.70, personal: 123.50 },
  { date: "2024-06-12", business: 634.90, personal: 378.60 },
  { date: "2024-06-13", business: 145.60, personal: 98.80 },
  { date: "2024-06-14", business: 534.80, personal: 345.70 },
  { date: "2024-06-15", business: 398.70, personal: 298.50 },
  { date: "2024-06-16", business: 456.90, personal: 267.80 },
  { date: "2024-06-17", business: 598.50, personal: 456.20 },
  { date: "2024-06-18", business: 167.80, personal: 134.60 },
  { date: "2024-06-19", business: 432.60, personal: 267.40 },
  { date: "2024-06-20", business: 534.70, personal: 398.50 },
  { date: "2024-06-21", business: 234.80, personal: 178.60 },
  { date: "2024-06-22", business: 398.40, personal: 234.70 },
  { date: "2024-06-23", business: 634.80, personal: 456.30 },
  { date: "2024-06-24", business: 189.60, personal: 145.70 },
  { date: "2024-06-25", business: 234.50, personal: 167.80 },
  { date: "2024-06-26", business: 567.40, personal: 334.90 },
  { date: "2024-06-27", business: 598.60, personal: 423.80 },
  { date: "2024-06-28", business: 234.70, personal: 178.50 },
  { date: "2024-06-29", business: 167.50, personal: 123.60 },
  { date: "2024-06-30", business: 598.80, personal: 378.70 },
];

const chartConfig = {
  spending: {
    label: "Daily Spending",
  },
  business: {
    label: "Business",
    color: "hsl(var(--primary))",
  },
  personal: {
    label: "Personal",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const referenceDate = new Date("2024-06-30");
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Daily Spending</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Business and personal expenses for the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillBusiness" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-business)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-business)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPersonal" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-personal)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-personal)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  valueFormatter={(value) => `$${value.toFixed(2)}`}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="personal"
              type="natural"
              fill="url(#fillPersonal)"
              stroke="var(--color-personal)"
              stackId="a"
            />
            <Area
              dataKey="business"
              type="natural"
              fill="url(#fillBusiness)"
              stroke="var(--color-business)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
