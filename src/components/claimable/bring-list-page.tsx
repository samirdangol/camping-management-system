"use client";

import { useMemo, useState } from "react";
import {
  bulkCreateGroceryItems,
  updateGroceryItem,
  deleteGroceryItem,
  claimGroceryItem,
  unclaimGroceryItem,
  toggleGroceryPurchased,
  addGroceryVolunteer,
  removeGroceryVolunteer,
  renameGroceryCategory,
  clearGroceryCategory,
  reorderGroceryItem,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { PasteImportDialog } from "@/components/bulk-import/paste-import-dialog";
import {
  GROCERY_CATEGORY_SUGGESTIONS,
  EQUIPMENT_CATEGORY_SUGGESTIONS,
} from "@/lib/constants";
import {
  Backpack,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  FolderPlus,
  Package,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { ItemCardShell } from "./item-card-shell";
import { ItemEditCard } from "./item-edit-card";
import {
  useClaimableItems,
  type ClaimableActions,
  type ClaimableOwnership,
  type ClaimableFilter,
} from "./use-claimable-items";
import type { ReactNode } from "react";
import type { GroceryWithFamily, EquipmentWithOwner } from "@/types";

const DATALIST_ID = "bring-list-cat-suggestions";

/* ─── types ─── */

type GroceryBulkRow = {
  name: string;
  category?: string;
  quantity?: string;
  estimatedCost?: number;
  mealTag?: string;
};

type GroceryEditVals = {
  name?: string;
  category?: string;
  quantity?: string;
  estimatedCost?: number | null;
  mealTag?: string | null;
};

type EquipmentBulkRow = {
  name: string;
  category?: string;
  quantity?: number;
  notes?: string;
};

type EquipmentEditVals = {
  name?: string;
  category?: string;
  quantity?: number;
  notes?: string;
};

type BringItem =
  | { kind: "food"; item: GroceryWithFamily }
  | { kind: "gear"; item: EquipmentWithOwner };

type Filter = ClaimableFilter | "food" | "gear";

interface BulkImportRow {
  name: string;
  category?: string;
  [key: string]: unknown;
}

/* ─── domain action / ownership bundles ─── */

const groceryActions: ClaimableActions<
  GroceryWithFamily,
  GroceryBulkRow,
  GroceryEditVals
> = {
  fetchItems: (eventId) =>
    fetch(`/api/events/${eventId}/groceries`).then((r) => r.json()),
  claim: claimGroceryItem,
  unclaim: unclaimGroceryItem,
  delete: deleteGroceryItem,
  addVolunteer: addGroceryVolunteer,
  removeVolunteer: removeGroceryVolunteer,
  update: updateGroceryItem,
  bulkCreate: bulkCreateGroceryItems,
  reorder: reorderGroceryItem,
  renameCategory: renameGroceryCategory,
  clearCategory: clearGroceryCategory,
};

const groceryOwnership: ClaimableOwnership<GroceryWithFamily> = {
  getOwnerFamilyId: (i) => i.assignedFamilyId,
  getOwnerLabel: (i) => i.assignedLabel,
  getOwner: (i) => i.assignedTo,
};

const equipmentActions: ClaimableActions<
  EquipmentWithOwner,
  EquipmentBulkRow,
  EquipmentEditVals
> = {
  fetchItems: (eventId) =>
    fetch(`/api/events/${eventId}/equipment`).then((r) => r.json()),
  claim: claimEquipment,
  unclaim: unclaimEquipment,
  delete: deleteEquipment,
  addVolunteer: addEquipmentVolunteer,
  removeVolunteer: removeEquipmentVolunteer,
  update: updateEquipment,
  bulkCreate: bulkCreateEquipment,
  reorder: reorderEquipment,
  renameCategory: renameEquipmentCategory,
  clearCategory: clearEquipmentCategory,
};

const equipmentOwnership: ClaimableOwnership<EquipmentWithOwner> = {
  getOwnerFamilyId: (i) => i.ownerFamilyId,
  getOwnerLabel: (i) => i.ownerLabel,
  getOwner: (i) => i.owner,
};

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ─── small per-kind UI bits ─── */

function KindChip({ kind }: { kind: "food" | "gear" }) {
  const isFood = kind === "food";
  return (
    <Badge
      className={
        isFood
          ? "text-[10px] px-1.5 py-0 bg-sky-900/40 text-sky-300 hover:bg-sky-900/50"
          : "text-[10px] px-1.5 py-0 bg-amber-900/40 text-amber-300 hover:bg-amber-900/50"
      }
    >
      {isFood ? "Food" : "Gear"}
    </Badge>
  );
}

function GroceryBody({ item }: { item: GroceryWithFamily }) {
  return (
    <>
      <KindChip kind="food" />
      <span className="text-sm font-medium">{item.name}</span>
      {item.quantity && (
        <span className="text-xs text-muted-foreground">×{item.quantity}</span>
      )}
      {item.mealTag && (
        <Badge className="text-[10px] px-1.5 py-0 bg-purple-900/40 text-purple-300 hover:bg-purple-900/50">
          {item.mealTag}
        </Badge>
      )}
    </>
  );
}

function EquipmentBody({ item }: { item: EquipmentWithOwner }) {
  return (
    <>
      <KindChip kind="gear" />
      <span className="text-sm font-medium">{item.name}</span>
      {item.quantity > 1 && (
        <span className="text-xs text-muted-foreground">×{item.quantity}</span>
      )}
      {item.notes && (
        <span className="text-xs text-muted-foreground italic">
          {item.notes}
        </span>
      )}
    </>
  );
}

function GroceryEditor({
  item,
  onSave,
  onCancel,
}: {
  item: GroceryWithFamily;
  onSave: (vals: GroceryEditVals) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category || "");
  const [qty, setQty] = useState(item.quantity || "");
  const [cost, setCost] = useState(
    item.estimatedCost ? String(item.estimatedCost) : ""
  );
  const [mealTag, setMealTag] = useState(item.mealTag || "");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setBusy(true);
    await onSave({
      name: name.trim(),
      category: category.trim() || undefined,
      quantity: qty.trim() || undefined,
      estimatedCost: cost ? parseFloat(cost) : null,
      mealTag: mealTag.trim() || null,
    });
    setBusy(false);
  }

  return (
    <ItemEditCard
      onSave={handleSave}
      onCancel={onCancel}
      canSave={!!name.trim()}
      busy={busy}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="h-8 text-sm col-span-2"
        autoFocus
      />
      <Input
        list={DATALIST_ID}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        className="h-8 text-sm"
      />
      <Input
        value={mealTag}
        onChange={(e) => setMealTag(e.target.value)}
        placeholder="Meal tag"
        className="h-8 text-sm"
      />
      <Input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Qty"
        className="h-8 text-sm"
      />
      <Input
        type="number"
        step="0.01"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        placeholder="Est. cost"
        className="h-8 text-sm"
      />
    </ItemEditCard>
  );
}

function EquipmentEditor({
  item,
  onSave,
  onCancel,
}: {
  item: EquipmentWithOwner;
  onSave: (vals: EquipmentEditVals) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category || "");
  const [qty, setQty] = useState(String(item.quantity));
  const [notes, setNotes] = useState(item.notes || "");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setBusy(true);
    await onSave({
      name: name.trim(),
      category: category.trim() || undefined,
      quantity: parseInt(qty) || 1,
      notes: notes.trim() || undefined,
    });
    setBusy(false);
  }

  return (
    <ItemEditCard
      onSave={handleSave}
      onCancel={onCancel}
      canSave={!!name.trim()}
      busy={busy}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="h-8 text-sm col-span-2"
        autoFocus
      />
      <Input
        list={DATALIST_ID}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        className="h-8 text-sm"
      />
      <Input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Qty"
        className="h-8 text-sm"
      />
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="h-8 text-sm col-span-2 sm:col-span-4"
      />
    </ItemEditCard>
  );
}

/* ─── item row ─── */

function BringItemRow({
  bringItem,
  isOrganizer,
  familyId,
  families,
  categoryOptions,
  food,
  gear,
}: {
  bringItem: BringItem;
  isOrganizer: boolean;
  familyId: number | null;
  families: ReturnType<typeof useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>>["families"];
  categoryOptions: string[];
  food: ReturnType<typeof useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>>;
  gear: ReturnType<typeof useClaimableItems<EquipmentWithOwner, EquipmentBulkRow, EquipmentEditVals>>;
}) {
  if (bringItem.kind === "food") {
    const item = bringItem.item;
    return (
      <ItemCardShell<GroceryWithFamily, GroceryEditVals>
        item={item}
        families={families}
        familyId={familyId}
        isOrganizer={isOrganizer}
        isFirst={false}
        isLast={false}
        categoryOptions={categoryOptions}
        ownership={groceryOwnership}
        onDelete={food.handleDelete}
        onClaim={food.handleClaim}
        onUnclaim={food.handleUnclaim}
        onOrganizerAssign={food.handleOrganizerAssign}
        onUnvolunteer={food.handleUnvolunteer}
        onSaveEdit={food.handleSaveEdit}
        onReorder={async () => {
          /* reorder hidden in unified view */
        }}
        onMoveCategory={food.handleMoveCategory}
        showReorder={false}
        renderLeading={(it) => (
          <Checkbox
            checked={it.isPurchased}
            onCheckedChange={async () => {
              await toggleGroceryPurchased(it.id, it.eventId, !it.isPurchased);
              await food.refetch();
            }}
            className="shrink-0"
          />
        )}
        renderBody={(it) => <GroceryBody item={it} />}
        renderEditor={(it, onSave, onCancel) => (
          <GroceryEditor item={it} onSave={onSave} onCancel={onCancel} />
        )}
      />
    );
  }

  const item = bringItem.item;
  return (
    <ItemCardShell<EquipmentWithOwner, EquipmentEditVals>
      item={item}
      families={families}
      familyId={familyId}
      isOrganizer={isOrganizer}
      isFirst={false}
      isLast={false}
      categoryOptions={categoryOptions}
      ownership={equipmentOwnership}
      onDelete={gear.handleDelete}
      onClaim={gear.handleClaim}
      onUnclaim={gear.handleUnclaim}
      onOrganizerAssign={gear.handleOrganizerAssign}
      onUnvolunteer={gear.handleUnvolunteer}
      onSaveEdit={gear.handleSaveEdit}
      onReorder={async () => {
        /* reorder hidden in unified view */
      }}
      onMoveCategory={gear.handleMoveCategory}
      showReorder={false}
      renderBody={(it) => <EquipmentBody item={it} />}
      renderEditor={(it, onSave, onCancel) => (
        <EquipmentEditor item={it} onSave={onSave} onCancel={onCancel} />
      )}
    />
  );
}

/* ─── quick-add row with kind toggle ─── */

function BringListQuickAdd({
  category,
  displayName,
  onAddFood,
  onAddGear,
}: {
  category: string;
  displayName: string;
  onAddFood: (row: GroceryBulkRow) => Promise<void>;
  onAddGear: (row: EquipmentBulkRow) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [kind, setKind] = useState<"food" | "gear">("food");
  const [adding, setAdding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    if (kind === "food") {
      await onAddFood({
        name: name.trim(),
        category: category || undefined,
        quantity: qty || undefined,
      });
    } else {
      await onAddGear({
        name: name.trim(),
        category: category || undefined,
        quantity: parseInt(qty) || 1,
      });
    }
    setName("");
    setQty("");
    setAdding(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 pt-1 flex-wrap"
    >
      <div className="flex items-center rounded-md border overflow-hidden text-xs h-8 shrink-0">
        <button
          type="button"
          onClick={() => setKind("food")}
          className={`px-2 h-full transition-colors ${
            kind === "food"
              ? "bg-sky-900/40 text-sky-200"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Food
        </button>
        <button
          type="button"
          onClick={() => setKind("gear")}
          className={`px-2 h-full transition-colors border-l ${
            kind === "gear"
              ? "bg-amber-900/40 text-amber-200"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Gear
        </button>
      </div>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`Add ${kind} to ${displayName}...`}
        className="h-8 text-sm flex-1 min-w-[140px]"
      />
      <Input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Qty"
        className="h-8 text-sm w-16"
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={!name.trim() || adding}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}

/* ─── category section ─── */

function BringCategorySection({
  category,
  items,
  isOrganizer,
  familyId,
  families,
  categoryOptions,
  food,
  gear,
  onRename,
  onClear,
}: {
  category: string;
  items: BringItem[];
  isOrganizer: boolean;
  familyId: number | null;
  families: ReturnType<typeof useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>>["families"];
  categoryOptions: string[];
  food: ReturnType<typeof useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>>;
  gear: ReturnType<typeof useClaimableItems<EquipmentWithOwner, EquipmentBulkRow, EquipmentEditVals>>;
  onRename?: (newName: string) => void;
  onClear?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(category);

  const displayName = category || "Uncategorized";
  const isUncategorized = !category;

  const claimed = items.filter(({ kind, item }) => {
    // Branch on kind so TS can narrow `item` to the right concrete shape and
    // each domain's ownership accessor receives the type it expects.
    if (kind === "food") {
      return (
        groceryOwnership.getOwnerFamilyId(item) ||
        groceryOwnership.getOwnerLabel(item) ||
        item.volunteers.length > 0
      );
    }
    return (
      equipmentOwnership.getOwnerFamilyId(item) ||
      equipmentOwnership.getOwnerLabel(item) ||
      item.volunteers.length > 0
    );
  }).length;

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

  async function handleAddFood(row: GroceryBulkRow) {
    await food.handleBulkAdd([row]);
  }
  async function handleAddGear(row: EquipmentBulkRow) {
    await gear.handleBulkAdd([row]);
  }

  return (
    <div className="space-y-2">
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
          {items.map((bi) => (
            <BringItemRow
              key={`${bi.kind}-${bi.item.id}`}
              bringItem={bi}
              isOrganizer={isOrganizer}
              familyId={familyId}
              families={families}
              categoryOptions={categoryOptions}
              food={food}
              gear={gear}
            />
          ))}

          <BringListQuickAdd
            category={category}
            displayName={displayName}
            onAddFood={handleAddFood}
            onAddGear={handleAddGear}
          />
        </div>
      )}
    </div>
  );
}

/* ─── main shell ─── */

export function BringListPage({
  eventId,
  familyId,
  isOrganizer,
}: {
  eventId: number;
  familyId: number | null;
  isOrganizer: boolean;
}) {
  const food = useClaimableItems<
    GroceryWithFamily,
    GroceryBulkRow,
    GroceryEditVals
  >({ eventId, familyId, actions: groceryActions, ownership: groceryOwnership });

  const gear = useClaimableItems<
    EquipmentWithOwner,
    EquipmentBulkRow,
    EquipmentEditVals
  >({
    eventId,
    familyId,
    actions: equipmentActions,
    ownership: equipmentOwnership,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [newCatInput, setNewCatInput] = useState("");
  const [importOpen, setImportOpen] = useState<"food" | "gear" | null>(null);

  /* ── merge ── */

  const allItems = useMemo<BringItem[]>(
    () => [
      ...food.items.map((item) => ({ kind: "food" as const, item })),
      ...gear.items.map((item) => ({ kind: "gear" as const, item })),
    ],
    [food.items, gear.items]
  );

  /* ── filter ── */

  const filtered = useMemo<BringItem[]>(() => {
    return allItems.filter(({ kind, item }) => {
      if (filter === "food") return kind === "food";
      if (filter === "gear") return kind === "gear";
      if (filter === "needs-help") {
        if (kind === "food") {
          const i = item as GroceryWithFamily;
          return (
            !i.assignedFamilyId &&
            !i.assignedLabel &&
            i.volunteers.length === 0
          );
        }
        const i = item as EquipmentWithOwner;
        return !i.ownerFamilyId && !i.ownerLabel && i.volunteers.length === 0;
      }
      if (filter === "mine") {
        if (kind === "food") {
          const i = item as GroceryWithFamily;
          return (
            i.assignedFamilyId === familyId ||
            i.volunteers.some((v) => v.familyId === familyId)
          );
        }
        const i = item as EquipmentWithOwner;
        return (
          i.ownerFamilyId === familyId ||
          i.volunteers.some((v) => v.familyId === familyId)
        );
      }
      return true;
    });
  }, [allItems, filter, familyId]);

  /* ── group by category ── */

  const { byCategory, categoryOrder, uncategorized } = useMemo(() => {
    const map: Record<string, BringItem[]> = {};
    const uncat: BringItem[] = [];
    for (const bi of filtered) {
      const cat = bi.item.category?.trim();
      if (cat) {
        if (!map[cat]) map[cat] = [];
        map[cat].push(bi);
      } else {
        uncat.push(bi);
      }
    }
    // Within a category, sort food before gear, then by sortOrder
    for (const cat of Object.keys(map)) {
      map[cat].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "food" ? -1 : 1;
        return a.item.sortOrder - b.item.sortOrder;
      });
    }
    uncat.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "food" ? -1 : 1;
      return a.item.sortOrder - b.item.sortOrder;
    });
    const order = Object.keys(map).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    return { byCategory: map, categoryOrder: order, uncategorized: uncat };
  }, [filtered]);

  /* ── merged category meta ── */

  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    food.existingCategories.forEach((c) => set.add(c));
    gear.existingCategories.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [food.existingCategories, gear.existingCategories]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    food.categoryOptions.forEach((c) => set.add(c));
    gear.categoryOptions.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [food.categoryOptions, gear.categoryOptions]);

  const allSuggestions = useMemo(() => {
    const set = new Set(existingCategories.map((c) => c.toLowerCase()));
    const extras = [
      ...GROCERY_CATEGORY_SUGGESTIONS,
      ...EQUIPMENT_CATEGORY_SUGGESTIONS,
    ].filter((s) => !set.has(s.toLowerCase()));
    // De-duplicate the extras (since both lists may share names)
    const extraSet = new Set<string>();
    const dedupedExtras: string[] = [];
    for (const s of extras) {
      const lower = s.toLowerCase();
      if (!extraSet.has(lower)) {
        extraSet.add(lower);
        dedupedExtras.push(capFirst(s));
      }
    }
    return [...existingCategories, ...dedupedExtras];
  }, [existingCategories]);

  const newCategories = useMemo(() => {
    const set = new Set<string>();
    food.newCategories.forEach((c) => set.add(c));
    gear.newCategories.forEach((c) => set.add(c));
    return Array.from(set);
  }, [food.newCategories, gear.newCategories]);

  /* ── cascade handlers ── */

  async function handleRenameCategory(oldName: string, newName: string) {
    await Promise.all([
      food.handleRenameCategory(oldName, newName),
      gear.handleRenameCategory(oldName, newName),
    ]);
  }

  async function handleClearCategory(cat: string) {
    await Promise.all([
      food.handleClearCategory(cat),
      gear.handleClearCategory(cat),
    ]);
  }

  function addNewCategory(name: string) {
    food.addNewCategory(name);
    gear.addNewCategory(name);
  }
  function removeNewCategory(name: string) {
    food.removeNewCategory(name);
    gear.removeNewCategory(name);
  }
  function renameNewCategory(oldName: string, newName: string) {
    food.renameNewCategory(oldName, newName);
    gear.renameNewCategory(oldName, newName);
  }

  function submitAddNewCategory() {
    addNewCategory(newCatInput);
    setNewCatInput("");
  }

  /* ── counts ── */

  const totalCount = food.items.length + gear.items.length;
  const foodCount = food.items.length;
  const gearCount = gear.items.length;
  const purchasedCount = food.items.filter((i) => i.isPurchased).length;
  const needsHelpCount = food.needsHelpCount + gear.needsHelpCount;
  const myCount = food.myCount + gear.myCount;

  /* ── loading ── */

  if (food.loading || gear.loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );
  }

  /* ── bulk-import callbacks (cast for shape compatibility) ── */
  const foodBulkAdd = food.handleBulkAdd as unknown as (
    rows: BulkImportRow[]
  ) => Promise<void>;
  const gearBulkAdd = gear.handleBulkAdd as unknown as (
    rows: BulkImportRow[]
  ) => Promise<void>;

  /* ── render ── */

  const filterLabel = (f: Filter, count: number): ReactNode => {
    switch (f) {
      case "all":
        return `All (${count})`;
      case "needs-help":
        return `Needs Help (${count})`;
      case "mine":
        return `My Items (${count})`;
      case "food":
        return `Food (${count})`;
      case "gear":
        return `Gear (${count})`;
    }
  };

  const filterCount = (f: Filter): number => {
    switch (f) {
      case "all":
        return totalCount;
      case "needs-help":
        return needsHelpCount;
      case "mine":
        return myCount;
      case "food":
        return foodCount;
      case "gear":
        return gearCount;
    }
  };

  const sectionShared = {
    isOrganizer,
    familyId,
    families: food.families,
    categoryOptions,
    food,
    gear,
  };

  return (
    <div className="space-y-6">
      <datalist id={DATALIST_ID}>
        {allSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Bring List</h2>
          {familyId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Import List
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setImportOpen("food")}>
                  <Package className="h-4 w-4" />
                  Import food list
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportOpen("gear")}>
                  <Backpack className="h-4 w-4" />
                  Import gear list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {totalCount} item{totalCount !== 1 && "s"}
          {foodCount > 0 && ` · ${foodCount} food`}
          {gearCount > 0 && ` · ${gearCount} gear`}
          {purchasedCount > 0 && ` · ${purchasedCount} purchased`}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(["all", "needs-help", "mine", "food", "gear"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {filterLabel(f, filterCount(f))}
          </Button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState
          icon={Package}
          title="Nothing to bring yet"
          description={
            filter !== "all"
              ? "No items match this filter."
              : "Add food and gear below!"
          }
        />
      )}

      {/* Category sections */}
      {categoryOrder.map((cat) => (
        <BringCategorySection
          key={cat}
          category={cat}
          items={byCategory[cat]}
          {...sectionShared}
          onRename={(newName) => handleRenameCategory(cat, newName)}
          onClear={() => handleClearCategory(cat)}
        />
      ))}

      {/* New (empty) categories */}
      {newCategories.map((cat) =>
        !categoryOrder.includes(cat) ? (
          <BringCategorySection
            key={`new-${cat}`}
            category={cat}
            items={[]}
            {...sectionShared}
            onRename={(newName) => renameNewCategory(cat, newName)}
            onClear={() => removeNewCategory(cat)}
          />
        ) : null
      )}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <BringCategorySection
          key="__uncategorized__"
          category=""
          items={uncategorized}
          {...sectionShared}
        />
      )}

      {/* Add Category */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitAddNewCategory();
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

      {/* Paste-import dialogs (one per kind) */}
      <PasteImportDialog
        open={importOpen === "food"}
        onOpenChange={(open) => !open && setImportOpen(null)}
        onImport={foodBulkAdd}
        title="Import Food List"
        placeholder={
          "Breakfast: Milk, Tea, Coffee, Sugar\nLunch/Dinner: Chicken, Rice, Oil\nDrinks: Beer, Wine, Water"
        }
      />
      <PasteImportDialog
        open={importOpen === "gear"}
        onOpenChange={(open) => !open && setImportOpen(null)}
        onImport={gearBulkAdd}
        title="Import Gear List"
        placeholder={
          "Cookwares: Pots, Pans, Pressure Cooker\nUtensils: Plates, Cups, Spoons, Forks\nCampfire: Lighter, Fire Wood, Marshmallow sticks"
        }
      />

      {/* Confirmation dialogs — one pair per kind */}
      <ConfirmDeleteDialog
        open={food.pendingDeleteId !== null}
        title="Delete grocery item?"
        description="This will permanently remove the item and any volunteer assignments."
        onConfirm={food.confirmDelete}
        onCancel={food.cancelDelete}
      />
      <ConfirmDeleteDialog
        open={gear.pendingDeleteId !== null}
        title="Delete equipment item?"
        description="This will permanently remove the item and any volunteer assignments."
        onConfirm={gear.confirmDelete}
        onCancel={gear.cancelDelete}
      />
      <ConfirmDeleteDialog
        open={food.pendingUnvolunteerItemId !== null}
        title="Remove yourself?"
        description="This will remove you as a volunteer for this grocery item."
        confirmLabel="Remove"
        onConfirm={food.confirmUnvolunteer}
        onCancel={food.cancelUnvolunteer}
      />
      <ConfirmDeleteDialog
        open={gear.pendingUnvolunteerItemId !== null}
        title="Remove yourself?"
        description="This will remove you as a volunteer for this equipment item."
        confirmLabel="Remove"
        onConfirm={gear.confirmUnvolunteer}
        onCancel={gear.cancelUnvolunteer}
      />
    </div>
  );
}
