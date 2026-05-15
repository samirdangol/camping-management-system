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
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { EQUIPMENT_CATEGORY_SUGGESTIONS } from "@/lib/constants";
import {
  Backpack,
  Plus,
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
import { ClaimableCategorySection } from "@/components/claimable/category-section";
import { ItemEditCard } from "@/components/claimable/item-edit-card";
import type { EquipmentWithOwner } from "@/types";

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

function EquipmentQuickAddRow({
  category,
  displayName,
  onAdd,
}: {
  category: string;
  displayName: string;
  onAdd: (row: EquipmentBulkRow) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await onAdd({
      name: name.trim(),
      category: category || undefined,
      quantity: parseInt(qty) || 1,
      notes: notes.trim() || undefined,
    });
    setName("");
    setQty("1");
    setNotes("");
    setAdding(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`Add item to ${displayName}...`}
        className="h-8 text-sm flex-1"
      />
      <Input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Qty"
        className="h-8 text-sm w-16"
      />
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="h-8 text-sm w-28"
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

  const sectionShared = {
    families,
    familyId,
    isOrganizer,
    categoryOptions,
    ownership: equipmentOwnership,
    onDelete: handleDelete,
    onClaim: handleClaim,
    onUnclaim: handleUnclaim,
    onOrganizerAssign: handleOrganizerAssign,
    onUnvolunteer: handleUnvolunteer,
    onSaveEdit: handleSaveEdit,
    onBulkAdd: handleBulkAdd,
    onReorder: handleReorder,
    onMoveCategory: handleMoveCategory,
    renderBody: (it: EquipmentWithOwner) => <EquipmentItemBody item={it} />,
    renderEditor: (
      it: EquipmentWithOwner,
      onSave: (vals: EquipmentEditVals) => Promise<void>,
      onCancel: () => void
    ) => (
      <EquipmentItemEditor item={it} onSave={onSave} onCancel={onCancel} />
    ),
    renderQuickAdd: ({
      category,
      displayName,
      onAdd,
    }: {
      category: string;
      displayName: string;
      onAdd: (row: EquipmentBulkRow) => Promise<void>;
    }) => (
      <EquipmentQuickAddRow
        category={category}
        displayName={displayName}
        onAdd={onAdd}
      />
    ),
  };

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
        <ClaimableCategorySection<EquipmentWithOwner, EquipmentBulkRow, EquipmentEditVals>
          key={cat}
          category={cat}
          items={grouped[cat]}
          {...sectionShared}
          onRename={(newName) => handleRenameCategory(cat, newName)}
          onClear={() => handleClearCategory(cat)}
        />
      ))}

      {/* New (empty) categories */}
      {newCategories.map((cat) =>
        !categoryOrder.includes(cat) ? (
          <ClaimableCategorySection<EquipmentWithOwner, EquipmentBulkRow, EquipmentEditVals>
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
        <ClaimableCategorySection<EquipmentWithOwner, EquipmentBulkRow, EquipmentEditVals>
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

