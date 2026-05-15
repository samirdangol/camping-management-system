"use client";

import { useState, useMemo } from "react";
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
import type { Family, EquipmentWithOwner } from "@/types";

/* ─── helpers ─── */

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DATALIST_ID = "equip-cat-suggestions";

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

/* ─── per-domain render slots ─── */

function EquipmentItemBody({ item }: { item: EquipmentWithOwner }) {
  return (
    <>
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

function EquipmentItemEditor({
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

/* ─── Main Page ─── */

export default function EquipmentPage() {
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
  } = useClaimableItems<
    EquipmentWithOwner,
    EquipmentBulkRow,
    EquipmentEditVals
  >({
    eventId: eid,
    familyId,
    actions: equipmentActions,
    ownership: equipmentOwnership,
  });

  const allSuggestions = useMemo(() => {
    const set = new Set(existingCategories.map((c) => c.toLowerCase()));
    const extra = EQUIPMENT_CATEGORY_SUGGESTIONS.filter(
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
                ? `Needs Owner (${needsHelpCount})`
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
        title="Import Equipment"
        placeholder={"Cookwares: Pots, Pans, Pressure Cooker\nUtensils: Plates, Cups, Spoons, Forks\nCampfire: Lighter, Fire Wood, Marshmallow sticks"}
      />

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        title="Delete equipment item?"
        description="This will permanently remove the item and any volunteer assignments."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <ConfirmDeleteDialog
        open={pendingUnvolunteerItemId !== null}
        title="Remove yourself?"
        description="This will remove you as a volunteer for this equipment item."
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
  onUnvolunteer: (id: number) => void;
  onSaveEdit: (id: number, vals: EquipmentEditVals) => Promise<void>;
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
            <ItemCardShell<EquipmentWithOwner, EquipmentEditVals>
              key={item.id}
              item={item}
              families={families}
              familyId={familyId}
              isOrganizer={isOrganizer}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              categoryOptions={categoryOptions}
              ownership={equipmentOwnership}
              onDelete={onDelete}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
              onOrganizerAssign={onOrganizerAssign}
              onUnvolunteer={onUnvolunteer}
              onSaveEdit={onSaveEdit}
              onReorder={(dir) => onReorder(item.id, dir, category || undefined)}
              onMoveCategory={onMoveCategory}
              renderBody={(it) => <EquipmentItemBody item={it} />}
              renderEditor={(it, onSave, onCancel) => (
                <EquipmentItemEditor
                  item={it}
                  onSave={onSave}
                  onCancel={onCancel}
                />
              )}
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
