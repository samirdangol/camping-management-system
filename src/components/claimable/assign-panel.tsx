"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FamilyAvatar } from "@/components/shared/family-avatar";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import type { Family } from "@/types";

/**
 * Organizer-only assignment panel: pick a family, drill into individual contacts,
 * or type a free-text label. Closes on outside click.
 */
export function AssignPanel({
  families,
  onAssign,
  onClose,
}: {
  families: Family[];
  onAssign: (familyId: number | null, label?: string) => void;
  onClose: () => void;
}) {
  const [expandedFamilyId, setExpandedFamilyId] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute z-20 top-full right-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 min-w-[280px] space-y-2"
    >
      {/* Family grid */}
      <div className="grid grid-cols-2 gap-1">
        {families.map((f) => (
          <div key={f.id}>
            <div className="flex items-center">
              <button
                onClick={() => onAssign(f.id)}
                className="flex-1 text-left text-xs px-2.5 py-2 rounded bg-muted hover:bg-muted/80 truncate"
                title={`Assign to ${f.name} family`}
              >
                <span className="inline-flex items-center">
                  <FamilyAvatar familyId={f.id} className="w-5 h-5 mr-1" />
                  {f.name}
                </span>
              </button>
              {(f.contactName || f.contactName2) && (
                <button
                  onClick={() =>
                    setExpandedFamilyId((prev) => (prev === f.id ? null : f.id))
                  }
                  className="px-1 py-1.5 text-muted-foreground hover:text-foreground"
                  title="Show individual contacts"
                >
                  {expandedFamilyId === f.id ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
            {/* Expanded contacts */}
            {expandedFamilyId === f.id && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {f.contactName && (
                  <button
                    onClick={() => onAssign(null, f.contactName)}
                    className="block w-full text-left text-[10px] px-2 py-1 rounded hover:bg-blue-900/30 text-blue-400"
                  >
                    → {f.contactName}
                  </button>
                )}
                {f.contactName2 && (
                  <button
                    onClick={() => onAssign(null, f.contactName2!)}
                    className="block w-full text-left text-[10px] px-2 py-1 rounded hover:bg-blue-900/30 text-blue-400"
                  >
                    → {f.contactName2}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Free text input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (customText.trim()) {
            onAssign(null, customText.trim());
          }
        }}
        className="flex items-center gap-1 border-t pt-2"
      >
        <Input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Custom name..."
          className="h-7 text-xs flex-1"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-blue-400"
          disabled={!customText.trim()}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
