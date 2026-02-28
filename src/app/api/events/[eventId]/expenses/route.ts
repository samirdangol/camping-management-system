import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const expenses = await prisma.expense.findMany({
    where: { eventId: parseInt(eventId, 10) },
    include: { paidBy: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}
