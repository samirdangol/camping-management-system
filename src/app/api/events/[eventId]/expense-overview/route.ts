import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeSettlementPlan } from "@/lib/settlement";
import type { ExpenseSummary, Family, FamilyBalance, SettlementTransaction } from "@/types";

/**
 * Bundles everything the Expenses page needs into one round-trip:
 * signups, expenses, settlement summary, and recorded settlement payments.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const eid = parseInt(eventId, 10);

  const [signups, expenses, settlementPayments] = await Promise.all([
    prisma.eventSignup.findMany({
      where: { eventId: eid },
      include: { family: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { eventId: eid },
      include: { paidBy: true },
      orderBy: { date: "desc" },
    }),
    prisma.settlementPayment.findMany({
      where: { eventId: eid },
    }),
  ]);

  const familyById = new Map<number, Family>();
  for (const s of signups) familyById.set(s.familyId, s.family);

  const plan = computeSettlementPlan(
    expenses.map((e) => ({ amount: Number(e.amount), paidByFamilyId: e.paidByFamilyId })),
    signups.map((s) => s.familyId),
  );

  const balances: FamilyBalance[] = plan.balances
    .map((b) => ({
      family: familyById.get(b.familyId)!,
      totalPaid: b.totalPaid,
      fairShare: plan.perFamilyShare,
      balance: b.balance,
    }))
    .sort((a, b) => b.balance - a.balance);

  const settlements: SettlementTransaction[] = plan.required
    .map((r) => {
      const from = familyById.get(r.fromFamilyId);
      const to = familyById.get(r.toFamilyId);
      if (!from || !to) return null;
      return { from, to, amount: r.amount };
    })
    .filter((s): s is SettlementTransaction => s !== null);

  const collector =
    plan.hubFamilyId !== null ? familyById.get(plan.hubFamilyId) : undefined;

  const summary: ExpenseSummary = {
    totalExpenses: plan.totalExpenses,
    familyCount: signups.length,
    perFamilyShare: plan.perFamilyShare,
    balances,
    settlements,
    settlementMode: "centralized",
    collector,
  };

  return NextResponse.json({ signups, expenses, summary, settlementPayments });
}
