"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { GROCERY_CATEGORY_SUGGESTIONS } from "@/lib/constants";
import { ShoppingCart, Plus } from "lucide-react";
import { ClaimablePage } from "@/components/claimable/claimable-page";
import {
  groceryActions,
  groceryOwnership,
  GroceryItemBody,
  GroceryItemEditor,
  type GroceryBulkRow,
  type GroceryEditVals,
} from "@/components/claimable/grocery-domain";
import type { GroceryWithFamily } from "@/types";

const DATALIST_ID = "grocery-cat-suggestions";

/** Standalone-page inline quick-add row (name + free-text note). */
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
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await onAdd({
      name: name.trim(),
      category: category || undefined,
      notes: note.trim() || undefined,
    });
    setName("");
    setNote("");
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
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="h-8 text-sm w-32"
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
      categorySuggestions={GROCERY_CATEGORY_SUGGESTIONS}
      importTitle="Import Groceries"
      importPlaceholder={
        "Breakfast: Milk, Tea, Coffee, Sugar\nLunch/Dinner: Chicken, Rice, Oil\nDrinks: Beer, Wine, Water"
      }
      deleteDialogTitle="Delete grocery item?"
      deleteDialogDescription="This will permanently remove the item and any volunteer assignments."
      unvolunteerDialogDescription="This will remove you as a volunteer for this grocery item."
      renderBody={(item) => <GroceryItemBody item={item} />}
      renderEditor={(item, onSave, onCancel) => (
        <GroceryItemEditor
          item={item}
          datalistId={DATALIST_ID}
          onSave={onSave}
          onCancel={onCancel}
        />
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
