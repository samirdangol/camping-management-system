"use client";

import { useState } from "react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import { ItemCardShell, type ItemCardShellProps } from "./item-card-shell";
import type { ReactNode } from "react";
import type { Family } from "@/types";
import type {
  ClaimableItem,
  ClaimableOwnership,
} from "./use-claimable-items";

/** Prefix used on SortableContext ids so the page-level drag-end handler can
 *  tell "dropped on item id 42" apart from "dropped on empty category X". */
export const CATEGORY_DROPZONE_PREFIX = "cat@@";

function SortableItemCard<T extends ClaimableItem, EditVals>(
  props: Omit<ItemCardShellProps<T, EditVals>, "dnd">
) {
  const sortable = useSortable({ id: props.item.id });
  const dnd: ItemCardShellProps<T, EditVals>["dnd"] = {
    setNodeRef: sortable.setNodeRef,
    style: {
      transform: CSS.Transform.toString(sortable.transform),
      transition: sortable.transition,
    },
    attributes: sortable.attributes,
    listeners: sortable.listeners,
    isDragging: sortable.isDragging,
  };
  return <ItemCardShell<T, EditVals> {...props} dnd={dnd} />;
}

export interface ClaimableCategorySectionProps<
  T extends ClaimableItem,
  BulkRow,
  EditVals
> {
  category: string;
  items: T[];
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  categoryOptions: string[];
  ownership: ClaimableOwnership<T>;

  /* per-item handlers (forwarded to ItemCardShell) */
  onDelete: (id: number) => void | Promise<void>;
  onClaim: (id: number) => Promise<void>;
  onUnclaim: (id: number) => Promise<void>;
  onOrganizerAssign: (
    id: number,
    familyId: number | null,
    label?: string
  ) => Promise<void>;
  onUnvolunteer: (id: number) => void;
  onSaveEdit: (id: number, vals: EditVals) => Promise<void>;
  onMoveCategory: (id: number, newCategory: string) => Promise<void>;

  /* category-level handlers */
  onBulkAdd: (rows: BulkRow[]) => Promise<void>;
  onRename?: (newName: string) => void;
  onClear?: () => void;

  /* render slots (forwarded to ItemCardShell) */
  renderLeading?: (item: T) => ReactNode;
  renderBody: (item: T) => ReactNode;
  renderEditor: (
    item: T,
    onSave: (vals: EditVals) => Promise<void>,
    onCancel: () => void
  ) => ReactNode;

  /** Per-domain quick-add row at the bottom of the category. The page owns
   *  its own form state and calls `onAdd(row)` when the user submits. */
  renderQuickAdd: (params: {
    category: string;
    displayName: string;
    onAdd: (row: BulkRow) => Promise<void>;
  }) => ReactNode;
}

/**
 * Renders one category section: a collapsible header with rename/clear
 * actions, a list of items via ItemCardShell, and a per-domain inline
 * quick-add row.
 */
export function ClaimableCategorySection<
  T extends ClaimableItem,
  BulkRow,
  EditVals
>({
  category,
  items,
  families,
  familyId,
  isOrganizer,
  categoryOptions,
  ownership,
  onDelete,
  onClaim,
  onUnclaim,
  onOrganizerAssign,
  onUnvolunteer,
  onSaveEdit,
  onMoveCategory,
  onBulkAdd,
  onRename,
  onClear,
  renderLeading,
  renderBody,
  renderEditor,
  renderQuickAdd,
}: ClaimableCategorySectionProps<T, BulkRow, EditVals>) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(category);

  const claimed = items.filter(
    (i) =>
      ownership.getOwnerFamilyId(i) ||
      ownership.getOwnerLabel(i) ||
      i.volunteers.length > 0
  ).length;
  const displayName = category || "Uncategorized";
  const isUncategorized = !category;

  function startRename() {
    setRenameValue(category);
    setRenaming(true);
  }

  function submitRename() {
    if (renameValue.trim() && renameValue.trim() !== category) {
      onRename?.(renameValue.trim());
    }
    setRenaming(false);
  }

  async function handleAddOne(row: BulkRow) {
    await onBulkAdd([row]);
  }

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center gap-2 w-full group">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-left"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          {renaming ? null : (
            <span className="font-semibold text-sm">{displayName}</span>
          )}
        </button>
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRename();
            }}
            className="flex items-center gap-1"
          >
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-7 text-sm w-36"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-emerald-600"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setRenaming(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </form>
        ) : (
          <>
            <Badge variant="secondary" className="text-xs">
              {claimed}/{items.length} claimed
            </Badge>
            {!isUncategorized && onRename && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={startRename}
                title="Rename category"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {!isUncategorized && onClear && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-destructive"
                onClick={onClear}
                title="Remove category (items move to Uncategorized)"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-1.5 pl-2">
          <SortableContext
            id={`${CATEGORY_DROPZONE_PREFIX}${category}`}
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
              <SortableItemCard<T, EditVals>
                key={item.id}
                item={item}
                families={families}
                familyId={familyId}
                isOrganizer={isOrganizer}
                categoryOptions={categoryOptions}
                ownership={ownership}
                onDelete={onDelete}
                onClaim={onClaim}
                onUnclaim={onUnclaim}
                onOrganizerAssign={onOrganizerAssign}
                onUnvolunteer={onUnvolunteer}
                onSaveEdit={onSaveEdit}
                onMoveCategory={onMoveCategory}
                renderLeading={renderLeading}
                renderBody={renderBody}
                renderEditor={renderEditor}
              />
            ))}
          </SortableContext>

          {renderQuickAdd({ category, displayName, onAdd: handleAddOne })}
        </div>
      )}
    </div>
  );
}
