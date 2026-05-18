"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { CategoryBulkAdd } from "@/components/bulk-import/category-bulk-add";
import { PasteImportDialog } from "@/components/bulk-import/paste-import-dialog";
import { ClipboardPaste, FolderPlus, Plus } from "lucide-react";
import {
  CATEGORY_DROPZONE_PREFIX,
  ClaimableCategorySection,
} from "./category-section";
import {
  useClaimableItems,
  type ClaimableActions,
  type ClaimableItem,
  type ClaimableOwnership,
  type SortOrderUpdate,
} from "./use-claimable-items";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface BulkImportRow {
  name: string;
  category?: string;
  [key: string]: unknown;
}

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface ClaimablePageProps<
  T extends ClaimableItem,
  BulkRow extends { name: string; category?: string },
  EditVals extends { category?: string | null }
> {
  /* identity */
  eventId: number;
  familyId: number | null;
  isOrganizer: boolean;

  /* data layer */
  actions: ClaimableActions<T, BulkRow, EditVals>;
  ownership: ClaimableOwnership<T>;

  /* labels / copy */
  title: string;
  datalistId: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  filterLabels: {
    all: (count: number) => string;
    needsHelp: (count: number) => string;
    mine: (count: number) => string;
  };
  /** Optional suffix in the item count (e.g. "· N purchased" for groceries). */
  renderItemCountExtra?: (items: T[]) => ReactNode;
  /** Default category suggestions merged with existing categories for the datalist. */
  categorySuggestions: readonly string[];

  /* bulk import dialog copy */
  importTitle: string;
  importPlaceholder: string;

  /* confirm dialog copy */
  deleteDialogTitle: string;
  deleteDialogDescription: string;
  unvolunteerDialogDescription: string;

  /* render slots (forwarded to ClaimableCategorySection / ItemCardShell) */
  renderLeading?: (item: T, refetch: () => Promise<void>) => ReactNode;
  renderBody: (item: T) => ReactNode;
  renderEditor: (
    item: T,
    onSave: (vals: EditVals) => Promise<void>,
    onCancel: () => void
  ) => ReactNode;
  renderQuickAdd: (params: {
    category: string;
    displayName: string;
    onAdd: (row: BulkRow) => Promise<void>;
  }) => ReactNode;
}

/**
 * The full page shell for a claimable-item list (groceries / equipment).
 * Owns the data fetch (via useClaimableItems), header, filters, category
 * sections, "Add category" form, bulk import wiring, and confirmation
 * dialogs. Domain-specific bits come in through config props and render slots.
 */
export function ClaimablePage<
  T extends ClaimableItem,
  BulkRow extends { name: string; category?: string },
  EditVals extends { category?: string | null }
>({
  eventId,
  familyId,
  isOrganizer,
  actions,
  ownership,
  title,
  datalistId,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  filterLabels,
  renderItemCountExtra,
  categorySuggestions,
  importTitle,
  importPlaceholder,
  deleteDialogTitle,
  deleteDialogDescription,
  unvolunteerDialogDescription,
  renderLeading,
  renderBody,
  renderEditor,
  renderQuickAdd,
}: ClaimablePageProps<T, BulkRow, EditVals>) {
  const [newCatInput, setNewCatInput] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  const hook = useClaimableItems<T, BulkRow, EditVals>({
    eventId,
    familyId,
    actions,
    ownership,
  });

  // Pointer needs a small distance to start a drag so click on the handle
  // doesn't immediately become a drag. Touch uses a delay (long-press) so
  // scrolling the page stays primary.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(typeof e.active.id === "number" ? e.active.id : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    if (typeof active.id !== "number") return;

    const moved = hook.items.find((i) => i.id === active.id);
    if (!moved) return;

    // Resolve target category — either from another item (over.id is a number)
    // or from the SortableContext id (over.id is "cat@@<category>").
    let overCategory = "";
    let overItemId: number | null = null;

    if (typeof over.id === "number") {
      overItemId = over.id;
      const overItem = hook.items.find((i) => i.id === over.id);
      if (!overItem) return;
      overCategory = overItem.category?.trim() ?? "";
    } else if (
      typeof over.id === "string" &&
      over.id.startsWith(CATEGORY_DROPZONE_PREFIX)
    ) {
      overCategory = over.id.slice(CATEGORY_DROPZONE_PREFIX.length);
    } else {
      return;
    }

    const targetSubgroup = hook.items
      .filter(
        (i) => (i.category?.trim() ?? "") === overCategory && i.id !== moved.id
      )
      .sort((x, y) => x.sortOrder - y.sortOrder);

    let insertIdx = targetSubgroup.length;
    if (overItemId !== null) {
      const idx = targetSubgroup.findIndex((i) => i.id === overItemId);
      if (idx !== -1) {
        const movedCategory = moved.category?.trim() ?? "";
        const sameCategory = movedCategory === overCategory;
        const overItem = targetSubgroup[idx];
        // Within the same category, removing `moved` shifts later indices
        // down by 1 — so when dragging downward (moved sat above `over`)
        // insert *after* `over` to land on the slot the user pointed at.
        insertIdx =
          sameCategory && moved.sortOrder < overItem.sortOrder ? idx + 1 : idx;
      }
    }

    const newOrder = [
      ...targetSubgroup.slice(0, insertIdx),
      moved,
      ...targetSubgroup.slice(insertIdx),
    ];

    const targetCategoryDb = overCategory || null;
    const updates: SortOrderUpdate[] = newOrder.map((item, idx) => ({
      id: item.id,
      category: targetCategoryDb,
      sortOrder: (idx + 1) * 10,
    }));

    hook.handleBulkReorder(updates);
  }

  const allSuggestions = useMemo(() => {
    const set = new Set(hook.existingCategories.map((c) => c.toLowerCase()));
    const extra = categorySuggestions
      .filter((s) => !set.has(s.toLowerCase()))
      .map(capFirst);
    return [...hook.existingCategories, ...extra];
  }, [hook.existingCategories, categorySuggestions]);

  function submitAddNewCategory() {
    hook.addNewCategory(newCatInput);
    setNewCatInput("");
  }

  if (hook.loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );
  }

  // BulkRow is structurally compatible with the bulk-import components'
  // `{ name; category?; [key: string]: unknown }` shape, but TS's strict
  // callback variance won't accept the direct assignment. Single cast here.
  const bulkAddForImport = hook.handleBulkAdd as unknown as (
    rows: BulkImportRow[]
  ) => Promise<void>;

  // Props common to every <ClaimableCategorySection> on this page.
  const sectionShared = {
    families: hook.families,
    familyId,
    isOrganizer,
    categoryOptions: hook.categoryOptions,
    ownership,
    onDelete: hook.handleDelete,
    onClaim: hook.handleClaim,
    onUnclaim: hook.handleUnclaim,
    onOrganizerAssign: hook.handleOrganizerAssign,
    onUnvolunteer: hook.handleUnvolunteer,
    onSaveEdit: hook.handleSaveEdit,
    onBulkAdd: hook.handleBulkAdd,
    onMoveCategory: hook.handleMoveCategory,
    renderLeading: renderLeading
      ? (item: T) => renderLeading(item, hook.refetch)
      : undefined,
    renderBody,
    renderEditor,
    renderQuickAdd,
  };

  return (
    <div className="space-y-6">
      {/* Datalist for category suggestions */}
      <datalist id={datalistId}>
        {allSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
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
          {hook.items.length} item{hook.items.length !== 1 && "s"}
          {renderItemCountExtra?.(hook.items)}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "needs-help", "mine"] as const).map((f) => (
          <Button
            key={f}
            variant={hook.filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => hook.setFilter(f)}
          >
            {f === "all"
              ? filterLabels.all(hook.items.length)
              : f === "needs-help"
                ? filterLabels.needsHelp(hook.needsHelpCount)
                : filterLabels.mine(hook.myCount)}
          </Button>
        ))}
      </div>

      {/* Empty state */}
      {hook.filtered.length === 0 && (
        <EmptyState
          icon={EmptyIcon}
          title={emptyTitle}
          description={
            hook.filter !== "all"
              ? "No items match this filter."
              : emptyDescription
          }
        />
      )}

      {/* Category sections — wrapped in a single DndContext so items can be
          dragged between categories. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="space-y-6">
          {hook.categoryOrder.map((cat) => (
            <ClaimableCategorySection<T, BulkRow, EditVals>
              key={cat}
              category={cat}
              items={hook.grouped[cat]}
              {...sectionShared}
              onRename={(newName) => hook.handleRenameCategory(cat, newName)}
              onClear={() => hook.handleClearCategory(cat)}
            />
          ))}

          {/* New (empty) categories */}
          {hook.newCategories.map((cat) =>
            !hook.categoryOrder.includes(cat) ? (
              <ClaimableCategorySection<T, BulkRow, EditVals>
                key={`new-${cat}`}
                category={cat}
                items={[]}
                {...sectionShared}
                onRename={(newName) => hook.renameNewCategory(cat, newName)}
                onClear={() => hook.removeNewCategory(cat)}
              />
            ) : null
          )}

          {/* Uncategorized */}
          {hook.uncategorized.length > 0 && (
            <ClaimableCategorySection<T, BulkRow, EditVals>
              key="__uncategorized__"
              category=""
              items={hook.uncategorized}
              {...sectionShared}
            />
          )}
        </div>
        <DragOverlay>
          {activeDragId !== null ? (
            <div className="rounded-lg border bg-card px-2.5 py-2 text-sm shadow-lg opacity-90">
              Moving…
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
          list={datalistId}
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

      {/* Quick bulk add */}
      <CategoryBulkAdd
        allSuggestions={allSuggestions}
        existingCategories={hook.existingCategories}
        datalistId={datalistId}
        onBulkAdd={bulkAddForImport}
      />

      {/* Paste-import dialog */}
      <PasteImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={bulkAddForImport}
        title={importTitle}
        placeholder={importPlaceholder}
      />

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={hook.pendingDeleteId !== null}
        title={deleteDialogTitle}
        description={deleteDialogDescription}
        onConfirm={hook.confirmDelete}
        onCancel={hook.cancelDelete}
      />

      {/* Unvolunteer confirmation */}
      <ConfirmDeleteDialog
        open={hook.pendingUnvolunteerItemId !== null}
        title="Remove yourself?"
        description={unvolunteerDialogDescription}
        confirmLabel="Remove"
        onConfirm={hook.confirmUnvolunteer}
        onCancel={hook.cancelUnvolunteer}
      />
    </div>
  );
}
