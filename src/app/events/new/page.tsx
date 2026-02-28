"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/app/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function NewEventPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const eventId = await createEvent(formData);
      router.push(`/events/${eventId}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Plan a New Trip" />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="familyName">Your Family Name</Label>
              <Input id="familyName" name="familyName" placeholder="e.g. Dangol Family" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Person</Label>
              <Input id="contactName" name="contactName" placeholder="e.g. Suman Dangol" required />
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
