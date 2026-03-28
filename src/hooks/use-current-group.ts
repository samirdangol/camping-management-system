"use client";

import { useState, useEffect } from "react";

interface GroupContext {
  groupId: number | null;
  groupName: string | null;
  isLoaded: boolean;
}

export function useCurrentGroup(): GroupContext {
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setGroupId(data.groupId ?? null);
        setGroupName(data.groupName ?? null);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  return { groupId, groupName, isLoaded };
}
