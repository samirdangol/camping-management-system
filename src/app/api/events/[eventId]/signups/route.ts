import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const signups = await prisma.eventSignup.findMany({
    where: { eventId: parseInt(eventId, 10) },
    include: { family: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(signups);
}
