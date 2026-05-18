import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ExpenseSummary, Family, FamilyBalance, SettlementTransaction } from "@/types";

const EPSILON = 0.01;
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const eid = parseInt(eventId, 10);

  // Get all expenses for this event
  const expenses = await prisma.expense.findMany({
    where: { eventId: eid },
    include: { paidBy: true },
  });

  // Get all signed-up families
  const signups = await prisma.eventSignup.findMany({
    where: { eventId: eid },
    include: { family: true },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const familyCount = signups.length;
  const perFamilyShare = familyCount > 0 ? totalExpenses / familyCount : 0;

  // Calculate each family's balance
  const balances: FamilyBalance[] = signups.map((signup) => {
    const totalPaid = expenses
      .filter((e) => e.paidByFamilyId === signup.familyId)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      family: signup.family,
      totalPaid,
      fairShare: perFamilyShare,
      balance: totalPaid - perFamilyShare,
    };
  });

  // Sort balances: creditors (positive) first, then debtors (negative)
  balances.sort((a, b) => b.balance - a.balance);

  const creditors = balances.filter((b) => b.balance > EPSILON).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.balance < -EPSILON).map((b) => ({ ...b, balance: Math.abs(b.balance) }));
  let settlements: SettlementTransaction[] = [];
  let collector: Family | undefined;

  if (creditors.length > 0 && debtors.length > 0) {
    // Highest receiver collects from all debtors, then redistributes to other creditors.
    const hub = creditors[0];
    collector = hub.family;

    settlements = [
      ...debtors.map((d) => ({
        from: d.family,
        to: hub.family,
        amount: round2(d.balance),
      })),
      ...creditors.slice(1).map((c) => ({
        from: hub.family,
        to: c.family,
        amount: round2(c.balance),
      })),
    ];
  }

  const summary: ExpenseSummary = {
    totalExpenses: round2(totalExpenses),
    familyCount,
    perFamilyShare: round2(perFamilyShare),
    balances,
    settlements,
    settlementMode: "centralized",
    collector,
  };

  return NextResponse.json(summary);
}
