"use client";

import UserProfile from "@/components/user-profile";
import clsx from "clsx";
import {
  Banknote,
  HomeIcon,
  LucideIcon,
  Receipt,
  Settings,
  Tag,
  Upload,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
    label: "Tags",
    href: "/dashboard/tags",
    icon: Tag,
  },
  {
    label: "Payment Gated",
    href: "/dashboard/payment",
    icon: Banknote,
  },
  {
    label: "Admin",
    href: "/dashboard/admin",
    icon: Shield,
  },
];

export default function DashboardSideBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-[1024px]:block hidden w-64 border-r h-full bg-background">
      <div className="flex h-full flex-col">
        <div className="flex h-[3.45rem] items-center border-b px-4">
          <Link
            prefetch={true}
            className="flex items-center gap-2 font-semibold hover:cursor-pointer group"
            href="/"
          >
            <div className="relative">
              <Receipt className="h-6 w-6 text-purple-600 group-hover:text-purple-700 transition-colors" />
              <div className="absolute -inset-1 bg-purple-200/50 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-gray-900 dark:text-white">ClearSpendly</span>
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
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="px-4">
              <div
                onClick={() => router.push("/dashboard/settings")}
                className={clsx(
                  "flex items-center w-full gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                  pathname === "/dashboard/settings"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </div>
            </div>
            <UserProfile />
          </div>
        </nav>
      </div>
    </div>
  );
}
