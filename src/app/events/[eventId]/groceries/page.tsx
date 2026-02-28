"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  bulkCreateGroceryItems,
  updateGroceryItem,
  deleteGroceryItem,
  claimGroceryItem,
  toggleGroceryPurchased,
  addGroceryVolunteer,
  removeGroceryVolunteer,
  reorderGroceryItem,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { GROCERY_CATEGORIES } from "@/lib/constants";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Save,
  ChevronUp,
  ChevronDown,
  HandHelping,
} from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import type { Family, GroceryWithFamily } from "@/types";

type Filter = "all" | "unassigned" | "mine";

interface NewRow {
  id: string;
  name: string;
  category: string;
  quantity: string;
  estimatedCost: string;
  mealTag: string;
}

interface EditValues {
  name: string;
  category: string;
  quantity: string;
  estimatedCost: string;
  mealTag: string;
}

function createEmptyRow(): NewRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    quantity: "",
    estimatedCost: "",
    mealTag: "",
  };
}

export default function GroceriesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);
  const [families, setFamilies] = useState<Family[]>([]);
  const [items, setItems] = useState<GroceryWithFamily[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inline edit state for existing rows
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    name: "",
    category: "",
    quantity: "",
    estimatedCost: "",
    mealTag: "",
  });

  // New rows for bulk add
  const [newRows, setNewRows] = useState<NewRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);

  const fetchData = useCallback(async () => {
    const [signups, groceries] = await Promise.all([
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/groceries`).then((r) => r.json()),
    ]);
    setFamilies(signups.map((s: { family: Family }) => s.family));
    setItems(groceries);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Existing item actions ---

  function startEdit(item: GroceryWithFamily) {
    setEditingRowId(item.id);
    setEditValues({
      name: item.name,
      category: item.category || "",
      quantity: item.quantity || "",
      estimatedCost: item.estimatedCost ? String(item.estimatedCost) : "",
      mealTag: item.mealTag || "",
    });
  }

  function cancelEdit() {
    setEditingRowId(null);
  }

  async function saveEdit(itemId: number) {
    await updateGroceryItem(itemId, parseInt(eventId, 10), {
      name: editValues.name,
      category: editValues.category || undefined,
      quantity: editValues.quantity || undefined,
      estimatedCost: editValues.estimatedCost
        ? parseFloat(editValues.estimatedCost)
        : null,
      mealTag: editValues.mealTag || null,
    });
    setEditingRowId(null);
    await fetchData();
  }

  async function handleDelete(itemId: number) {
    await deleteGroceryItem(itemId, parseInt(eventId, 10));
    await fetchData();
  }

  async function handleClaim(itemId: number) {
    if (!familyId) return;
    await claimGroceryItem(itemId, parseInt(eventId, 10), familyId);
    await fetchData();
  }

  async function handleTogglePurchased(itemId: number, current: boolean) {
    await toggleGroceryPurchased(itemId, parseInt(eventId, 10), !current);
    await fetchData();
  }

  async function handleVolunteer(itemId: number) {
    if (!familyId) return;
    await addGroceryVolunteer(itemId, parseInt(eventId, 10), familyId);
    await fetchData();
  }

  async function handleUnvolunteer(itemId: number) {
    if (!familyId) return;
    await removeGroceryVolunteer(itemId, parseInt(eventId, 10), familyId);
    await fetchData();
  }

  async function handleReorder(itemId: number, direction: "up" | "down") {
    await reorderGroceryItem(itemId, parseInt(eventId, 10), direction);
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
    setNewRows((rows) => [...rows, createEmptyRow()]);
  }

  async function handleBulkSave() {
    const validRows = newRows.filter((r) => r.name.trim());
    if (validRows.length === 0) return;

    setSaving(true);
    await bulkCreateGroceryItems(
      parseInt(eventId, 10),
      validRows.map((r) => ({
        name: r.name.trim(),
        category: r.category || undefined,
        quantity: r.quantity || undefined,
        estimatedCost: r.estimatedCost ? parseFloat(r.estimatedCost) : undefined,
        mealTag: r.mealTag || undefined,
      }))
    );
    setNewRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    await fetchData();
    setSaving(false);
  }

  const filtered = items.filter((item) => {
    if (filter === "unassigned") return !item.assignedFamilyId;
    if (filter === "mine") return item.assignedFamilyId === familyId;
    return true;
  });

  const hasNewData = newRows.some((r) => r.name.trim());

  if (loading)
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Groceries</h2>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "unassigned", "mine"] as Filter[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? `All (${items.length})`
              : f === "unassigned"
                ? `Unassigned (${items.filter((i) => !i.assignedFamilyId).length})`
                : `My Items (${items.filter((i) => i.assignedFamilyId === familyId).length})`}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-2 text-center">
                <Check className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              </th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium w-[130px]">
                Category
              </th>
              <th className="px-3 py-2 text-left font-medium w-[100px]">
                Meal/Tag
              </th>
              <th className="px-3 py-2 text-left font-medium w-[80px]">Qty</th>
              <th className="px-3 py-2 text-left font-medium w-[80px]">
                Cost
              </th>
              <th className="px-3 py-2 text-left font-medium w-[180px]">
                Assigned / Volunteers
              </th>
              <th className="px-3 py-2 text-right font-medium w-[120px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Existing items */}
            {filtered.length === 0 && newRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8">
                  <EmptyState
                    icon={ShoppingCart}
                    title="No grocery items"
                    description={
                      filter !== "all"
                        ? "No items match this filter."
                        : "Add grocery items below!"
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const isEditing = editingRowId === item.id;
                const isVolunteered = item.volunteers?.some(
                  (v) => v.familyId === familyId
                );
                const isPrimaryOwner = item.assignedFamilyId === familyId;
                return (
                  <tr
                    key={item.id}
                    className={`border-b last:border-0 ${item.isPurchased ? "opacity-50 bg-muted/20" : ""}`}
                  >
                    {/* Purchased checkbox */}
                    <td className="px-3 py-2 text-center">
                      <Checkbox
                        checked={item.isPurchased}
                        onCheckedChange={() =>
                          handleTogglePurchased(item.id, item.isPurchased)
                        }
                      />
                    </td>

                    {isEditing ? (
                      <>
                        <td className="px-3 py-1.5">
                          <Input
                            value={editValues.name}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                name: e.target.value,
                              }))
                            }
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={editValues.category}
                            onValueChange={(val) =>
                              setEditValues((v) => ({ ...v, category: val }))
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {GROCERY_CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c.charAt(0).toUpperCase() + c.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            value={editValues.mealTag}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                mealTag: e.target.value,
                              }))
                            }
                            className="h-8 text-sm"
                            placeholder="e.g. dinner"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            value={editValues.quantity}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                quantity: e.target.value,
                              }))
                            }
                            className="h-8 text-sm"
                            placeholder="Qty"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.estimatedCost}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                estimatedCost: e.target.value,
                              }))
                            }
                            className="h-8 text-sm"
                            placeholder="$"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">
                          {item.assignedTo?.name || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600"
                              onClick={() => saveEdit(item.id)}
                              disabled={!editValues.name.trim()}
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
                        <td
                          className={`px-3 py-2 font-medium ${item.isPurchased ? "line-through" : ""}`}
                        >
                          {item.name}
                        </td>
                        <td className="px-3 py-2">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.mealTag && (
                            <Badge className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-100">
                              {item.mealTag}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {item.quantity || "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {item.estimatedCost
                            ? `$${Number(item.estimatedCost).toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            {item.assignedTo ? (
                              <span className="text-xs text-green-700 font-medium">
                                {item.assignedTo.name}
                              </span>
                            ) : (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-blue-600"
                                onClick={() => handleClaim(item.id)}
                              >
                                Claim
                              </Button>
                            )}
                            {/* Volunteer badges */}
                            {item.volunteers?.map((v) => (
                              <Badge key={v.id} variant="outline" className="text-xs">
                                {v.family.name}
                              </Badge>
                            ))}
                            {/* Volunteer/Leave toggle */}
                            {!isPrimaryOwner && (
                              isVolunteered ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => handleUnvolunteer(item.id)}
                                >
                                  Leave
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => handleVolunteer(item.id)}
                                >
                                  <HandHelping className="mr-1 h-3 w-3" />
                                  Help
                                </Button>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {/* Reorder buttons */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleReorder(item.id, "up")}
                              disabled={idx === 0}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleReorder(item.id, "down")}
                              disabled={idx === filtered.length - 1}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isOrganizer && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500"
                                onClick={() => handleDelete(item.id)}
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

            {/* Separator row */}
            {filtered.length > 0 && newRows.length > 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30"
                >
                  Add new items
                </td>
              </tr>
            )}

            {/* New rows for bulk add */}
            {newRows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 bg-green-50/30">
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5">
                  <Input
                    value={row.name}
                    onChange={(e) =>
                      updateNewRow(row.id, "name", e.target.value)
                    }
                    className="h-8 text-sm"
                    placeholder="Item name"
                  />
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
                      {GROCERY_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    value={row.mealTag}
                    onChange={(e) =>
                      updateNewRow(row.id, "mealTag", e.target.value)
                    }
                    className="h-8 text-sm"
                    placeholder="e.g. dinner"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    value={row.quantity}
                    onChange={(e) =>
                      updateNewRow(row.id, "quantity", e.target.value)
                    }
                    className="h-8 text-sm"
                    placeholder="Qty"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    value={row.estimatedCost}
                    onChange={(e) =>
                      updateNewRow(row.id, "estimatedCost", e.target.value)
                    }
                    className="h-8 text-sm"
                    placeholder="$"
                  />
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
            {saving ? "Saving..." : "Save All New Items"}
          </Button>
        )}
      </div>
    </div>
  );
}
