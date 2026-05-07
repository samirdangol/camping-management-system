"use client";

import { useState, useRef } from "react";
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
import { Users, UtensilsCrossed, DollarSign, Pencil, Trash2, ExternalLink, Upload, X, Clock, ClipboardList, ChevronRight } from "lucide-react";
import { formatCurrency, blobUrl } from "@/lib/utils";
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
  reservationNo: string | null;
  checkIn: string | null;
  checkOut: string | null;
  campsiteUrl: string | null;
  imageUrl: string | null;
  organizerFamilyId: number;
  inviteCode: string;
  status: string;
  signups: Array<{
    id: number;
    adults: number;
    kids: number;
    elderly: number;
    vegetarians: number;
    notes: string | null;
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
  upcoming: "bg-blue-900/40 text-blue-300",
  active: "bg-emerald-900/40 text-emerald-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-900/40 text-red-300",
};

export function EventDashboardClient({ event }: { event: EventDashboardData }) {
  const { familyId } = useCurrentFamily();
  const router = useRouter();
  const isOrganizer = familyId === event.organizerFamilyId;

  const [editing, setEditing] = useState(false);
  const [deletingDialog, setDeletingDialog] = useState(false);
  const [imagePreview, setImagePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState(event.imageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAdults = event.signups.reduce((sum, s) => sum + s.adults, 0);
  const totalKids = event.signups.reduce((sum, s) => sum + s.kids, 0);
  const totalElderly = event.signups.reduce((sum, s) => sum + s.elderly, 0);
  const totalVegetarians = event.signups.reduce((sum, s) => sum + s.vegetarians, 0);
  const grandTotal = totalAdults + totalKids + totalElderly;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setEditImageUrl(data.url);
      } else {
        const data = await res.json().catch(() => null);
        setUploadError(data?.error || "Upload failed");
      }
    } catch {
      setUploadError("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    formData.set("imageUrl", editImageUrl || "");
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

  function openEditDialog() {
    setEditImageUrl(event.imageUrl || "");
    setUploadError("");
    setEditing(true);
  }

  const fmtDate = (d: string) => new Date(d).toISOString().split("T")[0];
  const fmtTime = (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return m === "00" ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Status + Organizer Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={STATUS_COLORS[event.status] || "bg-gray-100 text-gray-700"}>
          {event.status}
        </Badge>
        {isOrganizer && (
          <>
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeletingDialog(true)}>
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

      {/* Reservation & Campsite Info */}
      {(event.reservationNo || event.checkIn || event.checkOut || event.campsiteUrl || event.imageUrl) && (
        <Card className="bg-teal-950/30 border-teal-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Reservation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Reservation number — badge style, not big number */}
            {event.reservationNo && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Reservation #</span>
                <span className="font-mono text-sm font-semibold bg-teal-900/40 text-teal-300 px-2 py-0.5 rounded">{event.reservationNo}</span>
              </div>
            )}
            {/* Check-in / Check-out — big numbers */}
            {(event.checkIn || event.checkOut) && (
              <div className={`grid text-center gap-4 ${event.checkIn && event.checkOut ? "grid-cols-2" : "grid-cols-1"}`}>
                {event.checkIn && (
                  <div>
                    <div className="text-2xl font-bold">{fmtTime(event.checkIn)}</div>
                    <div className="text-xs text-muted-foreground">Check-in</div>
                  </div>
                )}
                {event.checkOut && (
                  <div>
                    <div className="text-2xl font-bold">{fmtTime(event.checkOut)}</div>
                    <div className="text-xs text-muted-foreground">Check-out</div>
                  </div>
                )}
              </div>
            )}
            {(event.campsiteUrl || event.imageUrl) && (
              <div className="flex items-center gap-4 pt-1 border-t border-teal-800/30">
                {event.campsiteUrl && (
                  <a href={event.campsiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                    Campsite Official Page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {event.imageUrl && (
                  <button type="button" onClick={() => setImagePreview(true)} className="block cursor-zoom-in ml-auto">
                    <img src={blobUrl(event.imageUrl)} alt="Campsite info" className="rounded-lg border h-16 w-auto object-cover shadow-sm" />
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Families + Headcount Card — links to signup page */}
        <Card
          className="col-span-2 bg-emerald-950/30 border-emerald-800/50 cursor-pointer hover:border-emerald-600/60 transition-colors"
          onClick={() => router.push(`/events/${event.id}/signup`)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Headcount Summary
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{event.signups.length}</div>
                <div className="text-xs text-muted-foreground">Families</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{grandTotal}</div>
                <div className="text-xs text-muted-foreground">People</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalVegetarians}</div>
                <div className="text-xs text-muted-foreground">Vegetarian</div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-3 text-sm text-muted-foreground">
              <span>{totalAdults} adults</span>
              <span>{totalKids} kids</span>
              <span>{totalElderly} elderly</span>
            </div>
          </CardContent>
        </Card>

        {/* Planning Card — amber theme, big numbers grid */}
        <Card className="col-span-2 bg-amber-950/30 border-amber-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Meals", count: event._count.meals, href: `/events/${event.id}/meals` },
                { label: "Activities", count: event._count.activities, href: `/events/${event.id}/activities` },
                { label: "Grocery", count: event._count.groceryItems, href: `/events/${event.id}/groceries` },
                { label: "Equipment", count: event._count.equipment, href: `/events/${event.id}/equipment` },
              ].map(({ label, count, href }) => (
                <button
                  key={label}
                  onClick={() => router.push(href)}
                  className="rounded-lg py-2 hover:bg-amber-900/30 transition-colors group"
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                    {label}
                    <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card — navigates to expenses */}
        <Card
          className="col-span-2 bg-emerald-950/30 border-emerald-800/50 cursor-pointer hover:border-emerald-600/60 transition-colors"
          onClick={() => router.push(`/events/${event.id}/expenses`)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Expenses
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(event.totalExpenses)}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              {event.signups.length > 0 && (
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(event.totalExpenses / event.signups.length)}</div>
                  <div className="text-xs text-muted-foreground">Per family</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <InviteLinkCard inviteCode={event.inviteCode} />


      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

            {/* Reservation fields */}
            <div className="space-y-2">
              <Label htmlFor="edit-reservationNo">Reservation No</Label>
              <Input id="edit-reservationNo" name="reservationNo" defaultValue={event.reservationNo || ""} placeholder="e.g. RES-12345" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-checkIn">Check-in Time</Label>
                <Input id="edit-checkIn" name="checkIn" type="time" defaultValue={event.checkIn || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-checkOut">Check-out Time</Label>
                <Input id="edit-checkOut" name="checkOut" type="time" defaultValue={event.checkOut || ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-campsiteUrl">Campsite Official Page</Label>
              <Input id="edit-campsiteUrl" name="campsiteUrl" defaultValue={event.campsiteUrl || ""} placeholder="https://parks.wa.gov/..." />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>Campsite Screenshot / Info</Label>
              {editImageUrl ? (
                <div className="relative inline-block">
                  <img src={blobUrl(editImageUrl)} alt="Campsite" className="rounded-lg border max-h-40 object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => { setEditImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                </div>
              )}
            </div>

            {/* Organizer dropdown */}
            {event.signups.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="edit-organizer">Organizer</Label>
                <select
                  id="edit-organizer"
                  name="organizerFamilyId"
                  defaultValue={event.organizerFamilyId}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {event.signups.map((s) => (
                    <option key={s.family.id} value={s.family.id}>
                      {s.family.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

      {/* Image Preview Lightbox */}
      {event.imageUrl && (
        <Dialog open={imagePreview} onOpenChange={setImagePreview}>
          <DialogContent className="max-w-3xl p-2">
            <DialogHeader className="sr-only">
              <DialogTitle>Campsite Image</DialogTitle>
              <DialogDescription>Full size campsite screenshot</DialogDescription>
            </DialogHeader>
            <img src={blobUrl(event.imageUrl)} alt="Campsite info" className="rounded-lg w-full h-auto" />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingDialog} onOpenChange={setDeletingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{event.title}&quot;? This will remove all signups, meals, activities, groceries, equipment, and expenses. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
