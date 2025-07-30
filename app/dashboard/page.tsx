import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MainDashboard } from "./_components/main-dashboard";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return <MainDashboard />;
}
