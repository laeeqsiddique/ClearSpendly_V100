import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubscriptionsPage } from "./_components/subscriptions-page";

export const dynamic = 'force-dynamic';

export default async function Subscriptions() {
  const user = await getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return <SubscriptionsPage />;
}