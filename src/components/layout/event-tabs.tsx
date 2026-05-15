"use client";

import { useState } from "react";
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
  Menu,
  type LucideIcon,
} from "lucide-react";

const tabs: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Signup", href: "/signup", icon: Users },
  { label: "Meals", href: "/meals", icon: UtensilsCrossed },
  { label: "Bring List", href: "/bring-list", icon: Package },
  { label: "Activities", href: "/activities", icon: TreePine },
  { label: "Expenses", href: "/expenses", icon: DollarSign },
];

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const basePath = `/events/${eventId}`;
  const [open, setOpen] = useState(false);

  const activeTab = tabs.find((tab) =>
    tab.href === ""
      ? pathname === basePath
      : pathname.startsWith(`${basePath}${tab.href}`)
  ) || tabs[0];

  return (
    <div className="relative">
      {/* Mobile: dropdown trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex sm:hidden items-center gap-2 w-full rounded-md border bg-card px-3 py-2 text-sm font-medium"
      >
        <activeTab.icon className="h-4 w-4 text-primary" />
        <span className="flex-1 text-left">{activeTab.label}</span>
        <Menu className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Mobile: dropdown menu */}
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-lg sm:hidden">
          {tabs.map((tab) => {
            const href = `${basePath}${tab.href}`;
            const isActive = tab === activeTab;
            return (
              <Link
                key={tab.href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}

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
