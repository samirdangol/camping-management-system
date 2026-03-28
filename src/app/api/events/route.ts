import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentGroup } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const familyId = request.nextUrl.searchParams.get("familyId");
  const { groupId } = await getCurrentGroup();

  const conditions: Record<string, unknown>[] = [];

  if (familyId) {
    conditions.push({
      OR: [
        { organizerFamilyId: parseInt(familyId, 10) },
        { signups: { some: { familyId: parseInt(familyId, 10) } } },
      ],
    });
  }

  if (groupId) {
    conditions.push({ groupId });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

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
