import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EventDashboardClient } from "@/components/events/event-dashboard-client";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: eid } = await params;
  const eventId = parseInt(eid, 10);

  const event = await prisma.campingEvent.findUnique({
    where: { id: eventId },
    include: {
      organizer: true,
      signups: { include: { family: true } },
      _count: { select: { meals: true, activities: true, groceryItems: true, equipment: true, expenses: true } },
    },
  });

  if (!event) notFound();

  const expenses = await prisma.expense.aggregate({
    where: { eventId },
    _sum: { amount: true },
  });
  const totalExpenses = Number(expenses._sum.amount || 0);

  // Serialize dates for client component
  const eventData = {
    id: event.id,
    title: event.title,
    location: event.location,
    locationUrl: event.locationUrl,
    description: event.description,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    organizerFamilyId: event.organizerFamilyId,
    inviteCode: event.inviteCode,
    status: event.status,
    signups: event.signups.map((s) => ({
      id: s.id,
      adults: s.adults,
      kids: s.kids,
      elderly: s.elderly,
      vegetarians: s.vegetarians,
      family: s.family,
    })),
    _count: event._count,
    totalExpenses,
  };

  return <EventDashboardClient event={eventData} />;
}
