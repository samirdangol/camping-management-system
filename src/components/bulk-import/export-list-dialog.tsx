"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, FileDown } from "lucide-react";
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

const UNCATEGORIZED_LABEL = "Uncategorized";

export interface ExportCategoryGroup {
  category: string;
  items: { name: string; notes?: string | null }[];
}

interface ExportListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ExportCategoryGroup[];
  title?: string;
  /** Filename (without extension) used when the user clicks Download. */
  downloadName?: string;
}

function buildExportText(groups: ExportCategoryGroup[]): string {
  return groups
    .filter((g) => g.items.length > 0)
    .map((g) => {
      const label = g.category.trim() || UNCATEGORIZED_LABEL;
      const tokens = g.items.map((i) => {
        const note = i.notes?.trim();
        return note ? `${i.name} (${note})` : i.name;
      });
      return `${label}: ${tokens.join(", ")}`;
    })
    .join("\n");
}

export function ExportListDialog({
  open,
  onOpenChange,
  groups,
  title = "Export List",
  downloadName = "supplies",
}: ExportListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        {/* Mount the body only while open so the textarea state is seeded
            fresh on every open (no setState-in-effect needed). */}
        {open && (
          <ExportListBody
            groups={groups}
            title={title}
            downloadName={downloadName}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ExportListBody({
  groups,
  title,
  downloadName,
  onClose,
}: {
  groups: ExportCategoryGroup[];
  title: string;
  downloadName: string;
  onClose: () => void;
}) {
  const initialText = useMemo(() => buildExportText(groups), [groups]);
  const [text, setText] = useState(initialText);

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
  const exportableCategories = groups.filter((g) => g.items.length > 0).length;
  const isEmpty = text.trim().length === 0;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy. Select the text and copy manually.");
    }
  }

  function handleDownload() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadName}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          {title}
        </DialogTitle>
        <DialogDescription>
          {totalItems} item{totalItems !== 1 ? "s" : ""} across{" "}
          {exportableCategories} categor
          {exportableCategories !== 1 ? "ies" : "y"}. This text is in the same
          format the importer accepts — copy or download it, then paste into
          Import List on another event to recreate the list.
        </DialogDescription>
      </DialogHeader>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[220px] text-sm font-mono"
        spellCheck={false}
      />

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={isEmpty}
          className="gap-1"
        >
          <Download className="h-3.5 w-3.5" />
          Download .txt
        </Button>
        <Button onClick={handleCopy} disabled={isEmpty} className="gap-1">
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
      </DialogFooter>
    </>
  );
}
