import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardWithAI } from "../_components/dashboard-with-ai";

export default async function ExpensesPage() {
  const user = await getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return <DashboardWithAI />;
}