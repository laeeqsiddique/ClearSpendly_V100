"use client";

import UserProfile from "@/components/user-profile";
import { ReactNode } from "react";

export default function DashboardTopNav({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <header className="flex h-12 sm:h-14 lg:h-[52px] items-center gap-3 sm:gap-4 border-b px-2 sm:px-3">
        <div className="flex justify-center items-center gap-2 ml-auto">
          <UserProfile mini={true} />
        </div>
      </header>
      {children}
    </div>
  );
}
