"use client";

import { useRouter, usePathname } from "next/navigation";
import { Tent, LogOut, Users, ArrowLeftRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentFamily } from "@/hooks/use-current-family";
import Link from "next/link";

export function AppHeader() {
  const { familyName, setCurrentFamily, isLoaded } = useCurrentFamily();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    setCurrentFamily(null, null);
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  // Don't show header on login, join, or select-family pages
  if (
    pathname === "/login" ||
    pathname === "/select-family" ||
    pathname.startsWith("/join/")
  )
    return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          href="/events"
          className="flex items-center gap-2 font-semibold text-green-700"
        >
          <Tent className="h-5 w-5" />
          <span className="hidden sm:inline">Camp Planner</span>
        </Link>

        <div className="flex items-center gap-2">
          {isLoaded && familyName && (
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium max-w-[140px] truncate">
                {familyName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-xs text-muted-foreground"
                asChild
                title="Edit family"
              >
                <Link href="/select-family?switch=true">
                  <Pencil className="h-3 w-3" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-xs text-muted-foreground"
                asChild
                title="Switch family"
              >
                <Link href="/select-family?switch=true">
                  <ArrowLeftRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
