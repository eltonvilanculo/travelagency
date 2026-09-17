import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { prisma } from "@/lib/prisma";

// A second, independent NextAuth instance from the admin one in
// src/lib/auth.ts — its own cookie names, and Google + Facebook as
// providers (the public decision: social sign-in only, no password
// storage for customers). JWT session strategy, same as admin, so no
// NextAuth Account/Session/VerificationToken tables are needed — the one
// row we do persist (CustomerUser) is written by hand in the signIn
// event below, not by a Prisma adapter.
//
// IMPORTANT — this instance lives at /api/auth (route:
// src/app/api/auth/[...nextauth]/route.ts), NOT /api/admin-auth where you
// might expect the "other" instance to be, and not at a dedicated
// /api/customer-auth either (that was tried first and is wrong — see
// below). This is not arbitrary: NextAuth v4's App Router integration
// hardcodes "/api/auth" as the base it uses when constructing an OAuth
// redirect_uri (core/utils/parse-url.js's `defaultUrl`), and there is no
// authOptions field to override it. Confirmed the hard way — mounting
// this instance at /api/customer-auth still sent Google
// "http://.../api/auth/callback/google" as redirect_uri, causing a
// redirect_uri_mismatch, because the *origin* NextAuth derives from
// (protocol+host only, no path) always falls back to that hardcoded
// default. Since the admin instance only ever uses CredentialsProvider —
// which never builds an external redirect_uri — it's the one that can
// safely live off the default path instead (now /api/admin-auth). If
// this ever gets upgraded to Auth.js v5 (which does support a
// configurable basePath), this whole path-swap workaround can be undone.
//
// Both providers map to the same CustomerUser row by email — the same
// person signing in with Google once and Facebook another time is still
// one customer, not two. googleId/facebookId are stored side by side so
// either provider can be recognised on a later sign-in without disturbing
// the other's id.
//
// The two providers' *raw* profile shapes differ (Google: {sub, picture};
// Facebook: {id, picture: {data: {url}}}) — the callbacks below branch on
// account.provider to read the right one. This is deliberately reading
// the raw OAuth profile, not the provider's own normalised `profile()`
// output (which is what `user` would give us) — see each provider's
// source in next-auth/providers/{google,facebook}.js if this ever needs
// re-checking against a next-auth upgrade.
//
// 2026-09-16: signing in is now REQUIRED to submit a reservation (single
// or trip) — see /api/reservations and /api/reservations/trip, which both
// 401 without a session. Browsing catalog pages and *building* a trip
// stack in the drawer still need no account; only the final submit does.
function extractProviderId(provider: string | undefined, profile: Record<string, unknown>): string | null {
  if (provider === "facebook") return typeof profile.id === "string" ? profile.id : null;
  return typeof profile.sub === "string" ? profile.sub : null;
}

function extractPicture(provider: string | undefined, profile: Record<string, unknown>): string | undefined {
  if (provider === "facebook") {
    const picture = profile.picture as { data?: { url?: string } } | undefined;
    return picture?.data?.url;
  }
  return typeof profile.picture === "string" ? profile.picture : undefined;
}

export const customerAuthOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  // All three renamed, not just sessionToken — the admin instance
  // (src/lib/auth.ts) never overrides NextAuth's own cookie names, so
  // csrfToken/callbackUrl would otherwise both be plain
  // "next-auth.csrf-token"/"next-auth.callback-url" at Path=/ on *both*
  // instances. Same browser, same names, same path: an admin testing
  // their own login and a customer login around the same time would
  // silently clobber each other's CSRF cookie, breaking whichever
  // instance's form submits second (found while verifying the Facebook
  // provider below — pre-existing, not introduced by it).
  cookies: {
    sessionToken: {
      name: "zt_customer_session",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    csrfToken: {
      name: "zt_customer_csrf",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    callbackUrl: {
      name: "zt_customer_callback",
      options: { sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }) {
      if (profile?.email) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = extractPicture(account?.provider, profile as Record<string, unknown>);
        token.sub = extractProviderId(account?.provider, profile as Record<string, unknown>) ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
        session.user.image = (token.picture as string | undefined) ?? session.user.image;
      }
      return session;
    },
  },
  events: {
    // Upsert-by-email so the same person always maps to the same
    // CustomerUser row, regardless of which of the two providers they
    // used this time — only the id field for *that* provider is touched;
    // the other stays whatever it already was (undefined in a Prisma
    // update means "leave this field alone", not "clear it").
    async signIn({ profile, account }) {
      if (!profile?.email) return;
      const raw = profile as Record<string, unknown>;
      const providerId = extractProviderId(account?.provider, raw);
      const image = extractPicture(account?.provider, raw);
      const isFacebook = account?.provider === "facebook";

      await prisma.customerUser.upsert({
        where: { email: profile.email },
        update: {
          name: profile.name ?? undefined,
          image: image ?? undefined,
          googleId: !isFacebook ? providerId ?? undefined : undefined,
          facebookId: isFacebook ? providerId ?? undefined : undefined,
        },
        create: {
          email: profile.email,
          name: profile.name ?? null,
          image: image ?? null,
          googleId: !isFacebook ? providerId : null,
          facebookId: isFacebook ? providerId : null,
        },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Server-side helper — the current signed-in customer's session, or null
 * for an anonymous visitor (the normal case). */
export function getCustomerSession() {
  return getServerSession(customerAuthOptions);
}

/** Resolves the session's email to a CustomerUser row (already created by
 * the signIn event above by the time this is ever called). */
export async function getCurrentCustomerUser() {
  const session = await getCustomerSession();
  if (!session?.user?.email) return null;
  return prisma.customerUser.findUnique({ where: { email: session.user.email } });
}
