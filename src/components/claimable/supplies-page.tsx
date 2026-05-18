"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toggleGroceryPurchased } from "@/app/actions";
import type { SortOrderUpdate } from "./use-claimable-items";
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
import {
  useClaimableItems,
  type ClaimableFilter,
} from "./use-claimable-items";
import {
  groceryActions,
  groceryOwnership,
  GroceryItemBody,
  GroceryItemEditor,
  type GroceryBulkRow,
  type GroceryEditVals,
} from "./grocery-domain";
import {
  equipmentActions,
  equipmentOwnership,
  EquipmentItemBody,
  EquipmentItemEditor,
  type EquipmentBulkRow,
  type EquipmentEditVals,
} from "./equipment-domain";
import type { ReactNode } from "react";
import type { GroceryWithFamily, EquipmentWithOwner } from "@/types";

const DATALIST_ID = "supplies-cat-suggestions";

type SupplyItem =
  | { kind: "food"; item: GroceryWithFamily }
  | { kind: "gear"; item: EquipmentWithOwner };

type Filter = ClaimableFilter | "food" | "gear";

interface BulkImportRow {
  name: string;
  category?: string;
  [key: string]: unknown;
}

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ─── kind chip (prepended to body in unified view) ─── */

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

/* ─── quick-add row with kind toggle ─── */

function SuppliesQuickAdd({
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

/* ─── item row (routes per kind) ─── */

/** A stable string id for a supply item that encodes its kind. Used as
 *  the SortableContext item id so the page-level DndContext can tell food
 *  and gear apart from the drag events alone. */
function supplyDragId(si: SupplyItem): string {
  return `${si.kind}-${si.item.id}`;
}

function parseDragId(
  id: string | number | null | undefined
): { kind: "food" | "gear"; id: number } | null {
  if (typeof id !== "string") return null;
  const [kind, rest] = id.split("-", 2);
  if (kind !== "food" && kind !== "gear") return null;
  const numId = parseInt(rest, 10);
  if (Number.isNaN(numId)) return null;
  return { kind, id: numId };
}

function SupplyItemRow({
  supplyItem,
  isOrganizer,
  familyId,
  families,
  categoryOptions,
  food,
  gear,
}: {
  supplyItem: SupplyItem;
  isOrganizer: boolean;
  familyId: number | null;
  families: ReturnType<
    typeof useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>
  >["families"];
  categoryOptions: string[];
  food: ReturnType<
    typeof useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>
  >;
  gear: ReturnType<
    typeof useClaimableItems<
      EquipmentWithOwner,
      EquipmentBulkRow,
      EquipmentEditVals
    >
  >;
}) {
  const sortable = useSortable({ id: supplyDragId(supplyItem) });
  const dnd = {
    setNodeRef: sortable.setNodeRef,
    style: {
      transform: CSS.Transform.toString(sortable.transform),
      transition: sortable.transition,
    },
    attributes: sortable.attributes,
    listeners: sortable.listeners,
    isDragging: sortable.isDragging,
  };

  if (supplyItem.kind === "food") {
    const item = supplyItem.item;
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
        dnd={dnd}
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
        renderBody={(it) => (
          <>
            <KindChip kind="food" />
            <GroceryItemBody item={it} />
          </>
        )}
        renderEditor={(it, onSave, onCancel) => (
          <GroceryItemEditor
            item={it}
            datalistId={DATALIST_ID}
            onSave={onSave}
            onCancel={onCancel}
          />
        )}
      />
    );
  }

  const item = supplyItem.item;
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
      dnd={dnd}
      renderBody={(it) => (
        <>
          <KindChip kind="gear" />
          <EquipmentItemBody item={it} />
        </>
      )}
      renderEditor={(it, onSave, onCancel) => (
        <EquipmentItemEditor
          item={it}
          datalistId={DATALIST_ID}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
    />
  );
}

/* ─── category section ─── */

function SupplyCategorySection({
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
  items: SupplyItem[];
  isOrganizer: boolean;
  familyId: number | null;
  families: ReturnType<
    typeof useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>
  >["families"];
  categoryOptions: string[];
  food: ReturnType<
    typeof useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>
  >;
  gear: ReturnType<
    typeof useClaimableItems<
      EquipmentWithOwner,
      EquipmentBulkRow,
      EquipmentEditVals
    >
  >;
  onRename?: (newName: string) => void;
  onClear?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(category);

  const displayName = category || "Uncategorized";
  const isUncategorized = !category;

  const claimed = items.filter(({ kind, item }) => {
    // Branch on kind so TS narrows `item` to the right concrete shape.
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
          {/* Two adjacent SortableContexts (food, then gear) so that items
              are only sortable among their own kind. The page-level
              DndContext supplies the drag events. */}
          <SortableContext
            id={`food@@${category}`}
            items={items
              .filter((si) => si.kind === "food")
              .map(supplyDragId)}
            strategy={verticalListSortingStrategy}
          >
            {items
              .filter((si) => si.kind === "food")
              .map((bi) => (
                <SupplyItemRow
                  key={supplyDragId(bi)}
                  supplyItem={bi}
                  isOrganizer={isOrganizer}
                  familyId={familyId}
                  families={families}
                  categoryOptions={categoryOptions}
                  food={food}
                  gear={gear}
                />
              ))}
          </SortableContext>
          <SortableContext
            id={`gear@@${category}`}
            items={items
              .filter((si) => si.kind === "gear")
              .map(supplyDragId)}
            strategy={verticalListSortingStrategy}
          >
            {items
              .filter((si) => si.kind === "gear")
              .map((bi) => (
                <SupplyItemRow
                  key={supplyDragId(bi)}
                  supplyItem={bi}
                  isOrganizer={isOrganizer}
                  familyId={familyId}
                  families={families}
                  categoryOptions={categoryOptions}
                  food={food}
                  gear={gear}
                />
              ))}
          </SortableContext>

          <SuppliesQuickAdd
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

export function SuppliesPage({
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
  >({
    eventId,
    familyId,
    actions: groceryActions,
    ownership: groceryOwnership,
  });

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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Pointer needs a small distance to start a drag so clicks on the handle
  // don't immediately become drags. Touch uses a delay (long-press) so
  // scrolling the page stays primary.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(typeof e.active.id === "string" ? e.active.id : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const a = parseDragId(active.id as string);
    if (!a) return;

    // Resolve target kind + category, either from another item or from a
    // SortableContext id (drop on empty subgroup).
    let overKind: "food" | "gear" | null = null;
    let overCategory = "";
    let overItemId: number | null = null;

    const b = parseDragId(over.id as string);
    if (b) {
      overKind = b.kind;
      overItemId = b.id;
      if (b.kind === "food") {
        const item = food.items.find((i) => i.id === b.id);
        if (!item) return;
        overCategory = item.category?.trim() ?? "";
      } else {
        const item = gear.items.find((i) => i.id === b.id);
        if (!item) return;
        overCategory = item.category?.trim() ?? "";
      }
    } else if (typeof over.id === "string" && over.id.includes("@@")) {
      const [kind, cat] = over.id.split("@@", 2);
      if (kind !== "food" && kind !== "gear") return;
      overKind = kind;
      overCategory = cat;
    } else {
      return;
    }

    // Cross-kind drops snap back — food and gear live in separate tables
    // and the visual sort groups them; mixing breaks the grouping.
    if (a.kind !== overKind) return;

    const kind = a.kind;
    const list = kind === "food" ? food.items : gear.items;
    const moved = list.find((i) => i.id === a.id);
    if (!moved) return;

    const targetSubgroup = list
      .filter(
        (i) => (i.category?.trim() ?? "") === overCategory && i.id !== a.id
      )
      .sort((x, y) => x.sortOrder - y.sortOrder);

    let insertIdx = targetSubgroup.length;
    if (overItemId !== null) {
      const idx = targetSubgroup.findIndex((i) => i.id === overItemId);
      if (idx !== -1) insertIdx = idx;
    }

    const newOrder = [
      ...targetSubgroup.slice(0, insertIdx),
      moved,
      ...targetSubgroup.slice(insertIdx),
    ];

    const targetCategoryDb = overCategory || null;
    const updates: SortOrderUpdate[] = newOrder.map((item, idx) => ({
      id: item.id,
      category: targetCategoryDb,
      sortOrder: (idx + 1) * 10,
    }));

    if (kind === "food") {
      food.handleBulkReorder(updates);
    } else {
      gear.handleBulkReorder(updates);
    }
  }

  /* ── merge ── */

  const allItems = useMemo<SupplyItem[]>(
    () => [
      ...food.items.map((item) => ({ kind: "food" as const, item })),
      ...gear.items.map((item) => ({ kind: "gear" as const, item })),
    ],
    [food.items, gear.items]
  );

  /* ── filter ── */

  const filtered = useMemo<SupplyItem[]>(() => {
    return allItems.filter(({ kind, item }) => {
      if (filter === "food") return kind === "food";
      if (filter === "gear") return kind === "gear";
      if (filter === "needs-help") {
        if (kind === "food") {
          return (
            !item.assignedFamilyId &&
            !item.assignedLabel &&
            item.volunteers.length === 0
          );
        }
        return (
          !item.ownerFamilyId &&
          !item.ownerLabel &&
          item.volunteers.length === 0
        );
      }
      if (filter === "mine") {
        if (kind === "food") {
          return (
            item.assignedFamilyId === familyId ||
            item.volunteers.some((v) => v.familyId === familyId)
          );
        }
        return (
          item.ownerFamilyId === familyId ||
          item.volunteers.some((v) => v.familyId === familyId)
        );
      }
      return true;
    });
  }, [allItems, filter, familyId]);

  /* ── group by category ── */

  const { byCategory, categoryOrder, uncategorized } = useMemo(() => {
    const map: Record<string, SupplyItem[]> = {};
    const uncat: SupplyItem[] = [];
    for (const bi of filtered) {
      const cat = bi.item.category?.trim();
      if (cat) {
        if (!map[cat]) map[cat] = [];
        map[cat].push(bi);
      } else {
        uncat.push(bi);
      }
    }
    // Within a category, food first then gear, then by sortOrder.
    const sorter = (a: SupplyItem, b: SupplyItem) => {
      if (a.kind !== b.kind) return a.kind === "food" ? -1 : 1;
      return a.item.sortOrder - b.item.sortOrder;
    };
    for (const cat of Object.keys(map)) {
      map[cat].sort(sorter);
    }
    uncat.sort(sorter);
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
    const extraSet = new Set<string>();
    const dedupedExtras: string[] = [];
    for (const s of [
      ...GROCERY_CATEGORY_SUGGESTIONS,
      ...EQUIPMENT_CATEGORY_SUGGESTIONS,
    ]) {
      const lower = s.toLowerCase();
      if (!set.has(lower) && !extraSet.has(lower)) {
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

  if (food.loading || gear.loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );
  }

  // BulkRow shapes are structurally compatible with bulk-import's row type
  // but TS's strict callback variance won't accept the direct assignment.
  const foodBulkAdd = food.handleBulkAdd as unknown as (
    rows: BulkImportRow[]
  ) => Promise<void>;
  const gearBulkAdd = gear.handleBulkAdd as unknown as (
    rows: BulkImportRow[]
  ) => Promise<void>;

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
          <h2 className="text-lg font-semibold">Supplies</h2>
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
          title="No supplies yet"
          description={
            filter !== "all"
              ? "No items match this filter."
              : "Add food and gear below!"
          }
        />
      )}

      {/* Category sections — wrapped in a single DndContext so items can
          be dragged between (category, kind) subgroups. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="space-y-6">
          {categoryOrder.map((cat) => (
            <SupplyCategorySection
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
              <SupplyCategorySection
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
            <SupplyCategorySection
              key="__uncategorized__"
              category=""
              items={uncategorized}
              {...sectionShared}
            />
          )}
        </div>
        <DragOverlay>
          {activeDragId ? (
            <div className="rounded-lg border bg-card px-2.5 py-2 text-sm shadow-lg opacity-90">
              Moving…
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
