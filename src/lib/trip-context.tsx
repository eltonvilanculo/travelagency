"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type TripServiceType = "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE" | "SERVICE";

export type TripItem = {
  /** Local-only id (not a reservation id) — just enough to remove one item from the stack. */
  localId: string;
  serviceType: TripServiceType;
  itemId?: string;
  name: string;
  detail: string;
  nights?: number;
  rooms?: number;
  days?: number;
  passengers?: number;
  quantity?: number;
  origin?: string;
  destinationCity?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Destination city, when the catalog item actually has one — hotels and
   * packages do (their own Destination relation), a flight's is its
   * arrival city. Cars and services aren't city-scoped in the catalog
   * (a fleet, not city listings), so this stays unset for those — real
   * absence of data, not an oversight. */
  city?: string;
  /** Price snapshot at add-time, already the live-quote total — null for an
   * unpriced item (open flight route, quote-only service), same "an agent
   * prices this by hand" case the single-item form already handles. */
  price: number | null;
  currency: string;
};

const STORAGE_KEY = "zt_trip_v1";

type TripContextValue = {
  items: TripItem[];
  addItem: (item: Omit<TripItem, "localId">) => void;
  removeItem: (localId: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TripItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount only — reading it during render
  // would desync server/client HTML (the server has no localStorage).
  // Deferred into a timer callback, never synchronously in the effect
  // body, per react-hooks/set-state-in-effect.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {
        // Corrupt or inaccessible storage — start empty rather than crash.
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full/blocked — the trip still works for this page view.
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<TripItem, "localId">) => {
    setItems((prev) => [...prev, { ...item, localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((localId: string) => {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ items, addItem, removeItem, clear, isOpen, open, close }),
    [items, addItem, removeItem, clear, isOpen, open, close]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within a TripProvider");
  return ctx;
}
