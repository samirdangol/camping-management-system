import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const payments = await prisma.settlementPayment.findMany({
    where: { eventId: parseInt(eventId, 10) },
    include: { from: true, to: true },
  });
  return NextResponse.json(payments);
}
