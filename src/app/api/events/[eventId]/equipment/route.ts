import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const equipment = await prisma.equipment.findMany({
    where: { eventId: parseInt(eventId, 10) },
    include: { owner: true, volunteers: { include: { family: true } } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(equipment);
}
