import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ExpenseSummary, FamilyBalance, SettlementTransaction } from "@/types";

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

  // Calculate settlement transactions using greedy algorithm
  const settlements: SettlementTransaction[] = [];
  const creditors = balances.filter((b) => b.balance > 0.01).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.balance < -0.01).map((b) => ({ ...b, balance: Math.abs(b.balance) }));

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].balance, debtors[di].balance);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[di].family,
        to: creditors[ci].family,
        amount: Math.round(amount * 100) / 100,
      });
    }
    creditors[ci].balance -= amount;
    debtors[di].balance -= amount;
    if (creditors[ci].balance < 0.01) ci++;
    if (debtors[di].balance < 0.01) di++;
  }

  const summary: ExpenseSummary = {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    familyCount,
    perFamilyShare: Math.round(perFamilyShare * 100) / 100,
    balances,
    settlements,
  };

  return NextResponse.json(summary);
}
