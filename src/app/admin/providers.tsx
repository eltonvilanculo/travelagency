"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// Moved off NextAuth's default /api/auth path (now the customer-facing
// Google/Facebook instance — see src/app/[lang]/providers.tsx for why)
// onto /api/admin-auth instead. basePath here has to match the actual
// route file at src/app/api/admin-auth/[...nextauth]/route.ts.
export function AdminProviders({ children }: { children: ReactNode }) {
  return <SessionProvider basePath="/api/admin-auth">{children}</SessionProvider>;
}
