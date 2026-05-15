"use client";

import { useRouter, usePathname } from "next/navigation";
import { MountainSnow, LogOut, ArrowLeftRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useCurrentGroup } from "@/hooks/use-current-group";
import { FamilyAvatar } from "@/components/shared/family-avatar";
import Link from "next/link";

export function AppHeader() {
  const { familyId, familyName, setCurrentFamily, isLoaded } = useCurrentFamily();
  const { groupId, groupName } = useCurrentGroup();
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
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-3 sm:px-4">
        <Link
          href="/events"
          className="flex items-center gap-2 font-semibold text-primary"
        >
          <MountainSnow className="h-5 w-5" />
          <span className="hidden sm:inline">Nepali Camping</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {groupName && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden sm:inline">
              {groupName}
            </span>
          )}
          {isLoaded && familyName && (
            <div className="flex items-center gap-1 text-sm">
              {familyId && <FamilyAvatar familyId={familyId} className="w-6 h-6 mr-0" />}
              <span className="font-medium max-w-[120px] truncate text-xs">
                {familyName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
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
            className="h-8 w-8"
            asChild
            title="Group settings"
          >
            <Link href="/group-settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
