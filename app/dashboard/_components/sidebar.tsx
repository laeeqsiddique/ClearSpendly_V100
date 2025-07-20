"use client";

import clsx from "clsx";
import {
  Banknote,
  HomeIcon,
  LucideIcon,
  Receipt,
  Tag,
  Upload,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Car,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-context";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    label: "Receipts",
    href: "/dashboard/receipts",
    icon: Receipt,
  },
  {
    label: "Upload",
    href: "/dashboard/upload",
    icon: Upload,
  },
  {
    label: "Mileage",
    href: "/dashboard/mileage",
    icon: Car,
  },
  {
    label: "Invoices",
    href: "/dashboard/invoices",
    icon: FileText,
  },
  {
    label: "Tags",
    href: "/dashboard/tags",
    icon: Tag,
  },
  {
    label: "Account",
    href: "/dashboard/admin",
    icon: Settings,
  },
];

export default function DashboardSideBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "relative h-full bg-background border-r transition-all duration-300 z-40",
        isCollapsed ? "w-16" : "w-64",
        isMobileOpen ? "fixed lg:relative translate-x-0" : "fixed lg:relative -translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
        <div className="flex h-[3.45rem] items-center border-b px-4">
          <Link
            prefetch={true}
            className={clsx(
              "flex items-center gap-2 font-semibold hover:cursor-pointer group",
              isCollapsed && "justify-center w-full"
            )}
            href="/"
          >
            <div className="relative">
              <Receipt className="h-6 w-6 text-purple-600 group-hover:text-purple-700 transition-colors" />
              <div className="absolute -inset-1 bg-purple-200/50 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {!isCollapsed && (
              <span className="text-gray-900 dark:text-white">ClearSpendly</span>
            )}
          </Link>
        </div>

        <nav className="flex flex-col h-full justify-between items-start w-full space-y-1">
          <div className="w-full space-y-1 p-4">
            {navItems.map((item) => (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                className={clsx(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                  pathname === item.href
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={item.label}
              >
                <item.icon className={clsx("h-4 w-4", isCollapsed ? "mx-auto" : "")} />
                {!isCollapsed && item.label}
              </div>
            ))}
          </div>
        </nav>
      </div>
      
      {/* Floating collapse button */}
      <div className="hidden lg:block">
        <Button
          variant="secondary"
          size="icon"
          className={clsx(
            "absolute top-6 h-8 w-8 rounded-full shadow-lg bg-purple-600 text-white hover:bg-purple-700 transition-all duration-300",
            isCollapsed ? "-right-4" : "right-3"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
    </>
  );
}
