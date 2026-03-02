"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateRange, locationLink } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Plus, Tent, MapPin, Calendar, Users, ExternalLink } from "lucide-react";
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
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
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
    <div className="space-y-6">
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
                        <a href={locationLink(event.location, event.locationUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" onClick={(e) => e.stopPropagation()}>
                          <MapPin className="h-4 w-4 shrink-0" />
                          {event.location} <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          {formatDateRange(new Date(event.startDate), new Date(event.endDate))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0" />
                          {event._count.signups} {event._count.signups === 1 ? "family" : "families"} signed up
                        </div>
                        {event.campsiteUrl && (
                          <div>
                            <a href={event.campsiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              Campsite Official Page <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {event.description && <p className="text-xs">{event.description}</p>}
                        <div className="text-xs">Organized by {event.organizer.name}</div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {communityEvents.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Community Trips</h2>
              <p className="text-sm text-muted-foreground">Upcoming trips from the community — sign up to join!</p>
              <div className="grid gap-3">
                {communityEvents
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((event) => (
                    <Link key={event.id} href={`/join/${event.inviteCode}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            <Badge className="bg-amber-100 text-amber-800" variant="secondary">
                              open
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                          <a href={locationLink(event.location, event.locationUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" onClick={(e) => e.stopPropagation()}>
                            <MapPin className="h-4 w-4 shrink-0" />
                            {event.location} <ExternalLink className="h-3 w-3" />
                          </a>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 shrink-0" />
                            {formatDateRange(new Date(event.startDate), new Date(event.endDate))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 shrink-0" />
                            {event._count.signups} {event._count.signups === 1 ? "family" : "families"} signed up
                          </div>
                          {event.campsiteUrl && (
                            <div>
                              <a href={event.campsiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                Campsite Official Page <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {event.description && <p className="text-xs">{event.description}</p>}
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
