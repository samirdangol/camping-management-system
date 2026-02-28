import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const groceries = await prisma.groceryItem.findMany({
    where: { eventId: parseInt(eventId, 10) },
    include: { assignedTo: true, volunteers: { include: { family: true } } },
    orderBy: [{ isPurchased: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(groceries);
}
