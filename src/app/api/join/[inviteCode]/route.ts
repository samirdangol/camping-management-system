import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;

  const event = await prisma.campingEvent.findUnique({
    where: { inviteCode },
    include: {
      organizer: { select: { name: true } },
      signups: { select: { familyId: true } },
      _count: { select: { signups: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: event.id,
    title: event.title,
    location: event.location,
    locationUrl: event.locationUrl,
    campsiteUrl: event.campsiteUrl,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    organizerName: event.organizer.name,
    signupCount: event._count.signups,
    signupFamilyIds: event.signups.map((s) => s.familyId),
    status: event.status,
  });
}
