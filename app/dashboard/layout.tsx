"use client";

import { ReactNode } from "react";
import DashboardTopNav from "./_components/navbar";
import DashboardSideBar from "./_components/sidebar";
import { SidebarProvider, useSidebar } from "./_components/sidebar-context";
import clsx from "clsx";

function DashboardContent({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden w-full">
      {/* Mobile: Sidebar as overlay, Desktop: Sidebar in flex layout */}
      <div className="hidden lg:flex h-full">
        <DashboardSideBar />
        <main className="flex-1 overflow-y-auto min-w-0">
          <DashboardTopNav>{children}</DashboardTopNav>
        </main>
      </div>
      
      {/* Mobile Layout: Full width main content */}
      <div className="lg:hidden h-full">
        <DashboardSideBar />
        <main className="h-full overflow-y-auto">
          <DashboardTopNav>{children}</DashboardTopNav>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
