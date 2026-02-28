"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  bulkCreateExpenses,
  updateExpense,
  deleteExpense,
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
} from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import type { Family, ExpenseWithFamily, ExpenseSummary } from "@/types";
import { format } from "date-fns";

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
  const [expenses, setExpenses] = useState<ExpenseWithFamily[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
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
    const [signups, exps, sum] = await Promise.all([
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/expenses`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/expenses/summary`).then((r) => r.json()),
    ]);
    setFamilies(signups.map((s: { family: Family }) => s.family));
    setExpenses(exps);
    setSummary(sum);
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

  async function handleDelete(expenseId: number) {
    await deleteExpense(expenseId, parseInt(eventId, 10));
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
          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left font-medium w-[90px]">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left font-medium w-[130px]">
                    Paid By
                  </th>
                  <th className="px-3 py-2 text-left font-medium w-[110px]">
                    Category
                  </th>
                  <th className="px-3 py-2 text-left font-medium w-[80px]">
                    Date
                  </th>
                  <th className="px-3 py-2 text-right font-medium w-[100px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Existing expenses */}
                {expenses.length === 0 && newRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8">
                      <EmptyState
                        icon={DollarSign}
                        title="No expenses yet"
                        description="Add expenses below!"
                      />
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const isEditing = editingRowId === exp.id;
                    return (
                      <tr key={exp.id} className="border-b last:border-0">
                        {isEditing ? (
                          <>
                            <td className="px-3 py-1.5">
                              <Input
                                value={editValues.description}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    description: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues.amount}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    amount: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <Select
                                value={editValues.paidByFamilyId}
                                onValueChange={(val) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    paidByFamilyId: val,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {families.map((f) => (
                                    <SelectItem
                                      key={f.id}
                                      value={f.id.toString()}
                                    >
                                      {f.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-1.5">
                              <Select
                                value={editValues.category}
                                onValueChange={(val) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    category: val,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  {EXPENSE_CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c.charAt(0).toUpperCase() + c.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">
                              {format(new Date(exp.date), "MMM d")}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600"
                                  onClick={() => saveEdit(exp.id)}
                                  disabled={
                                    !editValues.description.trim() ||
                                    !editValues.amount ||
                                    !editValues.paidByFamilyId
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 font-medium">
                              {exp.description}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {formatCurrency(Number(exp.amount))}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground text-xs">
                              {exp.paidBy.name}
                            </td>
                            <td className="px-3 py-2">
                              {exp.category && (
                                <Badge variant="outline" className="text-xs">
                                  {exp.category}
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground text-xs">
                              {format(new Date(exp.date), "MMM d")}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => startEdit(exp)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {isOrganizer && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500"
                                    onClick={() => handleDelete(exp.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}

                {/* Separator */}
                {expenses.length > 0 && newRows.length > 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30"
                    >
                      Add new expenses
                    </td>
                  </tr>
                )}

                {/* New rows */}
                {newRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 bg-green-50/30"
                  >
                    <td className="px-3 py-1.5">
                      <Input
                        value={row.description}
                        onChange={(e) =>
                          updateNewRow(row.id, "description", e.target.value)
                        }
                        className="h-8 text-sm"
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        onChange={(e) =>
                          updateNewRow(row.id, "amount", e.target.value)
                        }
                        className="h-8 text-sm"
                        placeholder="$"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Select
                        value={row.paidByFamilyId}
                        onValueChange={(val) =>
                          updateNewRow(row.id, "paidByFamilyId", val)
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Family" />
                        </SelectTrigger>
                        <SelectContent>
                          {families.map((f) => (
                            <SelectItem key={f.id} value={f.id.toString()}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-1.5">
                      <Select
                        value={row.category}
                        onValueChange={(val) =>
                          updateNewRow(row.id, "category", val)
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.charAt(0).toUpperCase() + c.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-1.5" />
                    <td className="px-3 py-1.5 text-right">
                      {newRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => removeNewRow(row.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(summary.totalExpenses)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Trip Cost
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
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
                        <span className="font-medium">{b.family.name}</span>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Paid: {formatCurrency(b.totalPaid)}
                          </div>
                          <div
                            className={
                              b.balance >= 0
                                ? "text-green-700 font-medium"
                                : "text-red-700 font-medium"
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
                    <CardTitle className="text-sm">Settlement Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {summary.settlements.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-red-700 font-medium">
                            {s.from.name}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-green-700 font-medium">
                            {s.to.name}
                          </span>
                          <span className="ml-auto font-bold">
                            {formatCurrency(s.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
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
    </div>
  );
}
