import { getCurrentUserContext } from "@/lib/user-context";
import { redirect } from "next/navigation";
import TeamClientWrapper from "./_components/team-client-wrapper";

export default async function TeamPage() {
  const userContext = await getCurrentUserContext();
  
  if (!userContext) {
    redirect("/sign-in");
  }

  if (!['owner', 'admin'].includes(userContext.role)) {
    redirect("/dashboard");
  }
  
  return <TeamClientWrapper />;
}