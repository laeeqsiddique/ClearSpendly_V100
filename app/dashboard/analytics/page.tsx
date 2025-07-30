import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "./_components/analytics-dashboard";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return <AnalyticsDashboard />;
}