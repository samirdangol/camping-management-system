"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  UserPlus,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { familyEmoji } from "@/lib/utils";
import type { Family, ActivityWithDetails } from "@/types";

interface NewRow {
  id: string;
  name: string;
  targetGroup: string;
  leaderFamilyId: string;
  leaderLabel: string;
}

interface EditValues {
  name: string;
  targetGroup: string;
  leaderFamilyId: string;
  leaderLabel: string;
}

const groupColors: Record<string, string> = {
  all: "bg-blue-900/40 text-blue-300",
  kids: "bg-pink-900/40 text-pink-300",
  adults: "bg-indigo-900/40 text-indigo-300",
  elderly: "bg-amber-900/40 text-amber-300",
};

function createEmptyRow(): NewRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    targetGroup: "all",
    leaderFamilyId: "",
    leaderLabel: "",
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
    leaderLabel: "",
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
      leaderLabel: activity.leader?.name || "",
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

      {/* Existing Activities — card layout */}
      {activities.length === 0 && newRows.length === 0 ? (
        <EmptyState
          icon={TreePine}
          title="No activities planned"
          description="Add activities below!"
        />
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const isEditing = editingRowId === activity.id;
            const isVolunteered = activity.volunteers.some((v) => v.familyId === familyId);
            if (isEditing) {
              return (
                <div key={activity.id} className="rounded-lg border bg-blue-950/20 border-blue-800/40 p-3 space-y-2">
                  <Input value={editValues.name} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} className="h-8 text-sm" placeholder="Name" />
                  <div className="flex gap-2 items-center flex-wrap">
                    <Select value={editValues.targetGroup} onValueChange={(val) => setEditValues((v) => ({ ...v, targetGroup: val }))}>
                      <SelectTrigger className="h-8 text-sm w-auto min-w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(TARGET_GROUP_LABELS).map(([val, label]) => (<SelectItem key={val} value={val}>{label}</SelectItem>))}</SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
                      <span className="text-xs text-muted-foreground shrink-0">Leader:</span>
                      {editValues.leaderLabel ? (
                        <Badge variant="secondary" className="text-xs gap-1 bg-emerald-900/40 text-emerald-300 border-emerald-800/50">
                          {editValues.leaderLabel}
                          <button onClick={() => setEditValues((v) => ({ ...v, leaderFamilyId: "", leaderLabel: "" }))} className="ml-0.5 hover:text-red-500">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ) : null}
                      <LeaderAssignPanel
                        families={families}
                        onAssign={(fId, label) => setEditValues((v) => ({ ...v, leaderFamilyId: fId, leaderLabel: label }))}
                        buttonLabel={editValues.leaderLabel ? "Change" : "Assign"}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(activity.id)} disabled={!editValues.name.trim()}><Check className="h-3 w-3 mr-1" />Save</Button>
                  </div>
                </div>
              );
            }
            return (
              <div key={activity.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium">{activity.name}</span>
                      <Badge className={groupColors[activity.targetGroup] || groupColors.all} variant="secondary">
                        {TARGET_GROUP_LABELS[activity.targetGroup as keyof typeof TARGET_GROUP_LABELS] || activity.targetGroup}
                      </Badge>
                    </div>
                    {activity.description && <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {activity.leader && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-900/40 text-emerald-300 border-emerald-800/50">
                          <span>{familyEmoji(activity.leader.id)}</span>
                          Led by {activity.leader.name}
                        </Badge>
                      )}
                      {isVolunteered ? (
                        <Button variant="outline" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => handleUnvolunteer(activity.id)}>Leave</Button>
                      ) : (
                        <Button variant="outline" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => handleVolunteer(activity.id)}>
                          <HandHelping className="mr-0.5 h-3 w-3" />Join
                        </Button>
                      )}
                      {activity.volunteers.map((v) => (<Badge key={v.id} variant="outline" className="text-[10px]">{familyEmoji(v.familyId)} {v.family.name}</Badge>))}
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(activity)}><Pencil className="h-3.5 w-3.5" /></Button>
                    {isOrganizer && (<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(activity.id)}><Trash2 className="h-3.5 w-3.5" /></Button>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New activity rows */}
      {newRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Add new activities</p>
          {newRows.map((row) => (
            <div key={row.id} className="rounded-lg border bg-emerald-950/20 border-emerald-800/30 p-2.5 space-y-2">
              <Input value={row.name} onChange={(e) => updateNewRow(row.id, "name", e.target.value)} className="h-8 text-sm" placeholder="Activity name" />
              <div className="flex gap-2 items-center flex-wrap">
                <Select value={row.targetGroup} onValueChange={(val) => updateNewRow(row.id, "targetGroup", val)}>
                  <SelectTrigger className="h-8 text-sm w-auto min-w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TARGET_GROUP_LABELS).map(([val, label]) => (<SelectItem key={val} value={val}>{label}</SelectItem>))}</SelectContent>
                </Select>
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  <span className="text-xs text-muted-foreground shrink-0">Leader:</span>
                  {row.leaderLabel ? (
                    <Badge variant="secondary" className="text-xs gap-1 bg-emerald-900/40 text-emerald-300 border-emerald-800/50">
                      {row.leaderLabel}
                      <button onClick={() => { updateNewRow(row.id, "leaderFamilyId", ""); updateNewRow(row.id, "leaderLabel", ""); }} className="ml-0.5 hover:text-red-500">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ) : null}
                  <LeaderAssignPanel
                    families={families}
                    onAssign={(fId, label) => {
                      updateNewRow(row.id, "leaderFamilyId", fId);
                      updateNewRow(row.id, "leaderLabel", label);
                    }}
                    buttonLabel={row.leaderLabel ? "Change" : "Assign"}
                  />
                </div>
                {newRows.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={() => removeNewRow(row.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

/* ════════════════════════════════════════════════════════
   Leader Assign Panel — pick a family from a popup grid
   ════════════════════════════════════════════════════════ */

function LeaderAssignPanel({
  families,
  onAssign,
  buttonLabel,
}: {
  families: Family[];
  onAssign: (familyId: string, label: string) => void;
  buttonLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [expandedFamilyId, setExpandedFamilyId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs gap-0.5 text-muted-foreground hover:text-blue-400"
        onClick={() => setOpen((v) => !v)}
      >
        <UserPlus className="h-3 w-3" /> {buttonLabel}
      </Button>
      {open && (
        <div
          ref={panelRef}
          className="absolute z-20 top-full left-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 min-w-[260px] space-y-1"
        >
          <div className="grid grid-cols-2 gap-1">
            {families.map((f) => (
              <div key={f.id}>
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      onAssign(f.id.toString(), f.name);
                      setOpen(false);
                    }}
                    className="flex-1 text-left text-xs px-2.5 py-2 rounded bg-muted hover:bg-muted/80 truncate"
                    title={`Assign to ${f.name}`}
                  >
                    {familyEmoji(f.id)} {f.name}
                  </button>
                  {(f.contactName || f.contactName2) && (
                    <button
                      onClick={() => setExpandedFamilyId((prev) => prev === f.id ? null : f.id)}
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
                {expandedFamilyId === f.id && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {f.contactName && (
                      <button
                        onClick={() => {
                          onAssign(f.id.toString(), `${f.contactName} (${f.name})`);
                          setOpen(false);
                        }}
                        className="block w-full text-left text-[10px] px-2 py-1 rounded hover:bg-blue-900/30 text-blue-400"
                      >
                        → {f.contactName}
                      </button>
                    )}
                    {f.contactName2 && (
                      <button
                        onClick={() => {
                          onAssign(f.id.toString(), `${f.contactName2} (${f.name})`);
                          setOpen(false);
                        }}
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
        </div>
      )}
    </div>
  );
}
