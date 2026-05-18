"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  bulkCreateGroceryItems,
  updateGroceryItem,
  deleteGroceryItem,
  claimGroceryItem,
  unclaimGroceryItem,
  addGroceryVolunteer,
  removeGroceryVolunteer,
  renameGroceryCategory,
  clearGroceryCategory,
  reorderGroceryItem,
  setGroceryOrder,
} from "@/app/actions";
import { ItemEditCard } from "./item-edit-card";
import type {
  ClaimableActions,
  ClaimableOwnership,
} from "./use-claimable-items";
import type { GroceryWithFamily } from "@/types";

/* ─── types ─── */

export type GroceryBulkRow = {
  name: string;
  category?: string;
  estimatedCost?: number;
  mealTag?: string;
  notes?: string;
};

export type GroceryEditVals = {
  name?: string;
  category?: string;
  estimatedCost?: number | null;
  mealTag?: string | null;
  notes?: string | null;
};

/* ─── action / ownership bundles ─── */

export const groceryActions: ClaimableActions<
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
  bulkReorder: setGroceryOrder,
  renameCategory: renameGroceryCategory,
  clearCategory: clearGroceryCategory,
};

export const groceryOwnership: ClaimableOwnership<GroceryWithFamily> = {
  getOwnerFamilyId: (i) => i.assignedFamilyId,
  getOwnerLabel: (i) => i.assignedLabel,
  getOwner: (i) => i.assignedTo,
};

/* ─── display body ─── */

export function GroceryItemBody({ item }: { item: GroceryWithFamily }) {
  return (
    <>
      <span className="text-sm font-medium">{item.name}</span>
      {item.notes && (
        <span className="text-xs text-muted-foreground italic">
          {item.notes}
        </span>
      )}
      {item.mealTag && (
        <Badge className="text-[10px] px-1.5 py-0 bg-purple-900/40 text-purple-300 hover:bg-purple-900/50">
          {item.mealTag}
        </Badge>
      )}
    </>
  );
}

/* ─── edit form ─── */

export function GroceryItemEditor({
  item,
  datalistId,
  onSave,
  onCancel,
}: {
  item: GroceryWithFamily;
  datalistId: string;
  onSave: (vals: GroceryEditVals) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category || "");
  const [notes, setNotes] = useState(item.notes || "");
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
      notes: notes.trim() || null,
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
        list={datalistId}
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
        type="number"
        step="0.01"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        placeholder="Est. cost"
        className="h-8 text-sm"
      />
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Note (qty, brand, etc.)"
        className="h-8 text-sm col-span-2 sm:col-span-4"
      />
    </ItemEditCard>
  );
}
