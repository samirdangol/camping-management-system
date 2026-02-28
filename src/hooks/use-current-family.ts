"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "cms-current-family-id";
const CHANGE_EVENT = "cms-family-changed";

export function useCurrentFamily() {
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setFamilyId(parseInt(stored, 10));
    }
    setIsLoaded(true);
  }, []);

  // Listen for changes from other hook instances
  useEffect(() => {
    function handleChange(e: Event) {
      const id = (e as CustomEvent).detail as number | null;
      setFamilyId(id);
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleChange);
  }, []);

  const setCurrentFamily = useCallback((id: number | null) => {
    setFamilyId(id);
    if (id !== null) {
      localStorage.setItem(STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Notify other hook instances
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  }, []);

  return { familyId, setCurrentFamily, isLoaded };
}
