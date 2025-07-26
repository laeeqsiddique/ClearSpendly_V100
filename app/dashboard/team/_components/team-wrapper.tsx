"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import TeamLoading from "../loading";

// Dynamically import to avoid hydration issues
const TeamManagement = dynamic(
  () => import("./team-management").then(mod => ({ default: mod.TeamManagement })),
  {
    ssr: false,
    loading: () => <TeamLoading />
  }
);

export function TeamWrapper() {
  return (
    <Suspense fallback={<TeamLoading />}>
      <TeamManagement />
    </Suspense>
  );
}