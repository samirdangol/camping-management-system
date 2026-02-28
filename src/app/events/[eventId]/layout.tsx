import { prisma } from "@/lib/prisma";
import { formatDateRange } from "@/lib/utils";
import { notFound } from "next/navigation";
import { MapPin, Calendar } from "lucide-react";
import { EventTabs } from "@/components/layout/event-tabs";
import { EventAccessGuard } from "@/components/shared/event-access-guard";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await prisma.campingEvent.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
        <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {event.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateRange(event.startDate, event.endDate)}
          </span>
        </div>
      </div>
      <EventTabs eventId={eventId} />
      <EventAccessGuard eventId={eventId}>{children}</EventAccessGuard>
    </div>
  );
}
