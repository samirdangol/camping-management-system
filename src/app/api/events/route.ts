import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentGroup } from "@/lib/auth";
import { computeSettlementStatus } from "@/lib/settlement-status";

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
      expenses: { select: { amount: true, paidByFamilyId: true } },
      signups: { select: { familyId: true } },
      settlementPayments: { select: { fromFamilyId: true, toFamilyId: true } },
    },
    orderBy: { startDate: "desc" },
  });

  const enriched = events.map(({ expenses, signups, settlementPayments, ...rest }) => {
    const { allSettled } = computeSettlementStatus(
      expenses,
      signups.map((s) => s.familyId),
      settlementPayments,
    );
    return { ...rest, allSettled };
  });

  return NextResponse.json(enriched);
}
