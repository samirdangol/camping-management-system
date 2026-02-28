"use client";

import { useState, useEffect } from "react";
import { useCurrentFamily } from "@/hooks/use-current-family";

export function useIsOrganizer(eventId: string) {
  const { familyId } = useCurrentFamily();
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    if (!familyId || !eventId) return;
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((event) => setIsOrganizer(event.organizerFamilyId === familyId))
      .catch(() => setIsOrganizer(false));
  }, [eventId, familyId]);

  return isOrganizer;
}
