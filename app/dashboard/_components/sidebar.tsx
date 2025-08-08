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
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Car,
  FileText,
  CreditCard,
  Mail,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  Plus,
  List,
  UserCircle,
  Palette,
  FileImage,
  Users,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-context";
import { useState } from "react";
import { useTeamContext } from "@/hooks/use-team-context";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Primary navigation items - standalone for quick access
const primaryNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: TrendingUp,
  },
  {
    label: "Mileage",
    href: "/dashboard/mileage",
    icon: Car,
  },
];

const navSections: NavSection[] = [
  {
    label: "Expenses",
    icon: Receipt,
    items: [
      {
        label: "Overview",
        href: "/dashboard/expenses",
        icon: List,
      },
      {
        label: "Add Receipt",
        href: "/dashboard/upload",
        icon: Upload,
      },
      {
        label: "Add Manual Entry",
        href: "/dashboard/add-expense",
        icon: Plus,
      },
      {
        label: "Subscriptions",
        href: "/dashboard/subscriptions",
        icon: RefreshCw,
      },
      {
        label: "Categories & Tags",
        href: "/dashboard/tags",
        icon: Tag,
      },
    ],
  },
  {
    label: "Revenue",
    icon: DollarSign,
    items: [
      {
        label: "Invoices",
        href: "/dashboard/invoices",
        icon: FileText,
      },
      {
        label: "Payments",
        href: "/dashboard/payments",
        icon: CreditCard,
      },
      {
        label: "Invoice Templates",
        href: "/dashboard/invoice-templates",
        icon: FileImage,
      },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      {
        label: "Team Members",
        href: "/dashboard/team",
        icon: Users,
      },
      {
        label: "Email Templates",
        href: "/dashboard/email-templates",
        icon: Mail,
      },
      {
        label: "PayPal Links",
        href: "/dashboard/payment-settings",
        icon: DollarSign,
      },
      {
        label: "Account",
        href: "/dashboard/admin",
        icon: UserCircle,
      },
    ],
  },
];

export default function DashboardSideBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  // Enable test mode for development to count pending users
  const isDevelopment = process.env.NODE_ENV === 'development';
  const teamContext = useTeamContext(isDevelopment);
  
  // Filter navigation sections based on team context
  const filteredNavSections = navSections.map(section => {
    // Filter out Team Members from Settings for single-user tenants OR while loading
    if (section.label === "Settings" && (!teamContext.showTeamFeatures || teamContext.loading)) {
      return {
        ...section,
        items: section.items.filter(item => item.label !== "Team Members")
      };
    }
    return section;
  });
  
  // Initialize expanded sections based on current path
  const getInitialExpandedSections = () => {
    const active = filteredNavSections.find(section => 
      section.items.some(item => pathname === item.href)
    );
    return active ? [active.label] : ["Expenses"];
  };
  
  const [expandedSections, setExpandedSections] = useState<string[]>(getInitialExpandedSections());

  const toggleSection = (sectionLabel: string) => {
    if (isCollapsed) return;
    setExpandedSections(prev =>
      prev.includes(sectionLabel)
        ? prev.filter(s => s !== sectionLabel)
        : [...prev, sectionLabel]
    );
  };

  const isItemActive = (href: string) => pathname === href;
  
  const isSectionActive = (section: NavSection) => 
    section.items.some(item => isItemActive(item.href));

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
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Flowvya</span>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="w-full space-y-1 px-3">
            {/* Primary Navigation Items */}
            <div className="space-y-1 mb-4">
              {primaryNavItems.map((item) => (
                <div
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={clsx(
                    "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-all duration-200 hover:cursor-pointer group",
                    isItemActive(item.href)
                      ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-900 shadow-sm border-l-4 border-purple-500"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <div className={clsx(
                    "p-1.5 rounded-lg transition-all duration-200",
                    isItemActive(item.href)
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  {!isCollapsed && (
                    <span className={clsx(
                      "font-medium",
                      isItemActive(item.href) && "text-purple-900"
                    )}>
                      {item.label}
                    </span>
                  )}
                  
                  {/* Tooltip for collapsed view */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Divider and Section Label */}
            {!isCollapsed && (
              <div className="px-3 py-2">
                <div className="h-px bg-gray-200 mb-3" />
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                  Manage
                </div>
              </div>
            )}

            <div className="space-y-1">
            {filteredNavSections.map((section) => {
              const isExpanded = expandedSections.includes(section.label);
              const sectionActive = isSectionActive(section);
              
              return (
                <div key={section.label} className="space-y-1">
                  {/* Section Header */}
                  <div
                    onClick={() => toggleSection(section.label)}
                    className={clsx(
                      "flex items-center gap-2 w-full rounded-lg px-3 py-2.5 transition-all duration-200 hover:cursor-pointer group",
                      isCollapsed ? "justify-center" : "justify-between",
                      sectionActive
                        ? "bg-gradient-to-r from-purple-50 to-blue-50 text-purple-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "p-1.5 rounded-lg transition-all duration-200",
                        sectionActive
                          ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                      )}>
                        <section.icon className="h-4 w-4" />
                      </div>
                      {!isCollapsed && (
                        <span className={clsx(
                          "font-semibold text-sm",
                          sectionActive && "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
                        )}>
                          {section.label}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown
                        className={clsx(
                          "h-4 w-4 transition-transform duration-200",
                          isExpanded ? "rotate-180" : "",
                          sectionActive ? "text-purple-600" : "text-gray-400"
                        )}
                      />
                    )}
                  </div>

                  {/* Section Items */}
                  {!isCollapsed && (
                    <div
                      className={clsx(
                        "space-y-0.5 overflow-hidden transition-all duration-300",
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      {section.items.map((item) => {
                        const itemActive = isItemActive(item.href);
                        
                        return (
                          <div
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            className={clsx(
                              "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:cursor-pointer ml-6 group",
                              itemActive
                                ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-900 shadow-sm border-l-4 border-purple-500"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
                            )}
                          >
                            <item.icon className={clsx(
                              "h-4 w-4 transition-colors",
                              itemActive ? "text-purple-600" : "text-gray-400 group-hover:text-gray-600"
                            )} />
                            <span className={clsx(
                              "font-medium",
                              itemActive && "text-purple-900"
                            )}>
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Collapsed view - show items as tooltip */}
                  {isCollapsed && isExpanded && (
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const itemActive = isItemActive(item.href);
                        
                        return (
                          <div
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            className={clsx(
                              "flex items-center justify-center w-full rounded-lg p-2 transition-all duration-200 hover:cursor-pointer relative group",
                              itemActive
                                ? "bg-gradient-to-r from-purple-100 to-blue-100"
                                : "hover:bg-gray-50"
                            )}
                            title={item.label}
                          >
                            <item.icon className={clsx(
                              "h-4 w-4",
                              itemActive ? "text-purple-600" : "text-gray-500"
                            )} />
                            
                            {/* Tooltip */}
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                              {item.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
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
