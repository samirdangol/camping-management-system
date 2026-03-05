"use client";

import { useState } from "react";
import { ClipboardPaste, X, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

/* ── Types ── */

interface ParsedCategory {
  category: string;
  items: string[];
}

interface PasteImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    items: { name: string; category?: string; [key: string]: unknown }[]
  ) => Promise<void>;
  title?: string;
  placeholder?: string;
}

/* ── Parser ── */

function parseImportText(text: string): ParsedCategory[] {
  const lines = text.split("\n").map((l) => l.trimEnd());

  // Detect colon format: any non-empty line has ":" with comma-separated values after it
  const hasColonFormat = lines.some((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 1) return false;
    const after = line.substring(colonIdx + 1).trim();
    return after.length > 0 && after.includes(",");
  });

  if (hasColonFormat) return parseColonFormat(lines);
  return parseBlankLineFormat(lines);
}

function parseColonFormat(lines: string[]): ParsedCategory[] {
  const results: ParsedCategory[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const category = trimmed.substring(0, colonIdx).trim();
      const itemsPart = trimmed.substring(colonIdx + 1).trim();
      const items = itemsPart
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
      if (category) results.push({ category, items });
    }
  }
  return results;
}

function parseBlankLineFormat(lines: string[]): ParsedCategory[] {
  const results: ParsedCategory[] = [];
  let currentCategory = "";
  let currentItems: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentCategory) {
        results.push({ category: currentCategory, items: currentItems });
        currentCategory = "";
        currentItems = [];
      }
      continue;
    }
    if (!currentCategory) {
      currentCategory = trimmed;
    } else {
      currentItems.push(trimmed);
    }
  }
  // Flush final group
  if (currentCategory) {
    results.push({ category: currentCategory, items: currentItems });
  }
  return results;
}

/* ── Component ── */

export function PasteImportDialog({
  open,
  onOpenChange,
  onImport,
  title = "Import Items",
  placeholder,
}: PasteImportDialogProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedCategory[]>([]);
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const [importing, setImporting] = useState(false);

  const totalItems = parsed.reduce((sum, c) => sum + c.items.length, 0);

  function handlePreview() {
    const result = parseImportText(text);
    setParsed(result);
    setStep("preview");
  }

  function removeItem(catIdx: number, itemIdx: number) {
    setParsed((prev) =>
      prev.map((c, ci) =>
        ci === catIdx
          ? { ...c, items: c.items.filter((_, ii) => ii !== itemIdx) }
          : c
      )
    );
  }

  function removeCategory(catIdx: number) {
    setParsed((prev) => prev.filter((_, ci) => ci !== catIdx));
  }

  async function handleImport() {
    const items = parsed.flatMap((c) =>
      c.items.map((name) => ({ name, category: c.category }))
    );
    if (items.length === 0) return;
    setImporting(true);
    await onImport(items);
    setImporting(false);
    // Reset and close
    setText("");
    setParsed([]);
    setStep("paste");
    onOpenChange(false);
  }

  function handleClose(open: boolean) {
    if (!open) {
      setText("");
      setParsed([]);
      setStep("paste");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            {title}
          </DialogTitle>
          {step === "paste" && (
            <DialogDescription>
              Paste your list below. Supported formats:{" "}
              <span className="font-medium">Category: Item1, Item2, Item3</span>{" "}
              (one per line) — or category name on its own line with items below,
              separated by blank lines.
            </DialogDescription>
          )}
          {step === "preview" && (
            <DialogDescription>
              {totalItems} item{totalItems !== 1 ? "s" : ""} in{" "}
              {parsed.length} categor{parsed.length !== 1 ? "ies" : "y"}.
              Click X to remove items before importing.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "paste" && (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              placeholder ||
              "Breakfast: Milk, Tea, Coffee, Sugar\nLunch/Dinner: Chicken, Rice, Oil\nDrinks: Beer, Wine, Water"
            }
            className="min-h-[200px] text-sm font-mono"
          />
        )}

        {step === "preview" && (
          <div className="overflow-y-auto flex-1 space-y-3 pr-1">
            {parsed.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-4 text-center">
                Could not parse any items. Try a different format.
              </p>
            )}
            {parsed.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold capitalize">
                    {cat.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({cat.items.length})
                  </span>
                  <button
                    onClick={() => removeCategory(catIdx)}
                    className="text-muted-foreground hover:text-red-500 ml-auto"
                    title="Remove category"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-2">
                  {cat.items.map((item, itemIdx) => (
                    <Badge
                      key={itemIdx}
                      variant="secondary"
                      className="text-xs gap-1 pr-1"
                    >
                      {item}
                      <button
                        onClick={() => removeItem(catIdx, itemIdx)}
                        className="hover:text-red-500 ml-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                  {cat.items.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No items (category only)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          {step === "paste" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!text.trim()}>
                Preview
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("paste")}
                className="gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                onClick={handleImport}
                disabled={totalItems === 0 || importing}
              >
                {importing
                  ? "Importing..."
                  : `Import ${totalItems} Item${totalItems !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
