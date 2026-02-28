"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  TreePine,
  ShoppingCart,
  Backpack,
  DollarSign,
} from "lucide-react";

const tabs = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Signup", href: "/signup", icon: Users },
  { label: "Meals", href: "/meals", icon: UtensilsCrossed },
  { label: "Activities", href: "/activities", icon: TreePine },
  { label: "Groceries", href: "/groceries", icon: ShoppingCart },
  { label: "Equipment", href: "/equipment", icon: Backpack },
  { label: "Expenses", href: "/expenses", icon: DollarSign },
];

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const basePath = `/events/${eventId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
      {tabs.map((tab) => {
        const href = `${basePath}${tab.href}`;
        const isActive =
          tab.href === ""
            ? pathname === basePath
            : pathname.startsWith(href);

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-green-100 text-green-800"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
