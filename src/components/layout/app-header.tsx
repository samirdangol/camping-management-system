"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Tent, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentFamily } from "@/hooks/use-current-family";
import type { Family, SignupWithFamily } from "@/types";
import Link from "next/link";

export function AppHeader() {
  const [families, setFamilies] = useState<Family[]>([]);
  const { familyId, setCurrentFamily, isLoaded } = useCurrentFamily();
  const router = useRouter();
  const pathname = usePathname();

  // Extract eventId from pathname like /events/123 or /events/123/meals
  const eventIdMatch = pathname.match(/^\/events\/(\d+)/);
  const eventId = eventIdMatch ? eventIdMatch[1] : null;

  useEffect(() => {
    if (!eventId) {
      setFamilies([]);
      return;
    }

    fetch(`/api/events/${eventId}/signups`)
      .then((res) => res.json())
      .then((signups: SignupWithFamily[]) => {
        setFamilies(signups.map((s) => s.family));
      })
      .catch(() => setFamilies([]));
  }, [eventId]);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  // Don't show header on login or join pages
  if (pathname === "/login" || pathname.startsWith("/join/")) return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/events" className="flex items-center gap-2 font-semibold text-green-700">
          <Tent className="h-5 w-5" />
          <span className="hidden sm:inline">Camp Planner</span>
        </Link>

        <div className="flex items-center gap-2">
          {isLoaded && eventId && families.length > 0 && (
            <Select
              value={familyId?.toString() ?? ""}
              onValueChange={(val) => setCurrentFamily(parseInt(val, 10))}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Select family" />
              </SelectTrigger>
              <SelectContent>
                {families.map((f) => (
                  <SelectItem key={f.id} value={f.id.toString()}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
