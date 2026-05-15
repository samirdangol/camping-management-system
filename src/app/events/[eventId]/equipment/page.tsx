"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  reorderEquipment,
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
  FolderPlus,
  ClipboardPaste,
  MoreVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PasteImportDialog } from "@/components/bulk-import/paste-import-dialog";
import { CategoryBulkAdd } from "@/components/bulk-import/category-bulk-add";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { FamilyAvatar } from "@/components/shared/family-avatar";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { AssignPanel } from "@/components/claimable/assign-panel";
import { MoveCategorySubmenu } from "@/components/claimable/move-category-submenu";
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
  const [importOpen, setImportOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingUnvolunteerItemId, setPendingUnvolunteerItemId] = useState<number | null>(null);

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

  /* move-to-category targets: real categories + user-added empty ones */
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(existingCategories);
    newCategories.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [existingCategories, newCategories]);

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

  function handleDelete(itemId: number) {
    setPendingDeleteId(itemId);
  }

  async function confirmDelete() {
    if (pendingDeleteId === null) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    await deleteEquipment(id, eid);
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

  function handleUnvolunteer(itemId: number) {
    if (!familyId) return;
    setPendingUnvolunteerItemId(itemId);
  }

  async function confirmUnvolunteer() {
    if (pendingUnvolunteerItemId === null || !familyId) return;
    await removeEquipmentVolunteer(pendingUnvolunteerItemId, eid, familyId);
    setPendingUnvolunteerItemId(null);
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

  async function handleMoveCategory(itemId: number, newCategory: string) {
    await updateEquipment(itemId, eid, { category: newCategory });
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

  async function handleReorder(itemId: number, direction: "up" | "down", category?: string) {
    await reorderEquipment(itemId, eid, direction, category);
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
      {/* Datalist for category suggestions */}
      <datalist id={DATALIST_ID}>
        {allSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Supplies & Gear</h2>
          {familyId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setImportOpen(true)}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Import List
            </Button>
          )}
        </div>
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
          categoryOptions={categoryOptions}
          onDelete={handleDelete}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onOrganizerAssign={handleOrganizerAssign}
          onVolunteer={handleVolunteer}
          onUnvolunteer={handleUnvolunteer}
          onSaveEdit={handleSaveEdit}
          onBulkAdd={handleBulkAdd}
          onReorder={handleReorder}
          onMoveCategory={handleMoveCategory}
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
            categoryOptions={categoryOptions}
            onDelete={handleDelete}
            onClaim={handleClaim}
            onUnclaim={handleUnclaim}
            onOrganizerAssign={handleOrganizerAssign}
            onVolunteer={handleVolunteer}
            onUnvolunteer={handleUnvolunteer}
            onSaveEdit={handleSaveEdit}
            onBulkAdd={handleBulkAdd}
            onReorder={handleReorder}
            onMoveCategory={handleMoveCategory}
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
          categoryOptions={categoryOptions}
          onDelete={handleDelete}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onOrganizerAssign={handleOrganizerAssign}
          onVolunteer={handleVolunteer}
          onUnvolunteer={handleUnvolunteer}
          onSaveEdit={handleSaveEdit}
          onBulkAdd={handleBulkAdd}
          onReorder={handleReorder}
          onMoveCategory={handleMoveCategory}
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
      <CategoryBulkAdd
        allSuggestions={allSuggestions}
        existingCategories={existingCategories}
        datalistId={DATALIST_ID}
        onBulkAdd={handleBulkAdd}
      />

      {/* Import Dialog */}
      <PasteImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleBulkAdd}
        title="Import Equipment"
        placeholder={"Cookwares: Pots, Pans, Pressure Cooker\nUtensils: Plates, Cups, Spoons, Forks\nCampfire: Lighter, Fire Wood, Marshmallow sticks"}
      />

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        title="Delete equipment item?"
        description="This will permanently remove the item and any volunteer assignments."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <ConfirmDeleteDialog
        open={pendingUnvolunteerItemId !== null}
        title="Remove yourself?"
        description="This will remove you as a volunteer for this equipment item."
        confirmLabel="Remove"
        onConfirm={confirmUnvolunteer}
        onCancel={() => setPendingUnvolunteerItemId(null)}
      />
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
  categoryOptions,
  onDelete,
  onClaim,
  onUnclaim,
  onOrganizerAssign,
  onVolunteer,
  onUnvolunteer,
  onSaveEdit,
  onBulkAdd,
  onReorder,
  onMoveCategory,
  onRename,
  onClear,
}: {
  category: string;
  items: EquipmentWithOwner[];
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  allSuggestions: string[];
  categoryOptions: string[];
  onDelete: (id: number) => void | Promise<void>;
  onClaim: (id: number) => Promise<void>;
  onUnclaim: (id: number) => Promise<void>;
  onOrganizerAssign: (id: number, familyId: number | null, label?: string) => Promise<void>;
  onVolunteer: (id: number) => Promise<void>;
  onUnvolunteer: (id: number) => void;
  onSaveEdit: (
    id: number,
    vals: { name: string; category?: string; quantity?: number; notes?: string }
  ) => Promise<void>;
  onReorder: (id: number, direction: "up" | "down", category?: string) => Promise<void>;
  onMoveCategory: (id: number, newCategory: string) => Promise<void>;
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
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-destructive"
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
          {items.map((item, idx) => (
            <EquipmentItemCard
              key={item.id}
              item={item}
              families={families}
              familyId={familyId}
              isOrganizer={isOrganizer}
              allSuggestions={allSuggestions}
              categoryOptions={categoryOptions}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              onDelete={onDelete}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
              onOrganizerAssign={onOrganizerAssign}
              onVolunteer={onVolunteer}
              onUnvolunteer={onUnvolunteer}
              onSaveEdit={onSaveEdit}
              onReorder={(dir) => onReorder(item.id, dir, category || undefined)}
              onMoveCategory={onMoveCategory}
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
  categoryOptions,
  isFirst,
  isLast,
  onDelete,
  onClaim,
  onUnclaim,
  onOrganizerAssign,
  onVolunteer,
  onUnvolunteer,
  onSaveEdit,
  onReorder,
  onMoveCategory,
}: {
  item: EquipmentWithOwner;
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  allSuggestions: string[];
  categoryOptions: string[];
  isFirst: boolean;
  isLast: boolean;
  onDelete: (id: number) => void | Promise<void>;
  onClaim: (id: number) => Promise<void>;
  onUnclaim: (id: number) => Promise<void>;
  onOrganizerAssign: (id: number, familyId: number | null, label?: string) => Promise<void>;
  onVolunteer: (id: number) => Promise<void>;
  onUnvolunteer: (id: number) => void;
  onSaveEdit: (
    id: number,
    vals: { name: string; category?: string; quantity?: number; notes?: string }
  ) => Promise<void>;
  onReorder: (direction: "up" | "down") => Promise<void>;
  onMoveCategory: (id: number, newCategory: string) => Promise<void>;
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
    ? "bg-card border-border"
    : "bg-emerald-950/30 border-l-4 border-l-emerald-600 border-emerald-900/40";

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
      <div className="rounded-lg border p-2.5 space-y-2 bg-blue-950/30 border-blue-800/50">
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
  const showSelfVolunteer = !hasOwner && !isMyItem;
  const showAssign = isOrganizer;

  return (
    <div className={`rounded-lg border p-2.5 ${bg}`}>
      <div className="flex items-center gap-2">
        {/* Left: name + qty + notes + volunteer badges — owner badge moves to right column */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
          {needsVolunteer && (
            <span
              className="h-2 w-2 rounded-full bg-red-500 shrink-0"
              title="No owner yet — needs help"
              aria-label="Needs an owner"
            />
          )}
          <span className="text-sm font-medium">{item.name}</span>
          {item.quantity > 1 && (
            <span className="text-xs text-muted-foreground">×{item.quantity}</span>
          )}
          {item.notes && (
            <span className="text-xs text-muted-foreground italic">{item.notes}</span>
          )}
          {item.volunteers.map((v) => (
            <Badge key={v.id} variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-900/40 text-emerald-300">
              <FamilyAvatar familyId={v.family.id} className="w-4 h-4 text-[10px] mr-0.5" />{v.family.name}
              {v.familyId === familyId && (
                <button onClick={() => onUnvolunteer(item.id)} className="ml-0.5 hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        {/* Right: owner badge OR volunteer button — same position, then overflow menu */}
        <div className="flex items-center gap-0.5 shrink-0 relative">
          {hasOwner ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-900/40 text-emerald-300">
              {item.owner
                ? <><FamilyAvatar familyId={item.owner.id} className="w-4 h-4 text-[10px] mr-0.5" />{item.owner.name}</>
                : item.ownerLabel}
              {(iAmOwner || isOrganizer) && (
                <button onClick={() => onUnclaim(item.id)} className="ml-0.5 hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ) : showSelfVolunteer ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 border-emerald-700/50 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
              onClick={() => onClaim(item.id)}
            >
              <Hand className="h-3.5 w-3.5" />
              I&apos;ll bring this!
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label="Item actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {showAssign && (
                <>
                  <DropdownMenuItem onClick={() => setShowAssignPanel((v) => !v)}>
                    <UserPlus className="h-4 w-4" />
                    {hasOwner ? "Reassign" : "Assign"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={startEdit}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReorder("up")} disabled={isFirst}>
                <ArrowUp className="h-4 w-4" />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReorder("down")} disabled={isLast}>
                <ArrowDown className="h-4 w-4" />
                Move down
              </DropdownMenuItem>
              <MoveCategorySubmenu
                currentCategory={item.category || ""}
                categoryOptions={categoryOptions}
                onMove={(target) => onMoveCategory(item.id, target)}
              />
              {isOrganizer && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(item.id)} variant="destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
      </div>
    </div>
  );
}
