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
const CONTACT_STORAGE_KEY = "zt_trip_contact_v1";

/** The four contact fields, shared between the main booking form and the
 * "Minha Viagem" drawer so filling them in once carries over — and so
 * they survive the full-page redirect a mandatory Google sign-in causes
 * (localStorage persists across that; component state does not). */
export type TripContact = {
  fullName: string;
  phone: string;
  email: string;
  remarks: string;
};

const EMPTY_CONTACT: TripContact = { fullName: "", phone: "", email: "", remarks: "" };

type TripContextValue = {
  items: TripItem[];
  addItem: (item: Omit<TripItem, "localId">) => void;
  removeItem: (localId: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  contact: TripContact;
  setContact: (patch: Partial<TripContact>) => void;
  /** Shared with FaqChat so the trip drawer and the chat widget never sit
   * open on top of each other — both are fixed bottom-right panels, and
   * having each own its open state independently meant one could cover
   * the other's trigger/content with no way to tell they were both live. */
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TripItem[]>([]);
  const [contact, setContactState] = useState<TripContact>(EMPTY_CONTACT);
  const [isOpen, setIsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
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
      try {
        const raw = window.localStorage.getItem(CONTACT_STORAGE_KEY);
        if (raw) setContactState((prev) => ({ ...prev, ...JSON.parse(raw) }));
      } catch {
        // Same — start blank rather than crash.
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contact));
    } catch {
      // Storage full/blocked — contact fields still work for this page view.
    }
  }, [contact, hydrated]);

  const addItem = useCallback((item: Omit<TripItem, "localId">) => {
    setItems((prev) => [...prev, { ...item, localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
    setIsOpen(true);
    setChatOpen(false);
  }, []);

  const removeItem = useCallback((localId: string) => {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => {
    setIsOpen(true);
    setChatOpen(false);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const openChat = useCallback(() => {
    setChatOpen(true);
    setIsOpen(false);
  }, []);
  const closeChat = useCallback(() => setChatOpen(false), []);
  const setContact = useCallback((patch: Partial<TripContact>) => {
    setContactState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ items, addItem, removeItem, clear, isOpen, open, close, contact, setContact, chatOpen, openChat, closeChat }),
    [items, addItem, removeItem, clear, isOpen, open, close, contact, setContact, chatOpen, openChat, closeChat]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within a TripProvider");
  return ctx;
}
