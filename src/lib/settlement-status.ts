const EPSILON = 0.01;

type ExpenseRow = { amount: number; paidByFamilyId: number };
type PaymentRow = { fromFamilyId: number; toFamilyId: number };

export type SettlementStatus = {
  hasExpenses: boolean;
  allSettled: boolean;
};

/**
 * Mirrors the centralized-hub algorithm from /api/events/[eventId]/expenses/summary:
 * highest creditor is the hub; every other debtor pays the hub, hub pays every other creditor.
 * "All settled" means every one of those required transactions has a matching SettlementPayment.
 */
export function computeSettlementStatus(
  expenses: ExpenseRow[],
  signupFamilyIds: number[],
  payments: PaymentRow[],
): SettlementStatus {
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const hasExpenses = totalExpenses > EPSILON;
  // Nothing to settle — treat as fully settled so post-endDate trips advance to "done".
  if (!hasExpenses) return { hasExpenses: false, allSettled: true };
  if (signupFamilyIds.length === 0) return { hasExpenses, allSettled: false };

  const perFamilyShare = totalExpenses / signupFamilyIds.length;

  const balances = signupFamilyIds.map((familyId) => {
    const paid = expenses
      .filter((e) => e.paidByFamilyId === familyId)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { familyId, balance: paid - perFamilyShare };
  });

  const creditors = balances
    .filter((b) => b.balance > EPSILON)
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter((b) => b.balance < -EPSILON);

  if (creditors.length === 0 || debtors.length === 0) {
    return { hasExpenses, allSettled: true };
  }

  const hub = creditors[0];
  const required: Array<{ from: number; to: number }> = [
    ...debtors.map((d) => ({ from: d.familyId, to: hub.familyId })),
    ...creditors.slice(1).map((c) => ({ from: hub.familyId, to: c.familyId })),
  ];

  const paidSet = new Set(payments.map((p) => `${p.fromFamilyId}-${p.toFamilyId}`));
  const allSettled = required.every((r) => paidSet.has(`${r.from}-${r.to}`));

  return { hasExpenses, allSettled };
}
