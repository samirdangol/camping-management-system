"use client";

import { useState } from "react";
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
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { EQUIPMENT_CATEGORY_SUGGESTIONS } from "@/lib/constants";
import { Backpack, Plus } from "lucide-react";
import { ClaimablePage } from "@/components/claimable/claimable-page";
import { ItemEditCard } from "@/components/claimable/item-edit-card";
import type {
  ClaimableActions,
  ClaimableOwnership,
} from "@/components/claimable/use-claimable-items";
import type { EquipmentWithOwner } from "@/types";

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

  return (
    <ClaimablePage<EquipmentWithOwner, EquipmentBulkRow, EquipmentEditVals>
      eventId={eid}
      familyId={familyId}
      isOrganizer={isOrganizer}
      actions={equipmentActions}
      ownership={equipmentOwnership}
      title="Supplies & Gear"
      datalistId={DATALIST_ID}
      emptyIcon={Backpack}
      emptyTitle="No supplies or gear listed"
      emptyDescription="Add supplies and gear below!"
      filterLabels={{
        all: (n) => `All (${n})`,
        needsHelp: (n) => `Needs Owner (${n})`,
        mine: (n) => `My Items (${n})`,
      }}
      categorySuggestions={EQUIPMENT_CATEGORY_SUGGESTIONS}
      importTitle="Import Equipment"
      importPlaceholder={
        "Cookwares: Pots, Pans, Pressure Cooker\nUtensils: Plates, Cups, Spoons, Forks\nCampfire: Lighter, Fire Wood, Marshmallow sticks"
      }
      deleteDialogTitle="Delete equipment item?"
      deleteDialogDescription="This will permanently remove the item and any volunteer assignments."
      unvolunteerDialogDescription="This will remove you as a volunteer for this equipment item."
      renderBody={(item) => <EquipmentItemBody item={item} />}
      renderEditor={(item, onSave, onCancel) => (
        <EquipmentItemEditor item={item} onSave={onSave} onCancel={onCancel} />
      )}
      renderQuickAdd={({ category, displayName, onAdd }) => (
        <EquipmentQuickAddRow
          category={category}
          displayName={displayName}
          onAdd={onAdd}
        />
      )}
    />
  );
}
