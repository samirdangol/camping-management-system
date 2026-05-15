"use client";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderInput } from "lucide-react";

/**
 * "Move to category" submenu used inside item dropdowns. Hides itself when
 * there's nowhere to move to (no other categories and already uncategorized).
 */
export function MoveCategorySubmenu({
  currentCategory,
  categoryOptions,
  onMove,
}: {
  currentCategory: string;
  categoryOptions: string[];
  onMove: (target: string) => void;
}) {
  const targets = categoryOptions.filter((c) => c !== currentCategory);
  const canUncategorize = !!currentCategory;
  if (targets.length === 0 && !canUncategorize) return null;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FolderInput className="h-4 w-4" />
        Move to category
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
        {targets.map((c) => (
          <DropdownMenuItem key={c} onClick={() => onMove(c)}>
            {c}
          </DropdownMenuItem>
        ))}
        {canUncategorize && (
          <>
            {targets.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => onMove("")}>
              Uncategorized
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
