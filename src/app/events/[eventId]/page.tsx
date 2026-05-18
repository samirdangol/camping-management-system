import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EventDashboardClient } from "@/components/events/event-dashboard-client";
import { computeSettlementStatus } from "@/lib/settlement-status";

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
      _count: { select: { meals: true, activities: true, supplies: true, expenses: true } },
    },
  });

  if (!event) notFound();

  const [expenseRows, settlementPayments] = await Promise.all([
    prisma.expense.findMany({
      where: { eventId },
      select: { amount: true, paidByFamilyId: true },
    }),
    prisma.settlementPayment.findMany({
      where: { eventId },
      select: { fromFamilyId: true, toFamilyId: true },
    }),
  ]);
  const totalExpenses = expenseRows.reduce((sum, e) => sum + Number(e.amount), 0);
  const { allSettled } = computeSettlementStatus(
    expenseRows,
    event.signups.map((s) => s.familyId),
    settlementPayments,
  );

  // Serialize dates for client component
  const eventData = {
    id: event.id,
    title: event.title,
    location: event.location,
    locationUrl: event.locationUrl,
    description: event.description,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    signupDeadline: event.signupDeadline ? event.signupDeadline.toISOString() : null,
    reservationNo: event.reservationNo,
    checkIn: event.checkIn,
    checkOut: event.checkOut,
    campsiteUrl: event.campsiteUrl,
    imageUrl: event.imageUrl,
    organizerFamilyId: event.organizerFamilyId,
    inviteCode: event.inviteCode,
    status: event.status,
    signups: event.signups.map((s) => ({
      id: s.id,
      adults: s.adults,
      kids: s.kids,
      elderly: s.elderly,
      vegetarians: s.vegetarians,
      notes: s.notes,
      family: s.family,
    })),
    _count: event._count,
    totalExpenses,
    allSettled,
  };

  return <EventDashboardClient event={eventData} />;
}
