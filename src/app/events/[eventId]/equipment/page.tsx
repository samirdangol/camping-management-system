"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import {
  bulkCreateEquipment,
  updateEquipment,
  deleteEquipment,
  claimEquipment,
  unclaimEquipment,
  addEquipmentVolunteer,
  removeEquipmentVolunteer,
  renameEquipmentCategory,
  clearEquipmentCategory,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { EQUIPMENT_CATEGORY_SUGGESTIONS } from "@/lib/constants";
import {
  Backpack,
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
  FolderPlus,
} from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { familyEmoji } from "@/lib/utils";
import type { Family, EquipmentWithOwner } from "@/types";

type Filter = "all" | "unclaimed" | "mine";

/* ─── helpers ─── */

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DATALIST_ID = "equip-cat-suggestions";

/* ─── Main Page ─── */

export default function EquipmentPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId, 10);
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);
  const [families, setFamilies] = useState<Family[]>([]);
  const [items, setItems] = useState<EquipmentWithOwner[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState("");

  const fetchData = useCallback(async () => {
    const [signups, equip] = await Promise.all([
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/equipment`).then((r) => r.json()),
    ]);
    setFamilies(signups.map((s: { family: Family }) => s.family));
    setItems(equip);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* filtered items */
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "unclaimed")
          return !item.ownerFamilyId && !item.ownerLabel && item.volunteers.length === 0;
        if (filter === "mine")
          return (
            item.ownerFamilyId === familyId ||
            item.volunteers.some((v) => v.familyId === familyId)
          );
        return true;
      }),
    [items, filter, familyId]
  );

  /* group by category */
  const { grouped, categoryOrder, uncategorized } = useMemo(() => {
    const map: Record<string, EquipmentWithOwner[]> = {};
    const uncat: EquipmentWithOwner[] = [];
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

  /* existing category names for suggestions */
  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of items) {
      if (item.category?.trim()) cats.add(item.category.trim());
    }
    return Array.from(cats).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [items]);

  /* combined suggestions: existing + defaults */
  const allSuggestions = useMemo(() => {
    const set = new Set(existingCategories.map((c) => c.toLowerCase()));
    const extra = EQUIPMENT_CATEGORY_SUGGESTIONS.filter(
      (s) => !set.has(s.toLowerCase())
    ).map(cap);
    return [...existingCategories, ...extra];
  }, [existingCategories]);

  /* totals */
  const unclaimedCount = items.filter(
    (i) => !i.ownerFamilyId && !i.ownerLabel && i.volunteers.length === 0
  ).length;
  const myCount = items.filter(
    (i) =>
      i.ownerFamilyId === familyId ||
      i.volunteers.some((v) => v.familyId === familyId)
  ).length;

  /* ─── actions ─── */

  async function handleDelete(itemId: number) {
    await deleteEquipment(itemId, eid);
    await fetchData();
  }

  async function handleClaim(itemId: number) {
    if (!familyId) return;
    await claimEquipment(itemId, eid, familyId);
    await fetchData();
  }

  async function handleUnclaim(itemId: number) {
    await unclaimEquipment(itemId, eid);
    await fetchData();
  }

  async function handleOrganizerAssign(
    itemId: number,
    assignFamilyId: number | null,
    label?: string
  ) {
    await claimEquipment(itemId, eid, assignFamilyId, label);
    await fetchData();
  }

  async function handleVolunteer(itemId: number) {
    if (!familyId) return;
    await addEquipmentVolunteer(itemId, eid, familyId);
    await fetchData();
  }

  async function handleUnvolunteer(itemId: number) {
    if (!familyId) return;
    await removeEquipmentVolunteer(itemId, eid, familyId);
    await fetchData();
  }

  async function handleSaveEdit(
    itemId: number,
    vals: {
      name: string;
      category?: string;
      quantity?: number;
      notes?: string;
    }
  ) {
    await updateEquipment(itemId, eid, vals);
    await fetchData();
  }

  async function handleBulkAdd(
    rows: {
      name: string;
      category?: string;
      quantity?: number;
      notes?: string;
    }[]
  ) {
    await bulkCreateEquipment(eid, rows);
    const addedCats = rows.map((r) => r.category?.trim()).filter(Boolean) as string[];
    if (addedCats.length > 0) {
      setNewCategories((prev) => prev.filter((c) => !addedCats.includes(c)));
    }
    await fetchData();
  }

  async function handleRenameCategory(oldName: string, newName: string) {
    if (!newName.trim() || newName.trim() === oldName) return;
    await renameEquipmentCategory(eid, oldName, newName.trim());
    setNewCategories((prev) =>
      prev.map((c) => (c === oldName ? newName.trim() : c))
    );
    await fetchData();
  }

  async function handleClearCategory(categoryName: string) {
    await clearEquipmentCategory(eid, categoryName);
    setNewCategories((prev) => prev.filter((c) => c !== categoryName));
    await fetchData();
  }

  function handleAddNewCategory() {
    const name = newCatInput.trim();
    if (!name) return;
    const allExisting = [
      ...existingCategories.map((c) => c.toLowerCase()),
      ...newCategories.map((c) => c.toLowerCase()),
    ];
    if (allExisting.includes(name.toLowerCase())) {
      setNewCatInput("");
      return;
    }
    setNewCategories((prev) => [...prev, name]);
    setNewCatInput("");
  }

  function handleRemoveNewCategory(name: string) {
    setNewCategories((prev) => prev.filter((c) => c !== name));
  }

  if (loading)
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Supplies & Gear</h2>
        <span className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 && "s"}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "unclaimed", "mine"] as Filter[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? `All (${items.length})`
              : f === "unclaimed"
                ? `Needs Owner (${unclaimedCount})`
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

      {/* No items */}
      {filtered.length === 0 && (
        <EmptyState
          icon={Backpack}
          title="No supplies or gear listed"
          description={
            filter !== "all"
              ? "No items match this filter."
              : "Add supplies and gear below!"
          }
        />
      )}

      {/* Category sections */}
      {categoryOrder.map((cat) => (
        <EquipmentCategorySection
          key={cat}
          category={cat}
          items={grouped[cat]}
          families={families}
          familyId={familyId}
          isOrganizer={isOrganizer}
          allSuggestions={allSuggestions}
          onDelete={handleDelete}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onOrganizerAssign={handleOrganizerAssign}
          onVolunteer={handleVolunteer}
          onUnvolunteer={handleUnvolunteer}
          onSaveEdit={handleSaveEdit}
          onBulkAdd={handleBulkAdd}
          onRename={(newName) => handleRenameCategory(cat, newName)}
          onClear={() => handleClearCategory(cat)}
        />
      ))}

      {/* New (empty) categories */}
      {newCategories.map((cat) =>
        !categoryOrder.includes(cat) ? (
          <EquipmentCategorySection
            key={`new-${cat}`}
            category={cat}
            items={[]}
            families={families}
            familyId={familyId}
            isOrganizer={isOrganizer}
            allSuggestions={allSuggestions}
            onDelete={handleDelete}
            onClaim={handleClaim}
            onUnclaim={handleUnclaim}
            onOrganizerAssign={handleOrganizerAssign}
            onVolunteer={handleVolunteer}
            onUnvolunteer={handleUnvolunteer}
            onSaveEdit={handleSaveEdit}
            onBulkAdd={handleBulkAdd}
            onRename={(newName) => {
              setNewCategories((prev) =>
                prev.map((c) => (c === cat ? newName : c))
              );
            }}
            onClear={() => handleRemoveNewCategory(cat)}
          />
        ) : null
      )}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <EquipmentCategorySection
          key="__uncategorized__"
          category=""
          items={uncategorized}
          families={families}
          familyId={familyId}
          isOrganizer={isOrganizer}
          allSuggestions={allSuggestions}
          onDelete={handleDelete}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onOrganizerAssign={handleOrganizerAssign}
          onVolunteer={handleVolunteer}
          onUnvolunteer={handleUnvolunteer}
          onSaveEdit={handleSaveEdit}
          onBulkAdd={handleBulkAdd}
        />
      )}

      {/* Add Category */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAddNewCategory();
        }}
        className="flex items-center gap-2"
      >
        <FolderPlus className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          list={DATALIST_ID}
          value={newCatInput}
          onChange={(e) => setNewCatInput(e.target.value)}
          placeholder="New category name..."
          className="h-8 text-sm flex-1 max-w-xs"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!newCatInput.trim()}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Category
        </Button>
      </form>

      {/* Quick Add Section */}
      <EquipmentQuickAdd allSuggestions={allSuggestions} onBulkAdd={handleBulkAdd} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Category Section
   ════════════════════════════════════════════════════════ */

function EquipmentCategorySection({
  category,
  items,
  families,
  familyId,
  isOrganizer,
  allSuggestions,
  onDelete,
  onClaim,
  onUnclaim,
  onOrganizerAssign,
  onVolunteer,
  onUnvolunteer,
  onSaveEdit,
  onBulkAdd,
  onRename,
  onClear,
}: {
  category: string;
  items: EquipmentWithOwner[];
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  allSuggestions: string[];
  onDelete: (id: number) => Promise<void>;
  onClaim: (id: number) => Promise<void>;
  onUnclaim: (id: number) => Promise<void>;
  onOrganizerAssign: (id: number, familyId: number | null, label?: string) => Promise<void>;
  onVolunteer: (id: number) => Promise<void>;
  onUnvolunteer: (id: number) => Promise<void>;
  onSaveEdit: (
    id: number,
    vals: { name: string; category?: string; quantity?: number; notes?: string }
  ) => Promise<void>;
  onBulkAdd: (
    rows: { name: string; category?: string; quantity?: number; notes?: string }[]
  ) => Promise<void>;
  onRename?: (newName: string) => void;
  onClear?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(category);

  const claimed = items.filter((i) => i.ownerFamilyId || i.ownerLabel || i.volunteers.length > 0).length;
  const displayName = category || "Uncategorized";
  const isUncategorized = !category;

  async function handleQuickAdd() {
    if (!addName.trim()) return;
    setAdding(true);
    await onBulkAdd([
      {
        name: addName.trim(),
        category: category || undefined,
        quantity: parseInt(addQty) || 1,
        notes: addNotes.trim() || undefined,
      },
    ]);
    setAddName("");
    setAddQty("1");
    setAddNotes("");
    setAdding(false);
  }

  function startRename() {
    setRenameValue(category);
    setRenaming(true);
  }

  function submitRename() {
    if (renameValue.trim() && renameValue.trim() !== category) {
      onRename?.(renameValue.trim());
    }
    setRenaming(false);
  }

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center gap-2 w-full group">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-left"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          {renaming ? null : (
            <span className="font-semibold text-sm">{displayName}</span>
          )}
        </button>
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRename();
            }}
            className="flex items-center gap-1"
          >
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-7 text-sm w-36"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-emerald-600"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setRenaming(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </form>
        ) : (
          <>
            <Badge variant="secondary" className="text-xs">
              {claimed}/{items.length} claimed
            </Badge>
            {!isUncategorized && onRename && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={startRename}
                title="Rename category"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {!isUncategorized && onClear && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                onClick={onClear}
                title="Remove category (items move to Uncategorized)"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-1.5 pl-6">
          {items.map((item) => (
            <EquipmentItemCard
              key={item.id}
              item={item}
              families={families}
              familyId={familyId}
              isOrganizer={isOrganizer}
              allSuggestions={allSuggestions}
              onDelete={onDelete}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
              onOrganizerAssign={onOrganizerAssign}
              onVolunteer={onVolunteer}
              onUnvolunteer={onUnvolunteer}
              onSaveEdit={onSaveEdit}
            />
          ))}

          {/* Inline quick-add */}
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
              type="number"
              min={1}
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              placeholder="Qty"
              className="h-8 text-sm w-16"
            />
            <Input
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              placeholder="Notes"
              className="h-8 text-sm w-28"
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
   Equipment Item Card
   ════════════════════════════════════════════════════════ */

function EquipmentItemCard({
  item,
  families,
  familyId,
  isOrganizer,
  allSuggestions,
  onDelete,
  onClaim,
  onUnclaim,
  onOrganizerAssign,
  onVolunteer,
  onUnvolunteer,
  onSaveEdit,
}: {
  item: EquipmentWithOwner;
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  allSuggestions: string[];
  onDelete: (id: number) => Promise<void>;
  onClaim: (id: number) => Promise<void>;
  onUnclaim: (id: number) => Promise<void>;
  onOrganizerAssign: (id: number, familyId: number | null, label?: string) => Promise<void>;
  onVolunteer: (id: number) => Promise<void>;
  onUnvolunteer: (id: number) => Promise<void>;
  onSaveEdit: (
    id: number,
    vals: { name: string; category?: string; quantity?: number; notes?: string }
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editCategory, setEditCategory] = useState(item.category || "");
  const [editQty, setEditQty] = useState(String(item.quantity));
  const [editNotes, setEditNotes] = useState(item.notes || "");
  const [busy, setBusy] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  const hasOwner = !!item.owner || !!item.ownerLabel;
  const hasVolunteers = item.volunteers.length > 0;
  const iAmOwner = item.ownerFamilyId === familyId;
  const iAmVolunteer = item.volunteers.some((v) => v.familyId === familyId);
  const isMyItem = iAmOwner || iAmVolunteer;
  const needsVolunteer = !hasOwner && !hasVolunteers;

  const bg = needsVolunteer
    ? "bg-amber-50 border-amber-200"
    : "bg-white border-border";

  function startEdit() {
    setEditName(item.name);
    setEditCategory(item.category || "");
    setEditQty(String(item.quantity));
    setEditNotes(item.notes || "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    setBusy(true);
    await onSaveEdit(item.id, {
      name: editName.trim(),
      category: editCategory.trim() || undefined,
      quantity: parseInt(editQty) || 1,
      notes: editNotes.trim() || undefined,
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
            type="number"
            min={1}
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            placeholder="Qty"
            className="h-8 text-sm"
          />
          <Input
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes"
            className="h-8 text-sm col-span-2 sm:col-span-4"
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
      <div className="flex items-center gap-2">
        {/* Single line: name + qty + notes + owner/volunteers + actions */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          <span className="text-sm font-medium">{item.name}</span>
          {item.quantity > 1 && (
            <span className="text-xs text-muted-foreground">
              ×{item.quantity}
            </span>
          )}
          {item.notes && (
            <span className="text-xs text-muted-foreground italic">
              {item.notes}
            </span>
          )}

          {/* Owner badge: family or free-text label */}
          {(item.owner || item.ownerLabel) && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700"
            >
              {item.owner
                ? <>{familyEmoji(item.owner.id)} {item.owner.name}</>
                : item.ownerLabel}
              {(iAmOwner || isOrganizer) && (
                <button
                  onClick={() => onUnclaim(item.id)}
                  className="ml-0.5 hover:text-red-600"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          )}
          {/* Volunteer badges (with X if mine) */}
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
          {needsVolunteer && (
            <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
              <AlertTriangle className="h-3 w-3" /> Needs someone to bring
            </span>
          )}

          {/* Self-volunteer button */}
          {!isMyItem && (
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

          {/* Organizer assign / reassign */}
          {isOrganizer && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => setShowAssignPanel((v) => !v)}
              >
                <UserPlus className="h-3 w-3 mr-0.5" />
                {hasOwner ? "Reassign" : "Assign"}
              </Button>
              {showAssignPanel && (
                <AssignPanel
                  families={families}
                  onAssign={(fId, label) => {
                    onOrganizerAssign(item.id, fId, label);
                    setShowAssignPanel(false);
                  }}
                  onClose={() => setShowAssignPanel(false)}
                />
              )}
            </div>
          )}
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
   Assign Panel (organizer picks a family, contact, or types free text)
   ════════════════════════════════════════════════════════ */

function AssignPanel({
  families,
  onAssign,
  onClose,
}: {
  families: Family[];
  onAssign: (familyId: number | null, label?: string) => void;
  onClose: () => void;
}) {
  const [expandedFamilyId, setExpandedFamilyId] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute z-20 top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-[220px] space-y-2"
    >
      {/* Family grid */}
      <div className="grid grid-cols-2 gap-1">
        {families.map((f) => (
          <div key={f.id}>
            <div className="flex items-center">
              <button
                onClick={() => onAssign(f.id)}
                className="flex-1 text-left text-xs px-2 py-1.5 rounded bg-muted hover:bg-muted/80 truncate"
                title={`Assign to ${f.name} family`}
              >
                {familyEmoji(f.id)} {f.name}
              </button>
              {(f.contactName || f.contactName2) && (
                <button
                  onClick={() =>
                    setExpandedFamilyId((prev) =>
                      prev === f.id ? null : f.id
                    )
                  }
                  className="px-1 py-1.5 text-muted-foreground hover:text-foreground"
                  title="Show individual contacts"
                >
                  {expandedFamilyId === f.id ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
            {/* Expanded contacts */}
            {expandedFamilyId === f.id && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {f.contactName && (
                  <button
                    onClick={() => onAssign(null, f.contactName)}
                    className="block w-full text-left text-[10px] px-2 py-1 rounded hover:bg-blue-50 text-blue-600"
                  >
                    → {f.contactName}
                  </button>
                )}
                {f.contactName2 && (
                  <button
                    onClick={() => onAssign(null, f.contactName2!)}
                    className="block w-full text-left text-[10px] px-2 py-1 rounded hover:bg-blue-50 text-blue-600"
                  >
                    → {f.contactName2}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Free text input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (customText.trim()) {
            onAssign(null, customText.trim());
          }
        }}
        className="flex items-center gap-1 border-t pt-2"
      >
        <Input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Custom name..."
          className="h-7 text-xs flex-1"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-blue-600"
          disabled={!customText.trim()}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Quick Add Section
   ════════════════════════════════════════════════════════ */

interface QuickRow {
  id: string;
  name: string;
  category: string;
  quantity: string;
  notes: string;
}

function createQuickRow(): QuickRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    quantity: "1",
    notes: "",
  };
}

function EquipmentQuickAdd({
  allSuggestions,
  onBulkAdd,
}: {
  allSuggestions: string[];
  onBulkAdd: (
    rows: { name: string; category?: string; quantity?: number; notes?: string }[]
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
        quantity: parseInt(r.quantity) || 1,
        notes: r.notes.trim() || undefined,
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
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) => update(row.id, "quantity", e.target.value)}
              placeholder="Qty"
              className="h-8 text-sm w-16"
            />
            <Input
              value={row.notes}
              onChange={(e) => update(row.id, "notes", e.target.value)}
              placeholder="Notes"
              className="h-8 text-sm w-28"
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
