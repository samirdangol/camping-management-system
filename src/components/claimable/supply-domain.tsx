"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  bulkCreateSupplies,
  updateSupply,
  deleteSupply,
  claimSupply,
  unclaimSupply,
  addSupplyVolunteer,
  removeSupplyVolunteer,
  renameSupplyCategory,
  clearSupplyCategory,
  restoreSupplyCategory,
  setSupplyOrder,
} from "@/app/actions";
import { ItemEditCard } from "./item-edit-card";
import type {
  ClaimableActions,
  ClaimableOwnership,
} from "./use-claimable-items";
import type { SupplyWithFamily } from "@/types";

export type SupplyBulkRow = {
  name: string;
  category?: string;
  notes?: string;
};

export type SupplyEditVals = {
  name?: string;
  category?: string;
  notes?: string | null;
};

export const supplyActions: ClaimableActions<
  SupplyWithFamily,
  SupplyBulkRow,
  SupplyEditVals
> = {
  fetchItems: (eventId) =>
    fetch(`/api/events/${eventId}/supplies`).then((r) => r.json()),
  claim: claimSupply,
  unclaim: unclaimSupply,
  delete: deleteSupply,
  addVolunteer: addSupplyVolunteer,
  removeVolunteer: removeSupplyVolunteer,
  update: updateSupply,
  bulkCreate: bulkCreateSupplies,
  bulkReorder: setSupplyOrder,
  renameCategory: renameSupplyCategory,
  clearCategory: clearSupplyCategory,
  restoreCategory: restoreSupplyCategory,
};

export const supplyOwnership: ClaimableOwnership<SupplyWithFamily> = {
  getOwnerFamilyId: (i) => i.assignedFamilyId,
  getOwnerLabel: (i) => i.assignedLabel,
  getOwner: (i) => i.assignedTo,
};

export function SupplyItemBody({ item }: { item: SupplyWithFamily }) {
  return (
    <>
      <span className="text-sm font-medium">{item.name}</span>
      {item.notes && (
        <span className="text-xs text-muted-foreground italic">
          {item.notes}
        </span>
      )}
    </>
  );
}

export function SupplyItemEditor({
  item,
  datalistId,
  onSave,
  onCancel,
}: {
  item: SupplyWithFamily;
  datalistId: string;
  onSave: (vals: SupplyEditVals) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setBusy(true);
    await onSave({
      name: name.trim(),
      category: category.trim() || undefined,
      notes: notes.trim() || null,
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
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Note (qty, brand, condition, etc.)"
        className="h-8 text-sm col-span-2 sm:col-span-3"
      />
    </ItemEditCard>
  );
}
