"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  bulkCreateGroceryItems,
  updateGroceryItem,
  deleteGroceryItem,
  claimGroceryItem,
  toggleGroceryPurchased,
  addGroceryVolunteer,
  removeGroceryVolunteer,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { GROCERY_CATEGORY_SUGGESTIONS } from "@/lib/constants";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Hand,
  UserPlus,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { familyEmoji } from "@/lib/utils";
import type { Family, GroceryWithFamily } from "@/types";

type Filter = "all" | "unassigned" | "mine";

/* ─── helpers ─── */

/** Capitalize first letter */
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Unique datalist id for category inputs */
const DATALIST_ID = "grocery-cat-suggestions";

/* ─── Main Page ─── */

export default function GroceriesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId, 10);
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);
  const [families, setFamilies] = useState<Family[]>([]);
  const [items, setItems] = useState<GroceryWithFamily[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

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

  /* filtered items */
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "unassigned")
          return !item.assignedFamilyId && item.volunteers.length === 0;
        if (filter === "mine")
          return (
            item.assignedFamilyId === familyId ||
            item.volunteers.some((v) => v.familyId === familyId)
          );
        return true;
      }),
    [items, filter, familyId]
  );

  /* group by category */
  const { grouped, categoryOrder, uncategorized } = useMemo(() => {
    const map: Record<string, GroceryWithFamily[]> = {};
    const uncat: GroceryWithFamily[] = [];
    for (const item of filtered) {
      const cat = item.category?.trim();
      if (cat) {
        if (!map[cat]) map[cat] = [];
        map[cat].push(item);
      } else {
        uncat.push(item);
      }
    }
    const order = Object.keys(map).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    return { grouped: map, categoryOrder: order, uncategorized: uncat };
  }, [filtered]);

  /* all existing category names for suggestions */
  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of items) {
      if (item.category?.trim()) cats.add(item.category.trim());
    }
    return Array.from(cats).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [items]);

  /* combined suggestion list: existing + defaults */
  const allSuggestions = useMemo(() => {
    const set = new Set(existingCategories.map((c) => c.toLowerCase()));
    const extra = GROCERY_CATEGORY_SUGGESTIONS.filter(
      (s) => !set.has(s.toLowerCase())
    ).map(cap);
    return [...existingCategories, ...extra];
  }, [existingCategories]);

  /* totals for filter badges */
  const unassignedCount = items.filter(
    (i) => !i.assignedFamilyId && i.volunteers.length === 0
  ).length;
  const myCount = items.filter(
    (i) =>
      i.assignedFamilyId === familyId ||
      i.volunteers.some((v) => v.familyId === familyId)
  ).length;

  /* ─── item actions ─── */

  async function handleDelete(itemId: number) {
    await deleteGroceryItem(itemId, eid);
    await fetchData();
  }

  async function handleClaim(itemId: number) {
    if (!familyId) return;
    await claimGroceryItem(itemId, eid, familyId);
    await fetchData();
  }

  async function handleTogglePurchased(itemId: number, current: boolean) {
    await toggleGroceryPurchased(itemId, eid, !current);
    await fetchData();
  }

  async function handleVolunteer(itemId: number) {
    if (!familyId) return;
    await addGroceryVolunteer(itemId, eid, familyId);
    await fetchData();
  }

  async function handleUnvolunteer(itemId: number) {
    if (!familyId) return;
    await removeGroceryVolunteer(itemId, eid, familyId);
    await fetchData();
  }

  async function handleSaveEdit(
    itemId: number,
    vals: {
      name: string;
      category?: string;
      quantity?: string;
      estimatedCost?: number | null;
      mealTag?: string | null;
    }
  ) {
    await updateGroceryItem(itemId, eid, vals);
    await fetchData();
  }

  async function handleBulkAdd(
    rows: {
      name: string;
      category?: string;
      quantity?: string;
      estimatedCost?: number;
      mealTag?: string;
    }[]
  ) {
    await bulkCreateGroceryItems(eid, rows);
    await fetchData();
  }

  if (loading)
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Groceries</h2>
        <span className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 && "s"}
          {items.filter((i) => i.isPurchased).length > 0 &&
            ` · ${items.filter((i) => i.isPurchased).length} purchased`}
        </span>
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
                ? `Needs Help (${unassignedCount})`
                : `My Items (${myCount})`}
          </Button>
        ))}
      </div>

      {/* Category suggestion datalist (shared) */}
      <datalist id={DATALIST_ID}>
        {allSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* No items at all */}
      {filtered.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="No grocery items"
          description={
            filter !== "all"
              ? "No items match this filter."
              : "Add grocery items below!"
          }
        />
      )}

      {/* Category sections */}
      {categoryOrder.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          items={grouped[cat]}
          families={families}
          familyId={familyId}
          isOrganizer={isOrganizer}
          allSuggestions={allSuggestions}
          onDelete={handleDelete}
          onClaim={handleClaim}
          onTogglePurchased={handleTogglePurchased}
          onVolunteer={handleVolunteer}
          onUnvolunteer={handleUnvolunteer}
          onSaveEdit={handleSaveEdit}
          onBulkAdd={handleBulkAdd}
        />
      ))}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <CategorySection
          key="__uncategorized__"
          category=""
          items={uncategorized}
          families={families}
          familyId={familyId}
          isOrganizer={isOrganizer}
          allSuggestions={allSuggestions}
          onDelete={handleDelete}
          onClaim={handleClaim}
          onTogglePurchased={handleTogglePurchased}
          onVolunteer={handleVolunteer}
          onUnvolunteer={handleUnvolunteer}
          onSaveEdit={handleSaveEdit}
          onBulkAdd={handleBulkAdd}
        />
      )}

      {/* Quick Add Section */}
      <QuickAddSection
        allSuggestions={allSuggestions}
        onBulkAdd={handleBulkAdd}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Category Section
   ════════════════════════════════════════════════════════ */

function CategorySection({
  category,
  items,
  families,
  familyId,
  isOrganizer,
  allSuggestions,
  onDelete,
  onClaim,
  onTogglePurchased,
  onVolunteer,
  onUnvolunteer,
  onSaveEdit,
  onBulkAdd,
}: {
  category: string;
  items: GroceryWithFamily[];
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  allSuggestions: string[];
  onDelete: (id: number) => Promise<void>;
  onClaim: (id: number) => Promise<void>;
  onTogglePurchased: (id: number, current: boolean) => Promise<void>;
  onVolunteer: (id: number) => Promise<void>;
  onUnvolunteer: (id: number) => Promise<void>;
  onSaveEdit: (
    id: number,
    vals: {
      name: string;
      category?: string;
      quantity?: string;
      estimatedCost?: number | null;
      mealTag?: string | null;
    }
  ) => Promise<void>;
  onBulkAdd: (
    rows: {
      name: string;
      category?: string;
      quantity?: string;
      estimatedCost?: number;
      mealTag?: string;
    }[]
  ) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addCost, setAddCost] = useState("");
  const [adding, setAdding] = useState(false);

  const purchased = items.filter((i) => i.isPurchased).length;
  const displayName = category || "Uncategorized";

  async function handleQuickAdd() {
    if (!addName.trim()) return;
    setAdding(true);
    await onBulkAdd([
      {
        name: addName.trim(),
        category: category || undefined,
        quantity: addQty || undefined,
        estimatedCost: addCost ? parseFloat(addCost) : undefined,
      },
    ]);
    setAddName("");
    setAddQty("");
    setAddCost("");
    setAdding(false);
  }

  return (
    <div className="space-y-2">
      {/* Section header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-semibold text-sm">{displayName}</span>
        <Badge variant="secondary" className="text-xs">
          {purchased}/{items.length}
        </Badge>
        {items.reduce((s, i) => s + (i.estimatedCost || 0), 0) > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            ${items.reduce((s, i) => s + (i.estimatedCost || 0), 0).toFixed(2)}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="space-y-1.5 pl-6">
          {items.map((item) => (
            <GroceryItemCard
              key={item.id}
              item={item}
              families={families}
              familyId={familyId}
              isOrganizer={isOrganizer}
              allSuggestions={allSuggestions}
              onDelete={onDelete}
              onClaim={onClaim}
              onTogglePurchased={onTogglePurchased}
              onVolunteer={onVolunteer}
              onUnvolunteer={onUnvolunteer}
              onSaveEdit={onSaveEdit}
            />
          ))}

          {/* Inline quick-add at bottom of category */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuickAdd();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <Input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder={`Add item to ${displayName}...`}
              className="h-8 text-sm flex-1"
            />
            <Input
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              placeholder="Qty"
              className="h-8 text-sm w-16"
            />
            <Input
              type="number"
              step="0.01"
              value={addCost}
              onChange={(e) => setAddCost(e.target.value)}
              placeholder="$"
              className="h-8 text-sm w-16"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!addName.trim() || adding}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Grocery Item Card
   ════════════════════════════════════════════════════════ */

function GroceryItemCard({
  item,
  families,
  familyId,
  isOrganizer,
  allSuggestions,
  onDelete,
  onClaim,
  onTogglePurchased,
  onVolunteer,
  onUnvolunteer,
  onSaveEdit,
}: {
  item: GroceryWithFamily;
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  allSuggestions: string[];
  onDelete: (id: number) => Promise<void>;
  onClaim: (id: number) => Promise<void>;
  onTogglePurchased: (id: number, current: boolean) => Promise<void>;
  onVolunteer: (id: number) => Promise<void>;
  onUnvolunteer: (id: number) => Promise<void>;
  onSaveEdit: (
    id: number,
    vals: {
      name: string;
      category?: string;
      quantity?: string;
      estimatedCost?: number | null;
      mealTag?: string | null;
    }
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editCategory, setEditCategory] = useState(item.category || "");
  const [editQty, setEditQty] = useState(item.quantity || "");
  const [editCost, setEditCost] = useState(
    item.estimatedCost ? String(item.estimatedCost) : ""
  );
  const [editMealTag, setEditMealTag] = useState(item.mealTag || "");
  const [busy, setBusy] = useState(false);

  const hasOwner = !!item.assignedTo;
  const hasVolunteers = item.volunteers.length > 0;
  const isMyItem =
    item.assignedFamilyId === familyId ||
    item.volunteers.some((v) => v.familyId === familyId);
  const needsVolunteer = !hasOwner && !hasVolunteers;

  const bg = item.isPurchased
    ? "opacity-50 bg-muted/20 border-muted"
    : needsVolunteer
      ? "bg-amber-50 border-amber-200"
      : "bg-white border-border";

  function startEdit() {
    setEditName(item.name);
    setEditCategory(item.category || "");
    setEditQty(item.quantity || "");
    setEditCost(item.estimatedCost ? String(item.estimatedCost) : "");
    setEditMealTag(item.mealTag || "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    setBusy(true);
    await onSaveEdit(item.id, {
      name: editName.trim(),
      category: editCategory.trim() || undefined,
      quantity: editQty.trim() || undefined,
      estimatedCost: editCost ? parseFloat(editCost) : null,
      mealTag: editMealTag.trim() || null,
    });
    setEditing(false);
    setBusy(false);
  }

  /* ── Edit mode ── */
  if (editing) {
    return (
      <div className="rounded-lg border p-2.5 space-y-2 bg-blue-50/30 border-blue-200">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Name"
            className="h-8 text-sm col-span-2"
            autoFocus
          />
          <Input
            list={DATALIST_ID}
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            placeholder="Category"
            className="h-8 text-sm"
          />
          <Input
            value={editMealTag}
            onChange={(e) => setEditMealTag(e.target.value)}
            placeholder="Meal tag"
            className="h-8 text-sm"
          />
          <Input
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            placeholder="Qty"
            className="h-8 text-sm"
          />
          <Input
            type="number"
            step="0.01"
            value={editCost}
            onChange={(e) => setEditCost(e.target.value)}
            placeholder="Est. cost"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={saveEdit}
            disabled={!editName.trim() || busy}
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  /* ── Display mode ── */
  return (
    <div className={`rounded-lg border p-2.5 ${bg}`}>
      {/* Top row: checkbox + name + details + actions */}
      <div className="flex items-start gap-2">
        <Checkbox
          checked={item.isPurchased}
          onCheckedChange={() => onTogglePurchased(item.id, item.isPurchased)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-sm font-medium ${item.isPurchased ? "line-through text-muted-foreground" : ""}`}
            >
              {item.name}
            </span>
            {item.quantity && (
              <span className="text-xs text-muted-foreground">
                ×{item.quantity}
              </span>
            )}
            {item.estimatedCost != null && item.estimatedCost > 0 && (
              <span className="text-xs text-muted-foreground">
                ${Number(item.estimatedCost).toFixed(2)}
              </span>
            )}
            {item.mealTag && (
              <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 hover:bg-purple-100">
                {item.mealTag}
              </Badge>
            )}
          </div>

          {/* Volunteer row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {/* Owner / assignedTo */}
            {item.assignedTo && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700"
              >
                {familyEmoji(item.assignedTo.id)} {item.assignedTo.name}
              </Badge>
            )}
            {/* Volunteer badges */}
            {item.volunteers.map((v) => (
              <Badge
                key={v.id}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700"
              >
                {familyEmoji(v.family.id)} {v.family.name}
                {v.familyId === familyId && (
                  <button
                    onClick={() => onUnvolunteer(item.id)}
                    className="ml-0.5 hover:text-red-600"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}

            {/* Needs volunteer warning */}
            {needsVolunteer && !item.isPurchased && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" /> Needs a volunteer
              </span>
            )}

            {/* Self-volunteer button */}
            {!isMyItem && !item.isPurchased && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={() =>
                  hasOwner ? onVolunteer(item.id) : onClaim(item.id)
                }
              >
                <Hand className="h-3 w-3 mr-0.5" />
                I&apos;ll bring this!
              </Button>
            )}

            {/* Organizer assign */}
            {isOrganizer && !hasOwner && !item.isPurchased && (
              <AssignDropdown
                families={families}
                onAssign={(fId) => {
                  claimGroceryItem(item.id, parseInt(String(item.eventId), 10), fId).then(
                    () => window.location.reload()
                  );
                }}
              />
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={startEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          {isOrganizer && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-600"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Assign Dropdown (organizer picks a family)
   ════════════════════════════════════════════════════════ */

function AssignDropdown({
  families,
  onAssign,
}: {
  families: Family[];
  onAssign: (familyId: number) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-5 text-[10px] px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-3 w-3 mr-0.5" />
        Assign
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {families.map((f) => (
        <button
          key={f.id}
          onClick={() => {
            onAssign(f.id);
            setOpen(false);
          }}
          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80"
          title={f.name}
        >
          {familyEmoji(f.id)} {f.name}
        </button>
      ))}
      <button
        onClick={() => setOpen(false)}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Quick Add Section (bulk add with category picker)
   ════════════════════════════════════════════════════════ */

interface QuickRow {
  id: string;
  name: string;
  category: string;
  quantity: string;
  estimatedCost: string;
}

function createQuickRow(): QuickRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    quantity: "",
    estimatedCost: "",
  };
}

function QuickAddSection({
  allSuggestions,
  onBulkAdd,
}: {
  allSuggestions: string[];
  onBulkAdd: (
    rows: {
      name: string;
      category?: string;
      quantity?: string;
      estimatedCost?: number;
      mealTag?: string;
    }[]
  ) => Promise<void>;
}) {
  const [rows, setRows] = useState<QuickRow[]>([
    createQuickRow(),
    createQuickRow(),
    createQuickRow(),
  ]);
  const [saving, setSaving] = useState(false);

  function update(id: string, field: keyof QuickRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) return;
    setSaving(true);
    await onBulkAdd(
      valid.map((r) => ({
        name: r.name.trim(),
        category: r.category.trim() || undefined,
        quantity: r.quantity.trim() || undefined,
        estimatedCost: r.estimatedCost ? parseFloat(r.estimatedCost) : undefined,
      }))
    );
    setRows([createQuickRow(), createQuickRow(), createQuickRow()]);
    setSaving(false);
  }

  const hasData = rows.some((r) => r.name.trim());

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/10">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Quick Add Multiple Items
      </h3>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <Input
              value={row.name}
              onChange={(e) => update(row.id, "name", e.target.value)}
              placeholder="Item name"
              className="h-8 text-sm flex-1"
            />
            <Input
              list={DATALIST_ID}
              value={row.category}
              onChange={(e) => update(row.id, "category", e.target.value)}
              placeholder="Category"
              className="h-8 text-sm w-28"
            />
            <Input
              value={row.quantity}
              onChange={(e) => update(row.id, "quantity", e.target.value)}
              placeholder="Qty"
              className="h-8 text-sm w-16"
            />
            <Input
              type="number"
              step="0.01"
              value={row.estimatedCost}
              onChange={(e) => update(row.id, "estimatedCost", e.target.value)}
              placeholder="$"
              className="h-8 text-sm w-16"
            />
            {rows.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground shrink-0"
                onClick={() => remove(row.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRows((r) => [...r, createQuickRow()])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Row
        </Button>
        {hasData && (
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Check className="mr-1 h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        )}
      </div>
    </div>
  );
}
