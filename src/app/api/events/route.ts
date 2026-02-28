import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const familyId = request.nextUrl.searchParams.get("familyId");

  const where = familyId
    ? {
        OR: [
          { organizerFamilyId: parseInt(familyId, 10) },
          { signups: { some: { familyId: parseInt(familyId, 10) } } },
        ],
      }
    : {};

  const events = await prisma.campingEvent.findMany({
    where,
    include: {
      organizer: true,
      _count: { select: { signups: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(events);
}
