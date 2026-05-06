"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  bulkCreateExpenses,
  updateExpense,
  deleteExpense,
  confirmNoExpenses,
  markSettlementPaid,
  unmarkSettlementPaid,
} from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import {
  DollarSign,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Save,
  ArrowRight,
  CheckCircle2,
  Clock,
  Ban,
} from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { familyEmoji } from "@/lib/utils";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import type { Family, ExpenseWithFamily, ExpenseSummary } from "@/types";
import { format } from "date-fns";

type SignupInfo = {
  familyId: number;
  family: Family;
  noExpenses: boolean;
};

type SettlementPaymentInfo = {
  fromFamilyId: number;
  toFamilyId: number;
  amount: number;
  settledAt: string;
};

interface NewRow {
  id: string;
  description: string;
  amount: string;
  paidByFamilyId: string;
  category: string;
}

interface EditValues {
  description: string;
  amount: string;
  paidByFamilyId: string;
  category: string;
}

function createEmptyRow(defaultFamilyId: string): NewRow {
  return {
    id: crypto.randomUUID(),
    description: "",
    amount: "",
    paidByFamilyId: defaultFamilyId,
    category: "",
  };
}

export default function ExpensesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);
  const [families, setFamilies] = useState<Family[]>([]);
  const [signups, setSignups] = useState<SignupInfo[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithFamily[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [settlementPayments, setSettlementPayments] = useState<SettlementPaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inline edit state
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    description: "",
    amount: "",
    paidByFamilyId: "",
    category: "",
  });

  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // New rows for bulk add
  const defaultFamilyId = familyId ? familyId.toString() : "";
  const [newRows, setNewRows] = useState<NewRow[]>([
    createEmptyRow(defaultFamilyId),
    createEmptyRow(defaultFamilyId),
    createEmptyRow(defaultFamilyId),
  ]);

  // Update default paidBy when familyId changes
  useEffect(() => {
    if (familyId) {
      const fid = familyId.toString();
      setNewRows((rows) =>
        rows.map((r) =>
          r.paidByFamilyId === "" ? { ...r, paidByFamilyId: fid } : r
        )
      );
    }
  }, [familyId]);

  const fetchData = useCallback(async () => {
    const [signupsRes, exps, sum, settlements] = await Promise.all([
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/expenses`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/expenses/summary`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/settlements`).then((r) => r.json()),
    ]);
    setSignups(signupsRes.map((s: SignupInfo) => ({
      familyId: s.familyId,
      family: s.family,
      noExpenses: s.noExpenses,
    })));
    setFamilies(signupsRes.map((s: { family: Family }) => s.family));
    setExpenses(exps);
    setSummary(sum);
    setSettlementPayments(settlements);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Existing item actions ---

  function startEdit(expense: ExpenseWithFamily) {
    setEditingRowId(expense.id);
    setEditValues({
      description: expense.description,
      amount: String(expense.amount),
      paidByFamilyId: String(expense.paidByFamilyId),
      category: expense.category || "",
    });
  }

  function cancelEdit() {
    setEditingRowId(null);
  }

  async function saveEdit(expenseId: number) {
    await updateExpense(expenseId, parseInt(eventId, 10), {
      description: editValues.description,
      amount: parseFloat(editValues.amount),
      paidByFamilyId: parseInt(editValues.paidByFamilyId, 10),
      category: editValues.category || undefined,
    });
    setEditingRowId(null);
    await fetchData();
  }

  function handleDelete(expenseId: number) {
    setPendingDeleteId(expenseId);
  }

  async function confirmDelete() {
    if (pendingDeleteId === null) return;
    await deleteExpense(pendingDeleteId, parseInt(eventId, 10));
    setPendingDeleteId(null);
    await fetchData();
  }

  async function handleConfirmNoExpenses() {
    if (!familyId) return;
    await confirmNoExpenses(parseInt(eventId, 10), familyId, true);
    await fetchData();
  }

  async function handleUndoNoExpenses() {
    if (!familyId) return;
    await confirmNoExpenses(parseInt(eventId, 10), familyId, false);
    await fetchData();
  }

  async function handleMarkSettled(fromFamilyId: number, toFamilyId: number, amount: number) {
    await markSettlementPaid(parseInt(eventId, 10), fromFamilyId, toFamilyId, amount);
    await fetchData();
  }

  async function handleUnmarkSettled(fromFamilyId: number, toFamilyId: number) {
    await unmarkSettlementPaid(parseInt(eventId, 10), fromFamilyId, toFamilyId);
    await fetchData();
  }

  // --- New row actions ---

  function updateNewRow(id: string, field: keyof NewRow, value: string) {
    setNewRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function removeNewRow(id: string) {
    setNewRows((rows) => rows.filter((r) => r.id !== id));
  }

  function addNewRow() {
    setNewRows((rows) => [...rows, createEmptyRow(defaultFamilyId)]);
  }

  async function handleBulkSave() {
    const validRows = newRows.filter(
      (r) => r.description.trim() && r.amount && r.paidByFamilyId
    );
    if (validRows.length === 0) return;

    setSaving(true);
    await bulkCreateExpenses(
      parseInt(eventId, 10),
      validRows.map((r) => ({
        description: r.description.trim(),
        amount: parseFloat(r.amount),
        paidByFamilyId: parseInt(r.paidByFamilyId, 10),
        category: r.category || undefined,
      }))
    );
    setNewRows([
      createEmptyRow(defaultFamilyId),
      createEmptyRow(defaultFamilyId),
      createEmptyRow(defaultFamilyId),
    ]);
    await fetchData();
    setSaving(false);
  }

  const hasNewData = newRows.some(
    (r) => r.description.trim() && r.amount && r.paidByFamilyId
  );

  // Readiness tracking
  const mySignup = signups.find((s) => s.familyId === familyId);
  const myHasExpenses = familyId ? expenses.some((e) => e.paidByFamilyId === familyId) : false;
  const myConfirmedNoExpenses = mySignup?.noExpenses || false;

  // Family status for readiness display
  const familyStatuses = signups.map((s) => {
    const hasExp = expenses.some((e) => e.paidByFamilyId === s.familyId);
    return {
      family: s.family,
      hasExpenses: hasExp,
      confirmedNoExpenses: s.noExpenses,
      ready: hasExp || s.noExpenses,
    };
  });
  const allReady = familyStatuses.length > 0 && familyStatuses.every((f) => f.ready);
  const readyCount = familyStatuses.filter((f) => f.ready).length;

  if (loading)
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Expenses</h2>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="w-full">
          <TabsTrigger value="expenses" className="flex-1">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="settlement" className="flex-1">
            Settlement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4 space-y-4">
          {/* Readiness tracker */}
          <Card className={allReady ? "bg-emerald-950/30 border-emerald-800/50" : "bg-amber-950/20 border-amber-800/40"}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">
                  {allReady ? (
                    <span className="text-emerald-400">All families ready to settle!</span>
                  ) : (
                    <span className="text-amber-400">Settlement readiness: {readyCount}/{familyStatuses.length} families</span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {familyStatuses.map((fs) => (
                  <Badge
                    key={fs.family.id}
                    variant="secondary"
                    className={`text-[10px] gap-1 ${
                      fs.hasExpenses
                        ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/50"
                        : fs.confirmedNoExpenses
                        ? "bg-blue-900/40 text-blue-300 border-blue-800/50"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {fs.hasExpenses ? (
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    ) : fs.confirmedNoExpenses ? (
                      <Ban className="h-2.5 w-2.5" />
                    ) : (
                      <Clock className="h-2.5 w-2.5" />
                    )}
                    {familyEmoji(fs.family.id)} {fs.family.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Confirm no expenses button for current family */}
          {familyId && !myHasExpenses && (
            <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
              {myConfirmedNoExpenses ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span>You confirmed no expenses for this trip</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={handleUndoNoExpenses}>
                    Undo
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">No expenses to add?</span>
                  <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={handleConfirmNoExpenses}>
                    <Check className="h-3 w-3 mr-1" />
                    Confirm No Expenses
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Existing Expenses — card layout */}
          {expenses.length === 0 && newRows.length === 0 ? (
            <EmptyState icon={DollarSign} title="No expenses yet" description="Add expenses below!" />
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => {
                const isEditing = editingRowId === exp.id;
                if (isEditing) {
                  return (
                    <div key={exp.id} className="rounded-lg border bg-blue-950/20 border-blue-800/40 p-3 space-y-2">
                      <Input value={editValues.description} onChange={(e) => setEditValues((v) => ({ ...v, description: e.target.value }))} className="h-8 text-sm" placeholder="Description" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" step="0.01" value={editValues.amount} onChange={(e) => setEditValues((v) => ({ ...v, amount: e.target.value }))} className="h-8 text-sm" placeholder="$" />
                        <Select value={editValues.paidByFamilyId} onValueChange={(val) => setEditValues((v) => ({ ...v, paidByFamilyId: val }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{families.map((f) => (<SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <Select value={editValues.category} onValueChange={(val) => setEditValues((v) => ({ ...v, category: val }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>{EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>))}</SelectContent>
                      </Select>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(exp.id)} disabled={!editValues.description.trim() || !editValues.amount || !editValues.paidByFamilyId}><Check className="h-3 w-3 mr-1" />Save</Button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={exp.id} className="rounded-lg border bg-card p-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium">{exp.description}</span>
                        <span className="text-sm font-bold">{formatCurrency(Number(exp.amount))}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{familyEmoji(exp.paidByFamilyId)} {exp.paidBy.name}</span>
                        {exp.category && <Badge variant="outline" className="text-[10px]">{exp.category}</Badge>}
                        <span>{format(new Date(exp.date), "MMM d")}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(exp)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {isOrganizer && (<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(exp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* New expense rows */}
          {newRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add new expenses</p>
              {newRows.map((row) => (
                <div key={row.id} className="rounded-lg border bg-emerald-950/20 border-emerald-800/30 p-2.5 space-y-2">
                  <Input value={row.description} onChange={(e) => updateNewRow(row.id, "description", e.target.value)} className="h-8 text-sm" placeholder="Description" />
                  <div className="flex gap-2 items-center">
                    <Input type="number" step="0.01" value={row.amount} onChange={(e) => updateNewRow(row.id, "amount", e.target.value)} className="h-8 text-sm flex-1" placeholder="$" />
                    <Select value={row.paidByFamilyId} onValueChange={(val) => updateNewRow(row.id, "paidByFamilyId", val)}>
                      <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Family" /></SelectTrigger>
                      <SelectContent>{families.map((f) => (<SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={row.category} onValueChange={(val) => updateNewRow(row.id, "category", val)}>
                      <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Cat." /></SelectTrigger>
                      <SelectContent>{EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>))}</SelectContent>
                    </Select>
                    {newRows.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={() => removeNewRow(row.id)}><X className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addNewRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
            {hasNewData && (
              <Button size="sm" onClick={handleBulkSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save All New Expenses"}
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settlement" className="mt-4 space-y-4">
          {summary && summary.totalExpenses > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-blue-950/30 border-blue-800/50">
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(summary.totalExpenses)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Trip Cost
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-950/30 border-emerald-800/50">
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(summary.perFamilyShare)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Per Family Share
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Readiness warning */}
              {!allReady && (
                <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 text-sm text-amber-400 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Waiting on {familyStatuses.length - readyCount} {familyStatuses.length - readyCount === 1 ? "family" : "families"} to enter expenses or confirm none. Settlement amounts may change.</span>
                </div>
              )}

              {/* Balance Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Family Balances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.balances.map((b) => (
                      <div
                        key={b.family.id}
                        className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                      >
                        <span className="font-medium">{familyEmoji(b.family.id)} {b.family.name}</span>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Paid: {formatCurrency(b.totalPaid)}
                          </div>
                          <div
                            className={
                              b.balance >= 0
                                ? "text-emerald-400 font-medium"
                                : "text-red-400 font-medium"
                            }
                          >
                            {b.balance >= 0
                              ? `+${formatCurrency(b.balance)}`
                              : formatCurrency(b.balance)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Settlement Plan */}
              {summary.settlements.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Settlement Plan
                      {summary.settlements.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          {settlementPayments.length}/{summary.settlements.length} settled
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {summary.settlements.map((s, i) => {
                      const isSettled = settlementPayments.some(
                        (p) => p.fromFamilyId === s.from.id && p.toFamilyId === s.to.id
                      );
                      const canSettle = familyId === s.from.id || familyId === s.to.id || isOrganizer;
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-2.5 transition-colors ${
                            isSettled
                              ? "bg-emerald-950/20 border-emerald-800/40"
                              : "bg-card border-border"
                          }`}
                        >
                          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-2 text-sm">
                            <span className="text-red-400 font-medium text-right truncate">
                              {familyEmoji(s.from.id)} {s.from.name}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-emerald-400 font-medium truncate">
                              {familyEmoji(s.to.id)} {s.to.name}
                            </span>
                            <span className="font-bold text-right">
                              {formatCurrency(s.amount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-end mt-1.5 gap-2">
                            {isSettled ? (
                              <>
                                <Badge variant="secondary" className="text-[10px] bg-emerald-900/40 text-emerald-300 border-emerald-800/50 gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Settled
                                </Badge>
                                {canSettle && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] text-muted-foreground"
                                    onClick={() => handleUnmarkSettled(s.from.id, s.to.id)}
                                  >
                                    Undo
                                  </Button>
                                )}
                              </>
                            ) : canSettle ? (
                              <>
                                {(() => {
                                  const toFamily = families.find((f) => f.id === s.to.id);
                                  const paypalMe = toFamily?.paypalMe;
                                  return paypalMe ? (
                                    <a
                                      href={`https://paypal.me/${paypalMe}/${s.amount.toFixed(2)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                                    >
                                      <DollarSign className="h-2.5 w-2.5" />
                                      Pay with PayPal
                                    </a>
                                  ) : null;
                                })()}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1"
                                  onClick={() => handleMarkSettled(s.from.id, s.to.id, s.amount)}
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  Mark as Paid
                                </Button>
                              </>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <EmptyState
              icon={DollarSign}
              title="No expenses to settle"
              description="Add expenses first to see the settlement plan."
            />
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        title="Delete expense?"
        description="This will permanently remove the expense and may affect settlement calculations."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
