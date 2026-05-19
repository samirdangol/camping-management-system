import { computeSettlementPlan, SETTLEMENT_EPSILON, type ExpenseRow } from "./settlement";

type PaymentRow = { fromFamilyId: number; toFamilyId: number };

export type SettlementStatus = {
  hasExpenses: boolean;
  allSettled: boolean;
};

/**
 * "All settled" means every required transaction (from the shared centralized-hub
 * algorithm in lib/settlement.ts) has a matching SettlementPayment row.
 */
export function computeSettlementStatus(
  expenses: ExpenseRow[],
  signupFamilyIds: number[],
  payments: PaymentRow[],
): SettlementStatus {
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const hasExpenses = totalExpenses > SETTLEMENT_EPSILON;
  // Nothing to settle — treat as fully settled so post-endDate trips advance to "done".
  if (!hasExpenses) return { hasExpenses: false, allSettled: true };
  if (signupFamilyIds.length === 0) return { hasExpenses, allSettled: false };

  const plan = computeSettlementPlan(expenses, signupFamilyIds);
  if (plan.required.length === 0) return { hasExpenses, allSettled: true };

  const paidSet = new Set(payments.map((p) => `${p.fromFamilyId}-${p.toFamilyId}`));
  const allSettled = plan.required.every((r) =>
    paidSet.has(`${r.fromFamilyId}-${r.toFamilyId}`),
  );

  return { hasExpenses, allSettled };
}
