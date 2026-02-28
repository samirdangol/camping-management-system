"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  bulkCreateActivities,
  updateActivity,
  deleteActivity,
  addActivityVolunteer,
  removeActivityVolunteer,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { TARGET_GROUP_LABELS } from "@/lib/constants";
import {
  TreePine,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Save,
  HandHelping,
} from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import type { Family, ActivityWithDetails } from "@/types";

interface NewRow {
  id: string;
  name: string;
  targetGroup: string;
  leaderFamilyId: string;
}

interface EditValues {
  name: string;
  targetGroup: string;
  leaderFamilyId: string;
}

const groupColors: Record<string, string> = {
  all: "bg-blue-100 text-blue-800",
  kids: "bg-pink-100 text-pink-800",
  adults: "bg-indigo-100 text-indigo-800",
  elderly: "bg-amber-100 text-amber-800",
};

function createEmptyRow(): NewRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    targetGroup: "all",
    leaderFamilyId: "",
  };
}

export default function ActivitiesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);
  const [families, setFamilies] = useState<Family[]>([]);
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inline edit state
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    name: "",
    targetGroup: "all",
    leaderFamilyId: "",
  });

  // New rows for bulk add
  const [newRows, setNewRows] = useState<NewRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);

  const fetchData = useCallback(async () => {
    const [signups, acts] = await Promise.all([
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/activities`).then((r) => r.json()),
    ]);
    setFamilies(signups.map((s: { family: Family }) => s.family));
    setActivities(acts);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Existing item actions ---

  function startEdit(activity: ActivityWithDetails) {
    setEditingRowId(activity.id);
    setEditValues({
      name: activity.name,
      targetGroup: activity.targetGroup || "all",
      leaderFamilyId: activity.leaderFamilyId
        ? String(activity.leaderFamilyId)
        : "",
    });
  }

  function cancelEdit() {
    setEditingRowId(null);
  }

  async function saveEdit(activityId: number) {
    await updateActivity(activityId, parseInt(eventId, 10), {
      name: editValues.name,
      targetGroup: editValues.targetGroup,
      leaderFamilyId: editValues.leaderFamilyId
        ? parseInt(editValues.leaderFamilyId, 10)
        : null,
    });
    setEditingRowId(null);
    await fetchData();
  }

  async function handleDelete(activityId: number) {
    await deleteActivity(activityId, parseInt(eventId, 10));
    await fetchData();
  }

  async function handleVolunteer(activityId: number) {
    if (!familyId) return;
    await addActivityVolunteer(activityId, parseInt(eventId, 10), familyId);
    await fetchData();
  }

  async function handleUnvolunteer(activityId: number) {
    if (!familyId) return;
    await removeActivityVolunteer(activityId, parseInt(eventId, 10), familyId);
    await fetchData();
  }

  // --- New row actions ---

  function updateNewRow(id: string, field: keyof NewRow, value: string) {
    setNewRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function removeNewRow(id: string) {
    setNewRows((rows) => rows.filter((r) => r.id !== id));
  }

  function addNewRow() {
    setNewRows((rows) => [...rows, createEmptyRow()]);
  }

  async function handleBulkSave() {
    const validRows = newRows.filter((r) => r.name.trim());
    if (validRows.length === 0) return;

    setSaving(true);
    await bulkCreateActivities(
      parseInt(eventId, 10),
      validRows.map((r) => ({
        name: r.name.trim(),
        targetGroup: r.targetGroup || undefined,
        leaderFamilyId: r.leaderFamilyId
          ? parseInt(r.leaderFamilyId, 10)
          : undefined,
      }))
    );
    setNewRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    await fetchData();
    setSaving(false);
  }

  const hasNewData = newRows.some((r) => r.name.trim());

  if (loading)
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activities</h2>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium w-[120px]">
                Group
              </th>
              <th className="px-3 py-2 text-left font-medium w-[130px]">
                Leader
              </th>
              <th className="px-3 py-2 text-left font-medium">Volunteers</th>
              <th className="px-3 py-2 text-right font-medium w-[100px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Existing activities */}
            {activities.length === 0 && newRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8">
                  <EmptyState
                    icon={TreePine}
                    title="No activities planned"
                    description="Add activities below!"
                  />
                </td>
              </tr>
            ) : (
              activities.map((activity) => {
                const isEditing = editingRowId === activity.id;
                const isVolunteered = activity.volunteers.some(
                  (v) => v.familyId === familyId
                );
                return (
                  <tr key={activity.id} className="border-b last:border-0">
                    {isEditing ? (
                      <>
                        <td className="px-3 py-1.5">
                          <Input
                            value={editValues.name}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                name: e.target.value,
                              }))
                            }
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={editValues.targetGroup}
                            onValueChange={(val) =>
                              setEditValues((v) => ({
                                ...v,
                                targetGroup: val,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TARGET_GROUP_LABELS).map(
                                ([val, label]) => (
                                  <SelectItem key={val} value={val}>
                                    {label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={editValues.leaderFamilyId}
                            onValueChange={(val) =>
                              setEditValues((v) => ({
                                ...v,
                                leaderFamilyId: val,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {families.map((f) => (
                                <SelectItem
                                  key={f.id}
                                  value={f.id.toString()}
                                >
                                  {f.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">
                          {activity.volunteers.length > 0
                            ? activity.volunteers
                                .map((v) => v.family.name)
                                .join(", ")
                            : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600"
                              onClick={() => saveEdit(activity.id)}
                              disabled={!editValues.name.trim()}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={cancelEdit}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-medium">
                          {activity.name}
                          {activity.description && (
                            <span className="block text-xs text-muted-foreground font-normal">
                              {activity.description}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            className={
                              groupColors[activity.targetGroup] ||
                              groupColors.all
                            }
                            variant="secondary"
                          >
                            {TARGET_GROUP_LABELS[
                              activity.targetGroup as keyof typeof TARGET_GROUP_LABELS
                            ] || activity.targetGroup}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {activity.leader?.name || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isVolunteered ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() =>
                                  handleUnvolunteer(activity.id)
                                }
                              >
                                Leave
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() =>
                                  handleVolunteer(activity.id)
                                }
                              >
                                <HandHelping className="mr-1 h-3 w-3" />
                                Volunteer
                              </Button>
                            )}
                            {activity.volunteers.map((v) => (
                              <Badge
                                key={v.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {v.family.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEdit(activity)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isOrganizer && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500"
                                onClick={() => handleDelete(activity.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}

            {/* Separator */}
            {activities.length > 0 && newRows.length > 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30"
                >
                  Add new activities
                </td>
              </tr>
            )}

            {/* New rows */}
            {newRows.map((row) => (
              <tr
                key={row.id}
                className="border-b last:border-0 bg-green-50/30"
              >
                <td className="px-3 py-1.5">
                  <Input
                    value={row.name}
                    onChange={(e) =>
                      updateNewRow(row.id, "name", e.target.value)
                    }
                    className="h-8 text-sm"
                    placeholder="Activity name"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Select
                    value={row.targetGroup}
                    onValueChange={(val) =>
                      updateNewRow(row.id, "targetGroup", val)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TARGET_GROUP_LABELS).map(
                        ([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <Select
                    value={row.leaderFamilyId}
                    onValueChange={(val) =>
                      updateNewRow(row.id, "leaderFamilyId", val)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {families.map((f) => (
                        <SelectItem key={f.id} value={f.id.toString()}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5 text-right">
                  {newRows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => removeNewRow(row.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={addNewRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add Row
        </Button>
        {hasNewData && (
          <Button size="sm" onClick={handleBulkSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save All New Activities"}
          </Button>
        )}
      </div>
    </div>
  );
}
