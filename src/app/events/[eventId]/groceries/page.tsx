"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
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
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  ClipboardPaste,
} from "lucide-react";
import { PasteImportDialog } from "@/components/bulk-import/paste-import-dialog";
import { CategoryBulkAdd } from "@/components/bulk-import/category-bulk-add";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import {
  useClaimableItems,
  type ClaimableActions,
  type ClaimableOwnership,
} from "@/components/claimable/use-claimable-items";
import { ItemCardShell } from "@/components/claimable/item-card-shell";
import { ItemEditCard } from "@/components/claimable/item-edit-card";
import type { Family, GroceryWithFamily } from "@/types";

/* ─── helpers ─── */

/** Capitalize first letter */
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Unique datalist id for category inputs */
const DATALIST_ID = "grocery-cat-suggestions";

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

// Stable action/ownership bundles — declared at module scope so the hook's
// internal refs don't churn between renders.
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

/* ─── per-domain render slots ─── */

function GroceryItemBody({ item }: { item: GroceryWithFamily }) {
  return (
    <>
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

function GroceryItemEditor({
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

/* ─── Main Page ─── */

export default function GroceriesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId, 10);
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);
  const [newCatInput, setNewCatInput] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const {
    items,
    families,
    loading,
    filtered,
    grouped,
    categoryOrder,
    uncategorized,
    existingCategories,
    categoryOptions,
    needsHelpCount,
    myCount,
    filter,
    setFilter,
    newCategories,
    addNewCategory,
    removeNewCategory,
    renameNewCategory,
    pendingDeleteId,
    pendingUnvolunteerItemId,
    cancelDelete,
    cancelUnvolunteer,
    handleDelete,
    confirmDelete,
    handleClaim,
    handleUnclaim,
    handleOrganizerAssign,
    handleUnvolunteer,
    confirmUnvolunteer,
    handleSaveEdit,
    handleMoveCategory,
    handleBulkAdd,
    handleReorder,
    handleRenameCategory,
    handleClearCategory,
    refetch,
  } = useClaimableItems<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>({
    eventId: eid,
    familyId,
    actions: groceryActions,
    ownership: groceryOwnership,
  });

  // Grocery-only: toggle the "purchased" checkbox.
  async function handleTogglePurchased(itemId: number, current: boolean) {
    await toggleGroceryPurchased(itemId, eid, !current);
    await refetch();
  }

  // Suggestion list (existing categories + defaults) is grocery-specific.
  const allSuggestions = useMemo(() => {
    const set = new Set(existingCategories.map((c) => c.toLowerCase()));
    const extra = GROCERY_CATEGORY_SUGGESTIONS.filter(
      (s) => !set.has(s.toLowerCase())
    ).map(cap);
    return [...existingCategories, ...extra];
  }, [existingCategories]);

  function submitAddNewCategory() {
    addNewCategory(newCatInput);
    setNewCatInput("");
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
          <h2 className="text-lg font-semibold">Groceries</h2>
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
          {items.filter((i) => i.isPurchased).length > 0 &&
            ` · ${items.filter((i) => i.isPurchased).length} purchased`}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "needs-help", "mine"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? `All (${items.length})`
              : f === "needs-help"
                ? `Needs Help (${needsHelpCount})`
                : `My Items (${myCount})`}
          </Button>
        ))}
      </div>

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
          categoryOptions={categoryOptions}
          onDelete={handleDelete}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onOrganizerAssign={handleOrganizerAssign}
          onTogglePurchased={handleTogglePurchased}
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
        // Only show if not already in the real category list
        !categoryOrder.includes(cat) ? (
          <CategorySection
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
            onTogglePurchased={handleTogglePurchased}
              onUnvolunteer={handleUnvolunteer}
            onSaveEdit={handleSaveEdit}
            onBulkAdd={handleBulkAdd}
            onReorder={handleReorder}
            onMoveCategory={handleMoveCategory}
            onRename={(newName) => renameNewCategory(cat, newName)}
            onClear={() => removeNewCategory(cat)}
          />
        ) : null
      )}

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
          categoryOptions={categoryOptions}
          onDelete={handleDelete}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onOrganizerAssign={handleOrganizerAssign}
          onTogglePurchased={handleTogglePurchased}
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
        title="Import Groceries"
        placeholder={"Breakfast: Milk, Tea, Coffee, Sugar\nLunch/Dinner: Chicken, Rice, Oil\nDrinks: Beer, Wine, Water"}
      />

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        title="Delete grocery item?"
        description="This will permanently remove the item and any volunteer assignments."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <ConfirmDeleteDialog
        open={pendingUnvolunteerItemId !== null}
        title="Remove yourself?"
        description="This will remove you as a volunteer for this grocery item."
        confirmLabel="Remove"
        onConfirm={confirmUnvolunteer}
        onCancel={cancelUnvolunteer}
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
  categoryOptions,
  onDelete,
  onClaim,
  onUnclaim,
  onOrganizerAssign,
  onTogglePurchased,
  onUnvolunteer,
  onSaveEdit,
  onBulkAdd,
  onReorder,
  onMoveCategory,
  onRename,
  onClear,
}: {
  category: string;
  items: GroceryWithFamily[];
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  allSuggestions: string[];
  categoryOptions: string[];
  onDelete: (id: number) => void | Promise<void>;
  onClaim: (id: number) => Promise<void>;
  onUnclaim: (id: number) => Promise<void>;
  onOrganizerAssign: (id: number, familyId: number | null, label?: string) => Promise<void>;
  onTogglePurchased: (id: number, current: boolean) => Promise<void>;
  onUnvolunteer: (id: number) => void;
  onSaveEdit: (id: number, vals: GroceryEditVals) => Promise<void>;
  onReorder: (id: number, direction: "up" | "down", category?: string) => Promise<void>;
  onMoveCategory: (id: number, newCategory: string) => Promise<void>;
  onBulkAdd: (
    rows: {
      name: string;
      category?: string;
      quantity?: string;
      estimatedCost?: number;
      mealTag?: string;
    }[]
  ) => Promise<void>;
  onRename?: (newName: string) => void;
  onClear?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState("");
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(category);

  const claimed = items.filter(
    (i) => i.assignedFamilyId || i.assignedLabel || i.volunteers.length > 0
  ).length;
  const displayName = category || "Uncategorized";
  const isUncategorized = !category;

  async function handleQuickAdd() {
    if (!addName.trim()) return;
    setAdding(true);
    await onBulkAdd([
      {
        name: addName.trim(),
        category: category || undefined,
        quantity: addQty || undefined,
      },
    ]);
    setAddName("");
    setAddQty("");
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
            <ItemCardShell<GroceryWithFamily, GroceryEditVals>
              key={item.id}
              item={item}
              families={families}
              familyId={familyId}
              isOrganizer={isOrganizer}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              categoryOptions={categoryOptions}
              ownership={groceryOwnership}
              onDelete={onDelete}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
              onOrganizerAssign={onOrganizerAssign}
              onUnvolunteer={onUnvolunteer}
              onSaveEdit={onSaveEdit}
              onReorder={(dir) => onReorder(item.id, dir, category || undefined)}
              onMoveCategory={onMoveCategory}
              renderLeading={(it) => (
                <Checkbox
                  checked={it.isPurchased}
                  onCheckedChange={() => onTogglePurchased(it.id, it.isPurchased)}
                  className="shrink-0"
                />
              )}
              renderBody={(it) => <GroceryItemBody item={it} />}
              renderEditor={(it, onSave, onCancel) => (
                <GroceryItemEditor item={it} onSave={onSave} onCancel={onCancel} />
              )}
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
