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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ArrowDown,
  CheckCircle2,
  Clock,
  Ban,
  MoreVertical,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { FamilyAvatar } from "@/components/shared/family-avatar";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import type { Family, ExpenseWithFamily, ExpenseSummary } from "@/types";

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

  // PayPal inline-edit state (settlement tab)
  const [paypalEditFamily, setPaypalEditFamily] = useState<Family | null>(null);
  const [paypalInput, setPaypalInput] = useState("");
  const [savingPaypal, setSavingPaypal] = useState(false);

  // Zelle (phone) inline-edit state (settlement tab)
  const [zelleEditFamily, setZelleEditFamily] = useState<Family | null>(null);
  const [zelleInput, setZelleInput] = useState("");
  const [savingZelle, setSavingZelle] = useState(false);

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

  function openPaypalEdit(family: Family) {
    setPaypalEditFamily(family);
    setPaypalInput(family.paypalMe || "");
  }

  async function handleSavePaypal() {
    if (!paypalEditFamily) return;
    const trimmed = paypalInput.trim();
    if (!trimmed) return;
    setSavingPaypal(true);
    try {
      await fetch("/api/families", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: paypalEditFamily.id,
          name: paypalEditFamily.name,
          contactName: paypalEditFamily.contactName,
          contactName2: paypalEditFamily.contactName2,
          phone: paypalEditFamily.phone,
          email: paypalEditFamily.email,
          paypalMe: trimmed,
        }),
      });
      setPaypalEditFamily(null);
      await fetchData();
    } finally {
      setSavingPaypal(false);
    }
  }

  function openZelleEdit(family: Family) {
    setZelleEditFamily(family);
    setZelleInput(family.phone || "");
  }

  async function handleSaveZelle() {
    if (!zelleEditFamily) return;
    const trimmed = zelleInput.trim();
    if (!trimmed) return;
    setSavingZelle(true);
    try {
      await fetch("/api/families", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: zelleEditFamily.id,
          name: zelleEditFamily.name,
          contactName: zelleEditFamily.contactName,
          contactName2: zelleEditFamily.contactName2,
          phone: trimmed,
          email: zelleEditFamily.email,
          paypalMe: zelleEditFamily.paypalMe,
        }),
      });
      setZelleEditFamily(null);
      await fetchData();
    } finally {
      setSavingZelle(false);
    }
  }

  async function copyZelle(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(`Zelle phone copied: ${phone}`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
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
                    <FamilyAvatar familyId={fs.family.id} />{fs.family.name}
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
                  <div key={exp.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{exp.description}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground min-w-0">
                        <span className="shrink-0 inline-flex items-center"><FamilyAvatar familyId={exp.paidByFamilyId} className="w-5 h-5 mr-1" />{exp.paidBy.name}</span>
                        {exp.category && <Badge variant="outline" className="text-[10px] shrink-0">{exp.category}</Badge>}
                      </div>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-right shrink-0 w-20">{formatCurrency(Number(exp.amount))}</div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEdit(exp)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {isOrganizer && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(exp.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                        className="flex items-center gap-3 text-sm border-b pb-2 last:border-0 last:pb-0"
                      >
                        <span className="font-medium truncate flex-1 min-w-0 inline-flex items-center"><FamilyAvatar familyId={b.family.id} />{b.family.name}</span>
                        <div className="text-right tabular-nums shrink-0">
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

              {/* Centralized mode explainer */}
              {summary.settlementMode === "centralized" && summary.collector && (
                <div className="rounded-lg border border-blue-800/40 bg-blue-950/20 p-3 text-sm text-blue-300">
                  <div className="font-medium mb-0.5">
                    Centralized settlement: <FamilyAvatar familyId={summary.collector.id} className="w-5 h-5 mr-1" />{summary.collector.name} collects and redistributes
                  </div>
                  <p className="text-xs text-blue-400/80">
                    With {summary.balances.filter((b) => Math.abs(b.balance) > 0.01).length} families involved, everyone pays one person instead of tracking many bilateral payments.
                  </p>
                </div>
              )}

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
                          <div className="text-red-400 font-medium text-sm text-center inline-flex items-center justify-center w-full">
                            <FamilyAvatar familyId={s.from.id} />{s.from.name}
                          </div>
                          <div className="flex justify-center my-1">
                            <ArrowDown className="h-5 w-5 text-muted-foreground" aria-label="pays" />
                          </div>
                          <div className="text-emerald-400 font-medium text-sm text-center inline-flex items-center justify-center w-full">
                            <FamilyAvatar familyId={s.to.id} />{s.to.name}
                          </div>
                          <div className="text-center text-xl font-bold tabular-nums mt-2">
                            {formatCurrency(s.amount)}
                          </div>
                          <div className="flex items-center justify-center mt-2 pt-2 border-t border-border/40 gap-2">
                            <div className="flex items-center flex-wrap justify-center gap-2">
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
                                  if (!toFamily) return null;
                                  const canEdit = familyId === s.to.id || isOrganizer;
                                  const isSelf = familyId === s.to.id;
                                  return (
                                    <>
                                      {toFamily.paypalMe ? (
                                        <a
                                          href={`https://paypal.me/${toFamily.paypalMe}/${s.amount.toFixed(2)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                                        >
                                          <DollarSign className="h-2.5 w-2.5" />
                                          PayPal
                                        </a>
                                      ) : canEdit ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] gap-1 text-blue-400 hover:text-blue-300"
                                          onClick={() => openPaypalEdit(toFamily)}
                                        >
                                          <DollarSign className="h-2.5 w-2.5" />
                                          {isSelf ? "Set up your PayPal" : "Add PayPal"}
                                        </Button>
                                      ) : null}
                                      {toFamily.phone ? (
                                        <button
                                          type="button"
                                          onClick={() => copyZelle(toFamily.phone!)}
                                          title={`Copy Zelle phone: ${toFamily.phone}`}
                                          className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                                        >
                                          <Smartphone className="h-2.5 w-2.5" />
                                          Zelle
                                        </button>
                                      ) : canEdit ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] gap-1 text-purple-400 hover:text-purple-300"
                                          onClick={() => openZelleEdit(toFamily)}
                                        >
                                          <Smartphone className="h-2.5 w-2.5" />
                                          {isSelf ? "Set up your Zelle" : "Add Zelle"}
                                        </Button>
                                      ) : null}
                                    </>
                                  );
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

      <Dialog open={paypalEditFamily !== null} onOpenChange={(open) => !open && setPaypalEditFamily(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paypalEditFamily && familyId === paypalEditFamily.id
                ? "Set up your PayPal"
                : `Add PayPal for ${paypalEditFamily?.name ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              Lets families pay {paypalEditFamily && familyId === paypalEditFamily.id ? "you" : paypalEditFamily?.name} with one tap. Enter the PayPal.me username (find it at paypal.me after signing in).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground shrink-0">paypal.me/</span>
            <Input
              value={paypalInput}
              onChange={(e) => setPaypalInput(e.target.value)}
              placeholder="yourusername"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && paypalInput.trim() && !savingPaypal) {
                  e.preventDefault();
                  handleSavePaypal();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaypalEditFamily(null)} disabled={savingPaypal}>
              Cancel
            </Button>
            <Button onClick={handleSavePaypal} disabled={savingPaypal || !paypalInput.trim()}>
              {savingPaypal ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={zelleEditFamily !== null} onOpenChange={(open) => !open && setZelleEditFamily(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {zelleEditFamily && familyId === zelleEditFamily.id
                ? "Set up your Zelle"
                : `Add Zelle for ${zelleEditFamily?.name ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              Enter the phone number registered with Zelle. Other families can tap to copy it when settling up.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="tel"
            inputMode="tel"
            value={zelleInput}
            onChange={(e) => setZelleInput(e.target.value)}
            placeholder="e.g. 555-123-4567"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && zelleInput.trim() && !savingZelle) {
                e.preventDefault();
                handleSaveZelle();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setZelleEditFamily(null)} disabled={savingZelle}>
              Cancel
            </Button>
            <Button onClick={handleSaveZelle} disabled={savingZelle || !zelleInput.trim()}>
              {savingZelle ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
