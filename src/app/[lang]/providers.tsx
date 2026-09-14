"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { TripProvider } from "@/lib/trip-context";

// Customer-facing session (Google sign-in, optional everywhere) lives at
// its own route, separate from the admin backoffice's SessionProvider —
// basePath keeps useSession() here from ever querying admin's endpoint.
export function PublicProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider basePath="/api/customer-auth">
      <TripProvider>{children}</TripProvider>
    </SessionProvider>
  );
}
