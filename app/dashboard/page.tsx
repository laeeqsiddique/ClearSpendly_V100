import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SectionCards } from "./_components/section-cards";
import { ChartAreaInteractive } from "./_components/chart-interactive";
import { CategoryBreakdown } from "./_components/category-breakdown";
import { RecentActivity } from "./_components/recent-activity";
import { Button } from "@/components/ui/button";
import { Upload, Search, Plus, TrendingUp, PieChart } from "lucide-react";
import Link from "next/link";

export default async function Dashboard() {
  const user = await getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col items-start justify-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Receipt Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track your spending, manage receipts, and get AI-powered insights.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search Receipts
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipt
              </Link>
            </Button>
          </div>
        </div>
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="grid grid-cols-1 @4xl/main:grid-cols-3 gap-4">
              <div className="@4xl/main:col-span-2">
                <ChartAreaInteractive />
              </div>
              <div>
                <RecentActivity />
              </div>
            </div>
            <CategoryBreakdown />
          </div>
        </div>
      </div>
    </section>
  );
}
