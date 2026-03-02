"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/app/actions";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Users, Upload, X } from "lucide-react";

export default function NewEventPage() {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { familyId, familyName, isLoaded } = useCurrentFamily();

  // Redirect if no family selected
  useEffect(() => {
    if (isLoaded && !familyId) {
      router.replace("/select-family");
    }
  }, [isLoaded, familyId, router]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      }
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("familyId", String(familyId));
    if (imageUrl) formData.set("imageUrl", imageUrl);
    try {
      const eventId = await createEvent(formData);
      router.push(`/events/${eventId}`);
    } catch {
      setLoading(false);
    }
  }

  if (!isLoaded || !familyId) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Plan a New Trip" />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organizer info */}
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-green-50 border-green-200">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Users className="h-4 w-4 text-green-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Organizing as</p>
                <p className="font-medium text-sm">{familyName}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Trip Name</Label>
              <Input id="title" name="title" placeholder="e.g. Summer Camping 2026" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="e.g. Sun Lakes State Park" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationUrl">Location URL (optional)</Label>
              <Input id="locationUrl" name="locationUrl" placeholder="Google Maps link" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
            </div>

            {/* Reservation & Campsite */}
            <div className="space-y-2">
              <Label htmlFor="reservationNo">Reservation No (optional)</Label>
              <Input id="reservationNo" name="reservationNo" placeholder="e.g. RES-12345" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check-in Time (optional)</Label>
                <Input id="checkIn" name="checkIn" type="time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check-out Time (optional)</Label>
                <Input id="checkOut" name="checkOut" type="time" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campsiteUrl">Campsite Official Page (optional)</Label>
              <Input id="campsiteUrl" name="campsiteUrl" placeholder="https://parks.wa.gov/..." />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Campsite Screenshot / Info (optional)</Label>
              {imageUrl ? (
                <div className="relative inline-block">
                  <img src={imageUrl} alt="Campsite" className="rounded-lg border max-h-40 object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => { setImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
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
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell everyone about this trip..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Trip"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
