/**
 * Centralized-hub settlement algorithm — shared by:
 *   - src/lib/settlement-status.ts (deriving "all settled" for event phase)
 *   - src/app/api/events/[eventId]/expenses/summary/route.ts (settlement plan UI)
 *
 * Highest creditor is the hub; every debtor pays the hub, hub pays every
 * other creditor. One source of truth — if you change the algorithm here,
 * both callers update together.
 */

export const SETTLEMENT_EPSILON = 0.01;

export type ExpenseRow = { amount: number | string; paidByFamilyId: number };

export type FamilyBalanceLite = {
  familyId: number;
  totalPaid: number;
  balance: number;
};

export type RequiredTransaction = {
  fromFamilyId: number;
  toFamilyId: number;
  amount: number;
};

export type SettlementPlan = {
  totalExpenses: number;
  perFamilyShare: number;
  balances: FamilyBalanceLite[];
  hubFamilyId: number | null;
  required: RequiredTransaction[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeSettlementPlan(
  expenses: ExpenseRow[],
  signupFamilyIds: number[],
): SettlementPlan {
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const perFamilyShare = signupFamilyIds.length > 0 ? totalExpenses / signupFamilyIds.length : 0;

  const balances: FamilyBalanceLite[] = signupFamilyIds.map((familyId) => {
    const totalPaid = expenses
      .filter((e) => e.paidByFamilyId === familyId)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { familyId, totalPaid, balance: totalPaid - perFamilyShare };
  });

  const creditors = balances
    .filter((b) => b.balance > SETTLEMENT_EPSILON)
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter((b) => b.balance < -SETTLEMENT_EPSILON);

  if (creditors.length === 0 || debtors.length === 0) {
    return {
      totalExpenses: round2(totalExpenses),
      perFamilyShare: round2(perFamilyShare),
      balances,
      hubFamilyId: null,
      required: [],
    };
  }

  const hub = creditors[0];
  const required: RequiredTransaction[] = [
    ...debtors.map((d) => ({
      fromFamilyId: d.familyId,
      toFamilyId: hub.familyId,
      amount: round2(Math.abs(d.balance)),
    })),
    ...creditors.slice(1).map((c) => ({
      fromFamilyId: hub.familyId,
      toFamilyId: c.familyId,
      amount: round2(c.balance),
    })),
  ];

  return {
    totalExpenses: round2(totalExpenses),
    perFamilyShare: round2(perFamilyShare),
    balances,
    hubFamilyId: hub.familyId,
    required,
  };
}
