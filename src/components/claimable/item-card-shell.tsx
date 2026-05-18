"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FamilyAvatar } from "@/components/shared/family-avatar";
import { AssignPanel } from "./assign-panel";
import { MoveCategorySubmenu } from "./move-category-submenu";
import {
  ArrowDown,
  ArrowUp,
  Hand,
  MoreVertical,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Family } from "@/types";
import type {
  ClaimableItem,
  ClaimableOwnership,
} from "./use-claimable-items";

export interface ItemCardShellProps<T extends ClaimableItem, EditVals> {
  item: T;
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  isFirst: boolean;
  isLast: boolean;
  categoryOptions: string[];
  ownership: ClaimableOwnership<T>;

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
  onReorder: (direction: "up" | "down") => Promise<void>;
  onMoveCategory: (id: number, newCategory: string) => Promise<void>;

  /** Optional leading slot before the body — e.g. the grocery purchased checkbox. */
  renderLeading?: (item: T) => ReactNode;
  /** Body content (name, qty, domain-specific tags). The shell renders the
   *  "needs-volunteer" indicator and volunteer chips around it. */
  renderBody: (item: T) => ReactNode;
  /** Full edit-mode JSX. The shell passes a wrapped `onSave` that auto-closes
   *  edit mode after the save completes, plus a plain `onCancel`. */
  renderEditor: (
    item: T,
    onSave: (vals: EditVals) => Promise<void>,
    onCancel: () => void
  ) => ReactNode;

  /** Show the "Move up / Move down" menu items. Default true. The unified
   *  supplies page hides these because cross-kind reordering has no clean
   *  semantics. */
  showReorder?: boolean;
}

/**
 * Display chrome for a claimable item — owner badge, volunteer chips,
 * organizer assign panel, item action menu, and in-place edit toggle.
 * Domain-specific bits (body content, edit fields) come in via render slots.
 */
export function ItemCardShell<T extends ClaimableItem, EditVals>({
  item,
  families,
  familyId,
  isOrganizer,
  isFirst,
  isLast,
  categoryOptions,
  ownership,
  onDelete,
  onClaim,
  onUnclaim,
  onOrganizerAssign,
  onUnvolunteer,
  onSaveEdit,
  onReorder,
  onMoveCategory,
  renderLeading,
  renderBody,
  renderEditor,
  showReorder = true,
}: ItemCardShellProps<T, EditVals>) {
  const [editing, setEditing] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  const ownerFamily = ownership.getOwner(item);
  const ownerLabel = ownership.getOwnerLabel(item);
  const ownerFamilyId = ownership.getOwnerFamilyId(item);

  const hasOwner = !!ownerFamily || !!ownerLabel;
  const iAmOwner = ownerFamilyId === familyId;
  const iAmVolunteer = item.volunteers.some((v) => v.familyId === familyId);
  const isMyItem = iAmOwner || iAmVolunteer;
  const needsVolunteer = !hasOwner && item.volunteers.length === 0;
  const showSelfVolunteer = !hasOwner && !isMyItem;

  if (editing) {
    return renderEditor(
      item,
      async (vals) => {
        await onSaveEdit(item.id, vals);
        setEditing(false);
      },
      () => setEditing(false)
    );
  }

  const bg = needsVolunteer
    ? "bg-card border-border"
    : "bg-emerald-950/30 border-l-4 border-l-emerald-600 border-emerald-900/40";

  return (
    <div className={`rounded-lg border p-2.5 ${bg}`}>
      <div className="flex items-center gap-2">
        {renderLeading?.(item)}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
          {needsVolunteer && (
            <span
              className="h-2 w-2 rounded-full bg-red-500 shrink-0"
              title="No owner yet — needs help"
              aria-label="Needs an owner"
            />
          )}
          {renderBody(item)}
          {item.volunteers.map((v) => (
            <Badge
              key={v.id}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-emerald-900/40 text-emerald-300"
            >
              <FamilyAvatar
                familyId={v.family.id}
                className="w-4 h-4 text-[10px] mr-0.5"
              />
              {v.family.name}
              {v.familyId === familyId && (
                <button
                  onClick={() => onUnvolunteer(item.id)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 relative">
          {hasOwner ? (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-emerald-900/40 text-emerald-300"
            >
              {ownerFamily ? (
                <>
                  <FamilyAvatar
                    familyId={ownerFamily.id}
                    className="w-4 h-4 text-[10px] mr-0.5"
                  />
                  {ownerFamily.name}
                </>
              ) : (
                ownerLabel
              )}
              {(iAmOwner || isOrganizer) && (
                <button
                  onClick={() => onUnclaim(item.id)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ) : showSelfVolunteer ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 border-emerald-700/50 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
              onClick={() => onClaim(item.id)}
            >
              <Hand className="h-3.5 w-3.5" />
              I&apos;ll bring this!
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                aria-label="Item actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {isOrganizer && (
                <>
                  <DropdownMenuItem
                    onClick={() => setShowAssignPanel((v) => !v)}
                  >
                    <UserPlus className="h-4 w-4" />
                    {hasOwner ? "Reassign" : "Assign"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {showReorder && (
                <>
                  <DropdownMenuItem
                    onClick={() => onReorder("up")}
                    disabled={isFirst}
                  >
                    <ArrowUp className="h-4 w-4" />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onReorder("down")}
                    disabled={isLast}
                  >
                    <ArrowDown className="h-4 w-4" />
                    Move down
                  </DropdownMenuItem>
                </>
              )}
              <MoveCategorySubmenu
                currentCategory={item.category || ""}
                categoryOptions={categoryOptions}
                onMove={(target) => onMoveCategory(item.id, target)}
              />
              {isOrganizer && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(item.id)}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {showAssignPanel && (
            <AssignPanel
              families={families}
              onAssign={(fId, label) => {
                onOrganizerAssign(item.id, fId, label);
                setShowAssignPanel(false);
              }}
              onClose={() => setShowAssignPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
