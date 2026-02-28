import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const activities = await prisma.activity.findMany({
    where: { eventId: parseInt(eventId, 10) },
    include: {
      leader: true,
      volunteers: { include: { family: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(activities);
}
