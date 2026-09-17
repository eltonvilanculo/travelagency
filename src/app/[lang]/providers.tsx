"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { TripProvider } from "@/lib/trip-context";

// Customer-facing session (Google/Facebook sign-in, required to submit a
// reservation — see customer-auth.ts) lives at /api/auth — NextAuth v4's
// own default path, no basePath override needed here. It has to be the
// one at the default: NextAuth v4 hardcodes "/api/auth" as the base it
// uses when building an OAuth redirect_uri, with no per-instance
// override, so whichever instance actually calls an OAuth provider must
// live there. The admin backoffice instance (CredentialsProvider only,
// never builds a redirect_uri) is the one that moved instead — see
// AdminProviders in src/app/admin/providers.tsx.
export function PublicProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TripProvider>{children}</TripProvider>
    </SessionProvider>
  );
}
