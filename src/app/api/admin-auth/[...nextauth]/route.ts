import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Deliberately NOT at /api/auth (NextAuth v4's own default) — that path
// is reserved for the customer-auth instance instead. NextAuth v4's App
// Router integration hardcodes "/api/auth" as the base it uses when
// building an OAuth redirect_uri (see the long comment in
// src/lib/customer-auth.ts), with no per-instance override available.
// This instance only ever uses CredentialsProvider, which never builds an
// external redirect_uri, so it's the one that can safely live off the
// default path — the Google/Facebook instance cannot.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
