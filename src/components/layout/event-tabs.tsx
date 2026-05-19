"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  Package,
  TreePine,
  DollarSign,
  ScrollText,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BASE_TABS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Signup", href: "/signup", icon: Users },
  { label: "Meals", href: "/meals", icon: UtensilsCrossed },
  { label: "Supplies", href: "/supplies", icon: Package },
  { label: "Activities", href: "/activities", icon: TreePine },
  { label: "Expenses", href: "/expenses", icon: DollarSign },
];

const REPORT_TAB = { label: "Report", href: "/report", icon: ScrollText };

export function EventTabs({ eventId, showReport }: { eventId: string; showReport?: boolean }) {
  const tabs = showReport ? [...BASE_TABS, REPORT_TAB] : BASE_TABS;
  const pathname = usePathname();
  const basePath = `/events/${eventId}`;

  const activeTab = tabs.find((tab) =>
    tab.href === ""
      ? pathname === basePath
      : pathname.startsWith(`${basePath}${tab.href}`)
  ) || tabs[0];

  return (
    <div className="relative">
      {/* Mobile: shadcn DropdownMenu — gives us focus, escape, and click-outside for free. */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium">
              <activeTab.icon className="h-4 w-4 text-primary" />
              <span className="flex-1 text-left">{activeTab.label}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)]"
          >
            {tabs.map((tab) => {
              const href = `${basePath}${tab.href}`;
              const isActive = tab === activeTab;
              return (
                <DropdownMenuItem key={tab.href} asChild>
                  <Link
                    href={href}
                    className={cn(
                      "flex cursor-pointer items-center gap-2",
                      isActive && "bg-primary/15 text-primary font-medium",
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: horizontal tabs */}
      <nav className="hidden sm:flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.href}`;
          const isActive = tab === activeTab;
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
