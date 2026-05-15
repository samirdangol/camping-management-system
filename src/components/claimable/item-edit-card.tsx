"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Wrapper for in-place item edit forms. Renders a 4-column field grid plus
 * a Cancel/Save button row. Callers supply the field inputs as children.
 */
export function ItemEditCard({
  onCancel,
  onSave,
  canSave,
  busy = false,
  children,
}: {
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  canSave: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border p-2.5 space-y-2 bg-blue-950/30 border-blue-800/50">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</div>
      <div className="flex gap-1.5 justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={onSave}
          disabled={!canSave || busy}
        >
          <Check className="h-3 w-3 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}
