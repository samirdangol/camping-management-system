"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "cms-current-family-id";
const NAME_STORAGE_KEY = "cms-current-family-name";
const CHANGE_EVENT = "cms-family-changed";

export function useCurrentFamily() {
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedName = localStorage.getItem(NAME_STORAGE_KEY);
    if (stored) {
      setFamilyId(parseInt(stored, 10));
    }
    if (storedName) {
      setFamilyName(storedName);
    }
    setIsLoaded(true);
  }, []);

  // Listen for changes from other hook instances
  useEffect(() => {
    function handleChange(e: Event) {
      const detail = (e as CustomEvent).detail as {
        id: number | null;
        name: string | null;
      };
      setFamilyId(detail.id);
      setFamilyName(detail.name);
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleChange);
  }, []);

  const setCurrentFamily = useCallback(
    (id: number | null, name?: string | null) => {
      setFamilyId(id);
      setFamilyName(name ?? null);
      if (id !== null) {
        localStorage.setItem(STORAGE_KEY, String(id));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      if (name) {
        localStorage.setItem(NAME_STORAGE_KEY, name);
      } else {
        localStorage.removeItem(NAME_STORAGE_KEY);
      }
      // Notify other hook instances
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, {
          detail: { id, name: name ?? null },
        })
      );
    },
    []
  );

  return { familyId, familyName, setCurrentFamily, isLoaded };
}
