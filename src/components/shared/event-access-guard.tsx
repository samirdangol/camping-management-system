"use client";

import { useState, useEffect } from "react";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function EventAccessGuard({
  eventId,
  children,
}: {
  eventId: string;
  children: React.ReactNode;
}) {
  const { familyId, isLoaded } = useCurrentFamily();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // No family selected — allow access (they'll need to pick one to do anything useful)
    if (!familyId) {
      setHasAccess(true);
      return;
    }

    // Check if family is organizer or signed up
    Promise.all([
      fetch(`/api/events/${eventId}`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
    ]).then(([event, signups]) => {
      const isOrganizer = event.organizerFamilyId === familyId;
      const isSignedUp = signups.some((s: { familyId: number }) => s.familyId === familyId);
      setHasAccess(isOrganizer || isSignedUp);
    }).catch(() => setHasAccess(false));
  }, [eventId, familyId, isLoaded]);

  if (!isLoaded || hasAccess === null) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (!hasAccess) {
    return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center space-y-2">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium">Access Denied</p>
          <p className="text-sm text-muted-foreground">
            Your selected family is not signed up for this event. Ask the organizer for an invite link.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
