"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { SUPPLY_CATEGORY_SUGGESTIONS } from "@/lib/constants";
import { Package, Plus } from "lucide-react";
import { ClaimablePage } from "@/components/claimable/claimable-page";
import {
  supplyActions,
  supplyOwnership,
  SupplyItemBody,
  SupplyItemEditor,
  type SupplyBulkRow,
  type SupplyEditVals,
} from "@/components/claimable/supply-domain";
import type { SupplyWithFamily } from "@/types";

const DATALIST_ID = "supply-cat-suggestions";

function SupplyQuickAddRow({
  category,
  displayName,
  onAdd,
}: {
  category: string;
  displayName: string;
  onAdd: (row: SupplyBulkRow) => Promise<void>;
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

export default function SuppliesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId, 10);
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);

  return (
    <ClaimablePage<SupplyWithFamily, SupplyBulkRow, SupplyEditVals>
      eventId={eid}
      familyId={familyId}
      isOrganizer={isOrganizer}
      actions={supplyActions}
      ownership={supplyOwnership}
      title="Supplies"
      datalistId={DATALIST_ID}
      emptyIcon={Package}
      emptyTitle="No supplies yet"
      emptyDescription="Add food and gear below — categorize as you go."
      filterLabels={{
        all: (n) => `All (${n})`,
        needsHelp: (n) => `Needs Help (${n})`,
        mine: (n) => `My Items (${n})`,
      }}
      categorySuggestions={SUPPLY_CATEGORY_SUGGESTIONS}
      importTitle="Import Supplies"
      importPlaceholder={
        "Breakfast: Milk, Tea, Coffee, Sugar\n" +
        "Lunch/Dinner: Chicken, Rice, Oil\n" +
        "Cookwares: Pots, Pans, Pressure Cooker\n" +
        "Campfire: Lighter, Fire Wood, Marshmallow sticks"
      }
      deleteDialogTitle="Delete supply item?"
      deleteDialogDescription="This will permanently remove the item and any volunteer assignments."
      unvolunteerDialogDescription="This will remove you as a volunteer for this supply item."
      renderBody={(item) => <SupplyItemBody item={item} />}
      renderEditor={(item, onSave, onCancel) => (
        <SupplyItemEditor
          item={item}
          datalistId={DATALIST_ID}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
      renderQuickAdd={({ category, displayName, onAdd }) => (
        <SupplyQuickAddRow
          category={category}
          displayName={displayName}
          onAdd={onAdd}
        />
      )}
    />
  );
}
