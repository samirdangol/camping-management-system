"use client";

import { useParams } from "next/navigation";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { SuppliesPage } from "@/components/claimable/supplies-page";

export default function SuppliesRoute() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId, 10);
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);

  return (
    <SuppliesPage
      eventId={eid}
      familyId={familyId}
      isOrganizer={isOrganizer}
    />
  );
}
