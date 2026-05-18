"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Family } from "@/types";

export interface ClaimableVolunteer {
  id: number;
  familyId: number;
  family: Family;
}

export interface ClaimableItem {
  id: number;
  name: string;
  category: string | null;
  sortOrder: number;
  volunteers: ClaimableVolunteer[];
}

export interface ClaimableActions<
  T extends ClaimableItem,
  BulkRow extends { name: string; category?: string },
  EditVals extends { category?: string | null }
> {
  fetchItems: (eventId: number) => Promise<T[]>;
  claim: (id: number, eventId: number, familyId: number | null, label?: string) => Promise<void>;
  unclaim: (id: number, eventId: number) => Promise<void>;
  delete: (id: number, eventId: number) => Promise<void>;
  addVolunteer: (id: number, eventId: number, familyId: number) => Promise<void>;
  removeVolunteer: (id: number, eventId: number, familyId: number) => Promise<void>;
  update: (id: number, eventId: number, vals: EditVals) => Promise<void>;
  bulkCreate: (eventId: number, rows: BulkRow[]) => Promise<void>;
  bulkReorder: (eventId: number, updates: SortOrderUpdate[]) => Promise<void>;
  renameCategory: (eventId: number, oldName: string, newName: string) => Promise<void>;
  clearCategory: (eventId: number, name: string) => Promise<void>;
}

export type SortOrderUpdate = {
  id: number;
  category: string | null;
  sortOrder: number;
};

export interface ClaimableOwnership<T> {
  getOwnerFamilyId: (item: T) => number | null;
  getOwnerLabel: (item: T) => string | null;
  getOwner: (item: T) => Family | null;
}

export type ClaimableFilter = "all" | "needs-help" | "mine";

/**
 * Shared state + handlers for grocery/equipment-style claimable item lists.
 * Owns fetching, filtering, grouping, all CRUD handlers, and the
 * confirmation-dialog state for destructive actions.
 *
 * Callers pass `actions` (a domain-specific server-action bundle) and
 * `ownership` (field accessors for the asymmetric owner/assigned naming).
 */
export function useClaimableItems<
  T extends ClaimableItem,
  BulkRow extends { name: string; category?: string },
  EditVals extends { category?: string | null }
>({
  eventId,
  familyId,
  actions,
  ownership,
}: {
  eventId: number;
  familyId: number | null;
  actions: ClaimableActions<T, BulkRow, EditVals>;
  ownership: ClaimableOwnership<T>;
}) {
  // Keep a ref to actions so handler identities stay stable across renders
  // even if the caller passes a fresh object literal each time. Ownership
  // accessors are read during render (in useMemo), so we use them directly
  // and rely on the caller passing a stable reference (typically declared
  // at module scope).
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  const [families, setFamilies] = useState<Family[]>([]);
  const [items, setItems] = useState<T[]>([]);
  const [filter, setFilter] = useState<ClaimableFilter>("all");
  const [loading, setLoading] = useState(true);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingUnvolunteerItemId, setPendingUnvolunteerItemId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const [signups, fetched] = await Promise.all([
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
      actionsRef.current.fetchItems(eventId),
    ]);
    setFamilies(signups.map((s: { family: Family }) => s.family));
    setItems(fetched);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── derived: filtered + grouped ── */

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "needs-help") {
          return (
            !ownership.getOwnerFamilyId(item) &&
            !ownership.getOwnerLabel(item) &&
            item.volunteers.length === 0
          );
        }
        if (filter === "mine") {
          return (
            ownership.getOwnerFamilyId(item) === familyId ||
            item.volunteers.some((v) => v.familyId === familyId)
          );
        }
        return true;
      }),
    [items, filter, familyId, ownership]
  );

  const { grouped, categoryOrder, uncategorized } = useMemo(() => {
    const map: Record<string, T[]> = {};
    const uncat: T[] = [];
    for (const item of filtered) {
      const cat = item.category?.trim();
      if (cat) {
        if (!map[cat]) map[cat] = [];
        map[cat].push(item);
      } else {
        uncat.push(item);
      }
    }
    const order = Object.keys(map).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    return { grouped: map, categoryOrder: order, uncategorized: uncat };
  }, [filtered]);

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of items) {
      if (item.category?.trim()) cats.add(item.category.trim());
    }
    return Array.from(cats).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [items]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(existingCategories);
    newCategories.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [existingCategories, newCategories]);

  /* ── counts for filter badges ── */

  const needsHelpCount = useMemo(
    () =>
      items.filter(
        (i) =>
          !ownership.getOwnerFamilyId(i) &&
          !ownership.getOwnerLabel(i) &&
          i.volunteers.length === 0
      ).length,
    [items, ownership]
  );

  const myCount = useMemo(
    () =>
      items.filter(
        (i) =>
          ownership.getOwnerFamilyId(i) === familyId ||
          i.volunteers.some((v) => v.familyId === familyId)
      ).length,
    [items, familyId, ownership]
  );

  /* ── handlers ── */

  const handleDelete = useCallback((id: number) => {
    setPendingDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (pendingDeleteId === null) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    await actionsRef.current.delete(id, eventId);
    await fetchData();
  }, [pendingDeleteId, eventId, fetchData]);

  const handleClaim = useCallback(
    async (id: number) => {
      if (!familyId) return;
      await actionsRef.current.claim(id, eventId, familyId);
      await fetchData();
    },
    [familyId, eventId, fetchData]
  );

  const handleUnclaim = useCallback(
    async (id: number) => {
      await actionsRef.current.unclaim(id, eventId);
      await fetchData();
    },
    [eventId, fetchData]
  );

  const handleOrganizerAssign = useCallback(
    async (id: number, assignFamilyId: number | null, label?: string) => {
      await actionsRef.current.claim(id, eventId, assignFamilyId, label);
      await fetchData();
    },
    [eventId, fetchData]
  );

  const handleVolunteer = useCallback(
    async (id: number) => {
      if (!familyId) return;
      await actionsRef.current.addVolunteer(id, eventId, familyId);
      await fetchData();
    },
    [familyId, eventId, fetchData]
  );

  const handleUnvolunteer = useCallback(
    (id: number) => {
      if (!familyId) return;
      setPendingUnvolunteerItemId(id);
    },
    [familyId]
  );

  const confirmUnvolunteer = useCallback(async () => {
    if (pendingUnvolunteerItemId === null || !familyId) return;
    await actionsRef.current.removeVolunteer(
      pendingUnvolunteerItemId,
      eventId,
      familyId
    );
    setPendingUnvolunteerItemId(null);
    await fetchData();
  }, [pendingUnvolunteerItemId, familyId, eventId, fetchData]);

  const handleSaveEdit = useCallback(
    async (id: number, vals: EditVals) => {
      await actionsRef.current.update(id, eventId, vals);
      await fetchData();
    },
    [eventId, fetchData]
  );

  const handleMoveCategory = useCallback(
    async (id: number, newCategory: string) => {
      await actionsRef.current.update(id, eventId, {
        category: newCategory,
      } as EditVals);
      await fetchData();
    },
    [eventId, fetchData]
  );

  const handleBulkAdd = useCallback(
    async (rows: BulkRow[]) => {
      await actionsRef.current.bulkCreate(eventId, rows);
      const addedCats = rows
        .map((r) => r.category?.trim())
        .filter(Boolean) as string[];
      if (addedCats.length > 0) {
        setNewCategories((prev) => prev.filter((c) => !addedCats.includes(c)));
      }
      await fetchData();
    },
    [eventId, fetchData]
  );

  const handleBulkReorder = useCallback(
    async (updates: SortOrderUpdate[]) => {
      if (updates.length === 0) return;
      // Optimistic: apply the updates AND re-sort the array so DOM order
      // matches the new sortOrder immediately. Without the re-sort, the
      // grouping useMemo iterates items in their existing array order, so
      // the dropped row snaps back to its old DOM position and only moves
      // once the server refetch returns pre-sorted rows ~1s later.
      setItems((prev) => {
        const updateMap = new Map(updates.map((u) => [u.id, u]));
        const next = prev.map((item) => {
          const u = updateMap.get(item.id);
          if (!u) return item;
          return { ...item, category: u.category, sortOrder: u.sortOrder };
        });
        next.sort((a, b) => {
          const ca = a.category ?? "";
          const cb = b.category ?? "";
          if (ca !== cb) return ca.localeCompare(cb);
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.id - b.id;
        });
        return next;
      });
      await actionsRef.current.bulkReorder(eventId, updates);
      await fetchData();
    },
    [eventId, fetchData]
  );

  const handleRenameCategory = useCallback(
    async (oldName: string, newName: string) => {
      if (!newName.trim() || newName.trim() === oldName) return;
      await actionsRef.current.renameCategory(eventId, oldName, newName.trim());
      setNewCategories((prev) =>
        prev.map((c) => (c === oldName ? newName.trim() : c))
      );
      await fetchData();
    },
    [eventId, fetchData]
  );

  const handleClearCategory = useCallback(
    async (categoryName: string) => {
      await actionsRef.current.clearCategory(eventId, categoryName);
      setNewCategories((prev) => prev.filter((c) => c !== categoryName));
      await fetchData();
    },
    [eventId, fetchData]
  );

  const addNewCategory = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const allExisting = [
        ...existingCategories.map((c) => c.toLowerCase()),
        ...newCategories.map((c) => c.toLowerCase()),
      ];
      if (allExisting.includes(trimmed.toLowerCase())) return;
      setNewCategories((prev) => [...prev, trimmed]);
    },
    [existingCategories, newCategories]
  );

  const removeNewCategory = useCallback((name: string) => {
    setNewCategories((prev) => prev.filter((c) => c !== name));
  }, []);

  const renameNewCategory = useCallback(
    (oldName: string, newName: string) => {
      setNewCategories((prev) =>
        prev.map((c) => (c === oldName ? newName : c))
      );
    },
    []
  );

  return {
    // data
    items,
    families,
    loading,
    filtered,
    grouped,
    categoryOrder,
    uncategorized,
    existingCategories,
    categoryOptions,
    needsHelpCount,
    myCount,

    // filter
    filter,
    setFilter,

    // empty-placeholder categories the user has added but not populated yet
    newCategories,
    addNewCategory,
    removeNewCategory,
    renameNewCategory,

    // confirmation dialog state
    pendingDeleteId,
    pendingUnvolunteerItemId,
    cancelDelete: useCallback(() => setPendingDeleteId(null), []),
    cancelUnvolunteer: useCallback(() => setPendingUnvolunteerItemId(null), []),

    // action handlers
    handleDelete,
    confirmDelete,
    handleClaim,
    handleUnclaim,
    handleOrganizerAssign,
    handleVolunteer,
    handleUnvolunteer,
    confirmUnvolunteer,
    handleSaveEdit,
    handleMoveCategory,
    handleBulkAdd,
    handleBulkReorder,
    handleRenameCategory,
    handleClearCategory,

    refetch: fetchData,
  };
}
