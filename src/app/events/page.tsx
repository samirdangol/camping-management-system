"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateRange } from "@/lib/utils";
import { FamilyAvatar } from "@/components/shared/family-avatar";
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
  locationUrl: string | null;
  campsiteUrl: string | null;
  startDate: string;
  endDate: string;
  status: string;
  description: string | null;
  inviteCode: string;
  organizer: Family;
  _count: { signups: number };
};

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  active: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-900/40 text-red-300 border-red-700/50",
};

export default function EventsPage() {
  const { familyId, isLoaded } = useCurrentFamily();
  const [events, setEvents] = useState<EventWithOrganizer[]>([]);
  const [communityEvents, setCommunityEvents] = useState<EventWithOrganizer[]>([]);
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
    Promise.all([
      fetch(`/api/events?familyId=${familyId}`).then((r) => r.json()),
      fetch(`/api/events`).then((r) => r.json()),
    ])
      .then(([myEvents, allEvents]) => {
        setEvents(myEvents);
        const myEventIds = new Set(myEvents.map((e: EventWithOrganizer) => e.id));
        setCommunityEvents(
          allEvents.filter(
            (e: EventWithOrganizer) =>
              !myEventIds.has(e.id) &&
              (e.status === "upcoming" || e.status === "active")
          )
        );
      })
      .finally(() => setLoading(false));
  }, [familyId, isLoaded]);

  const upcoming = events
    .filter((e) => e.status === "upcoming" || e.status === "active")
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const past = events
    .filter((e) => e.status === "completed" || e.status === "cancelled")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  if (!isLoaded || loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Camping Trips" description="Plan and manage group camping trips">
        <Button asChild>
          <Link href="/events/new">
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Link>
        </Button>
      </PageHeader>

      {events.length === 0 && communityEvents.length === 0 ? (
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
            <section className="space-y-2">
              <h2 className="text-base font-semibold">Upcoming Trips</h2>
              <div className="grid gap-2">
                {upcoming.map((event) => (
                  <Card key={event.id} className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => router.push(`/events/${event.id}`)}>
                    <CardHeader className="pb-1.5 px-3 pt-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{event.title}</CardTitle>
                        <Badge className={statusColors[event.status]} variant="secondary">
                          {event.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground px-3 pb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatDateRange(new Date(event.startDate), new Date(event.endDate))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {event._count.signups} {event._count.signups === 1 ? "family" : "families"}
                      </div>
                      {event.description && <p className="text-xs">{event.description}</p>}
                      <div className="text-xs inline-flex items-center">Organized by <FamilyAvatar familyId={event.organizer.id} className="w-4 h-4 text-[10px] ml-1 mr-0.5" />{event.organizer.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {communityEvents.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base font-semibold">Community Trips</h2>
              <p className="text-xs text-muted-foreground">Upcoming trips from the community</p>
              <div className="grid gap-2">
                {communityEvents
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((event) => (
                    <Link key={event.id} href={`/join/${event.inviteCode}`}>
                      <Card className="hover:border-primary/40 transition-colors cursor-pointer border-dashed">
                        <CardHeader className="pb-1.5 px-3 pt-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{event.title}</CardTitle>
                            <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/50" variant="secondary">
                              open
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm text-muted-foreground px-3 pb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {event.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {formatDateRange(new Date(event.startDate), new Date(event.endDate))}
                          </div>
                          <div className="text-xs inline-flex items-center">Organized by <FamilyAvatar familyId={event.organizer.id} className="w-4 h-4 text-[10px] ml-1 mr-0.5" />{event.organizer.name}</div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-muted-foreground">Past Trips</h2>
              <div className="grid gap-2">
                {past.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <Card className="hover:border-primary/40 transition-colors cursor-pointer opacity-60">
                      <CardHeader className="pb-1.5 px-3 pt-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{event.title}</CardTitle>
                          <Badge className={statusColors[event.status]} variant="secondary">
                            {event.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm text-muted-foreground px-3 pb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
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
