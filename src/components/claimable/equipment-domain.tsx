"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
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
  setEquipmentOrder,
} from "@/app/actions";
import { ItemEditCard } from "./item-edit-card";
import type {
  ClaimableActions,
  ClaimableOwnership,
} from "./use-claimable-items";
import type { EquipmentWithOwner } from "@/types";

/* ─── types ─── */

export type EquipmentBulkRow = {
  name: string;
  category?: string;
  quantity?: number;
  notes?: string;
};

export type EquipmentEditVals = {
  name?: string;
  category?: string;
  quantity?: number;
  notes?: string;
};

/* ─── action / ownership bundles ─── */

export const equipmentActions: ClaimableActions<
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
  bulkReorder: setEquipmentOrder,
  renameCategory: renameEquipmentCategory,
  clearCategory: clearEquipmentCategory,
};

export const equipmentOwnership: ClaimableOwnership<EquipmentWithOwner> = {
  getOwnerFamilyId: (i) => i.ownerFamilyId,
  getOwnerLabel: (i) => i.ownerLabel,
  getOwner: (i) => i.owner,
};

/* ─── display body ─── */

export function EquipmentItemBody({ item }: { item: EquipmentWithOwner }) {
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

/* ─── edit form ─── */

export function EquipmentItemEditor({
  item,
  datalistId,
  onSave,
  onCancel,
}: {
  item: EquipmentWithOwner;
  datalistId: string;
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
        list={datalistId}
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
