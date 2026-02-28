"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { updateEvent, deleteEvent, updateEventStatus } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InviteLinkCard } from "@/components/shared/invite-link-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, UtensilsCrossed, DollarSign, UserCheck, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EVENT_STATUSES } from "@/lib/constants";
import type { Family } from "@/types";

type EventDashboardData = {
  id: number;
  title: string;
  location: string;
  locationUrl: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  organizerFamilyId: number;
  inviteCode: string;
  status: string;
  signups: Array<{
    id: number;
    adults: number;
    kids: number;
    elderly: number;
    vegetarians: number;
    family: Family;
  }>;
  _count: {
    meals: number;
    activities: number;
    groceryItems: number;
    equipment: number;
    expenses: number;
  };
  totalExpenses: number;
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

export function EventDashboardClient({ event }: { event: EventDashboardData }) {
  const { familyId } = useCurrentFamily();
  const router = useRouter();
  const isOrganizer = familyId === event.organizerFamilyId;

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalAdults = event.signups.reduce((sum, s) => sum + s.adults, 0);
  const totalKids = event.signups.reduce((sum, s) => sum + s.kids, 0);
  const totalElderly = event.signups.reduce((sum, s) => sum + s.elderly, 0);
  const totalVegetarians = event.signups.reduce((sum, s) => sum + s.vegetarians, 0);
  const grandTotal = totalAdults + totalKids + totalElderly;

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    await updateEvent(event.id, formData);
    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    setSaving(true);
    await deleteEvent(event.id);
    router.push("/events");
  }

  async function handleStatusChange(status: string) {
    await updateEventStatus(event.id, status);
    router.refresh();
  }

  // Format date for input[type=date]
  const fmtDate = (d: string) => new Date(d).toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Status + Organizer Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={STATUS_COLORS[event.status] || "bg-gray-100 text-gray-700"}>
          {event.status}
        </Badge>
        {isOrganizer && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleting(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </>
        )}
      </div>

      {/* Status Quick-Change (organizer only) */}
      {isOrganizer && (
        <div className="flex flex-wrap gap-1.5">
          {EVENT_STATUSES.map((s) => (
            <Button
              key={s}
              variant={event.status === s ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 capitalize"
              onClick={() => handleStatusChange(s)}
              disabled={event.status === s}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      {event.description && (
        <p className="text-sm text-muted-foreground">{event.description}</p>
      )}

      <InviteLinkCard inviteCode={event.inviteCode} />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Families
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{event.signups.length}</div>
            <p className="text-xs text-muted-foreground">{grandTotal} people total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Headcount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-0.5">
              <div>{totalAdults} adults</div>
              <div>{totalKids} kids</div>
              <div>{totalElderly} elderly</div>
              <div>{totalVegetarians} vegetarian</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" /> Planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-0.5">
              <div>{event._count.meals} meals</div>
              <div>{event._count.activities} activities</div>
              <div>{event._count.groceryItems} grocery items</div>
              <div>{event._count.equipment} equipment</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(event.totalExpenses)}</div>
            {event.signups.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(event.totalExpenses / event.signups.length)} per family
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {event.signups.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Signed Up Families</h3>
          <div className="flex flex-wrap gap-2">
            {event.signups.map((s) => (
              <span key={s.id} className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
                {s.family.name}
                {s.family.contactName2 && (
                  <span className="ml-1 text-xs text-green-500">
                    ({s.family.contactName}, {s.family.contactName2})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
            <DialogDescription>Update the trip details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Trip Name</Label>
              <Input id="edit-title" name="title" defaultValue={event.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" name="location" defaultValue={event.location} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-locationUrl">Location URL</Label>
              <Input id="edit-locationUrl" name="locationUrl" defaultValue={event.locationUrl || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input id="edit-startDate" name="startDate" type="date" defaultValue={fmtDate(event.startDate)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input id="edit-endDate" name="endDate" type="date" defaultValue={fmtDate(event.endDate)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" name="description" defaultValue={event.description || ""} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{event.title}&quot;? This will remove all signups, meals, activities, groceries, equipment, and expenses. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
