"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function parseItemsText(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface CategoryBulkAddProps {
  allSuggestions: string[];
  existingCategories: string[];
  datalistId: string;
  onBulkAdd: (
    items: { name: string; category?: string; [key: string]: unknown }[]
  ) => Promise<void>;
}

export function CategoryBulkAdd({
  allSuggestions,
  existingCategories,
  datalistId,
  onBulkAdd,
}: CategoryBulkAddProps) {
  const [category, setCategory] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedItems = parseItemsText(itemsText);
  const itemCount = parsedItems.length;

  async function handleAdd() {
    if (itemCount === 0 || !category.trim()) return;
    setSaving(true);
    await onBulkAdd(
      parsedItems.map((name) => ({
        name,
        category: category.trim(),
      }))
    );
    setItemsText("");
    setSaving(false);
  }

  // Combine existing + suggestions, dedup case-insensitive
  const seen = new Set<string>();
  const suggestions = [...existingCategories, ...allSuggestions].filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/10">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Quick Add Multiple Items
      </h3>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Category
          </label>
          <Input
            list={datalistId}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Pick or type a category..."
            className="h-8 text-sm max-w-xs"
          />
          <datalist id={datalistId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Items (one per line, or comma-separated)
          </label>
          <Textarea
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            placeholder="Milk, Tea, Coffee, Sugar..."
            className="min-h-[80px] text-sm"
          />
          {itemCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {itemCount} item{itemCount !== 1 ? "s" : ""} detected
            </p>
          )}
        </div>
      </div>

      <Button
        size="sm"
        onClick={handleAdd}
        disabled={itemCount === 0 || !category.trim() || saving}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        {saving
          ? "Adding..."
          : `Add ${itemCount} Item${itemCount !== 1 ? "s" : ""}${category.trim() ? ` to ${category.trim()}` : ""}`}
      </Button>
    </div>
  );
}
