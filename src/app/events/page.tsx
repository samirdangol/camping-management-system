"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateRange } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Plus, Tent, MapPin, Calendar, Users } from "lucide-react";
import type { Family } from "@/types";

type EventWithOrganizer = {
  id: number;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
  organizer: Family;
  _count: { signups: number };
};

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function EventsPage() {
  const { familyId, isLoaded } = useCurrentFamily();
  const [events, setEvents] = useState<EventWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Redirect to family selection if no family is set
  useEffect(() => {
    if (isLoaded && !familyId) {
      router.push("/select-family");
    }
  }, [isLoaded, familyId, router]);

  useEffect(() => {
    if (!isLoaded || !familyId) return;
    fetch(`/api/events?familyId=${familyId}`)
      .then((r) => r.json())
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [familyId, isLoaded]);

  const upcoming = events.filter((e) => e.status === "upcoming" || e.status === "active");
  const past = events.filter((e) => e.status === "completed" || e.status === "cancelled");

  if (!isLoaded || loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Camping Trips" description="Plan and manage your group camping adventures">
        <Button asChild>
          <Link href="/events/new">
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Link>
        </Button>
      </PageHeader>

      {events.length === 0 ? (
        <EmptyState
          icon={Tent}
          title="No camping trips yet"
          description="Create your first camping trip or join one via an invite link!"
        >
          <Button asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Plan a Trip
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Upcoming Trips</h2>
              <div className="grid gap-3">
                {upcoming.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <Badge className={statusColors[event.status]} variant="secondary">
                            {event.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDateRange(new Date(event.startDate), new Date(event.endDate))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {event._count.signups} {event._count.signups === 1 ? "family" : "families"} signed up
                        </div>
                        <div className="text-xs">Organized by {event.organizer.name}</div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">Past Trips</h2>
              <div className="grid gap-3">
                {past.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-75">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <Badge className={statusColors[event.status]} variant="secondary">
                            {event.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDateRange(new Date(event.startDate), new Date(event.endDate))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
