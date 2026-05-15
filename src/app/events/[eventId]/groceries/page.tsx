"use client";

import { useState } from "react";
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
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { GROCERY_CATEGORY_SUGGESTIONS } from "@/lib/constants";
import { ShoppingCart, Plus } from "lucide-react";
import { ClaimablePage } from "@/components/claimable/claimable-page";
import { ItemEditCard } from "@/components/claimable/item-edit-card";
import type {
  ClaimableActions,
  ClaimableOwnership,
} from "@/components/claimable/use-claimable-items";
import type { GroceryWithFamily } from "@/types";

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

function GroceryQuickAddRow({
  category,
  displayName,
  onAdd,
}: {
  category: string;
  displayName: string;
  onAdd: (row: GroceryBulkRow) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await onAdd({
      name: name.trim(),
      category: category || undefined,
      quantity: qty || undefined,
    });
    setName("");
    setQty("");
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

/* ─── Main Page ─── */

export default function GroceriesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId, 10);
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);

  return (
    <ClaimablePage<GroceryWithFamily, GroceryBulkRow, GroceryEditVals>
      eventId={eid}
      familyId={familyId}
      isOrganizer={isOrganizer}
      actions={groceryActions}
      ownership={groceryOwnership}
      title="Groceries"
      datalistId={DATALIST_ID}
      emptyIcon={ShoppingCart}
      emptyTitle="No grocery items"
      emptyDescription="Add grocery items below!"
      filterLabels={{
        all: (n) => `All (${n})`,
        needsHelp: (n) => `Needs Help (${n})`,
        mine: (n) => `My Items (${n})`,
      }}
      renderItemCountExtra={(items) => {
        const purchased = items.filter((i) => i.isPurchased).length;
        return purchased > 0 ? ` · ${purchased} purchased` : null;
      }}
      categorySuggestions={GROCERY_CATEGORY_SUGGESTIONS}
      importTitle="Import Groceries"
      importPlaceholder={
        "Breakfast: Milk, Tea, Coffee, Sugar\nLunch/Dinner: Chicken, Rice, Oil\nDrinks: Beer, Wine, Water"
      }
      deleteDialogTitle="Delete grocery item?"
      deleteDialogDescription="This will permanently remove the item and any volunteer assignments."
      unvolunteerDialogDescription="This will remove you as a volunteer for this grocery item."
      renderLeading={(item, refetch) => (
        <Checkbox
          checked={item.isPurchased}
          onCheckedChange={async () => {
            await toggleGroceryPurchased(item.id, eid, !item.isPurchased);
            await refetch();
          }}
          className="shrink-0"
        />
      )}
      renderBody={(item) => <GroceryItemBody item={item} />}
      renderEditor={(item, onSave, onCancel) => (
        <GroceryItemEditor item={item} onSave={onSave} onCancel={onCancel} />
      )}
      renderQuickAdd={({ category, displayName, onAdd }) => (
        <GroceryQuickAddRow
          category={category}
          displayName={displayName}
          onAdd={onAdd}
        />
      )}
    />
  );
}
