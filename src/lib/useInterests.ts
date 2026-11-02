"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_INTERESTS,
  loadInterests,
  saveInterests,
} from "@/data/interests";

export function useInterests() {
  const [selected, setSelected] = useState<string[]>([...DEFAULT_INTERESTS]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSelected(loadInterests());
    setReady(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setSelected(next);
    try {
      saveInterests(next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    (tag: string) => {
      persist(
        selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag],
      );
    },
    [persist, selected],
  );

  return { selected, ready, toggle, setSelected: persist };
}
