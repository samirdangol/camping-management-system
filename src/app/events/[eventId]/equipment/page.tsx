"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { EQUIPMENT_CATEGORY_SUGGESTIONS } from "@/lib/constants";
import { Backpack, Plus } from "lucide-react";
import { ClaimablePage } from "@/components/claimable/claimable-page";
import {
  equipmentActions,
  equipmentOwnership,
  EquipmentItemBody,
  EquipmentItemEditor,
  type EquipmentBulkRow,
  type EquipmentEditVals,
} from "@/components/claimable/equipment-domain";
import type { EquipmentWithOwner } from "@/types";

const DATALIST_ID = "equip-cat-suggestions";

/** Standalone-page inline quick-add row (name + free-text note). */
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
        <EquipmentItemEditor
          item={item}
          datalistId={DATALIST_ID}
          onSave={onSave}
          onCancel={onCancel}
        />
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
