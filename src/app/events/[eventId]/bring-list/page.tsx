"use client";

import { useParams } from "next/navigation";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { BringListPage } from "@/components/claimable/bring-list-page";

export default function BringListRoute() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId, 10);
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);

  return (
    <BringListPage
      eventId={eid}
      familyId={familyId}
      isOrganizer={isOrganizer}
    />
  );
}
