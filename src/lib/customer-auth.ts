import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

// A second, independent NextAuth instance from the admin one in
// src/lib/auth.ts — its own route (/api/customer-auth/[...nextauth]), its
// own cookie name, and only Google as a provider (the public decision:
// Google-only, no password storage for customers). JWT session strategy,
// same as admin, so no NextAuth Account/Session/VerificationToken tables
// are needed — the one row we do persist (CustomerUser) is written by
// hand in the signIn event below, not by a Prisma adapter.
//
// Signing in is entirely optional everywhere it's offered: guest checkout
// and the trip builder both work fully without it. This only exists so a
// customer can find their own past trip groups again.
export const customerAuthOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  cookies: {
    sessionToken: {
      name: "zt_customer_session",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = (profile as { picture?: string }).picture;
        token.sub = (profile as { sub?: string }).sub ?? token.sub;
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
    // Upsert-by-email so the same Google account always maps to the same
    // CustomerUser row across repeat sign-ins.
    async signIn({ profile }) {
      if (!profile?.email) return;
      const googleId = (profile as { sub?: string }).sub ?? null;
      await prisma.customerUser.upsert({
        where: { email: profile.email },
        update: { name: profile.name ?? undefined, image: (profile as { picture?: string }).picture ?? undefined, googleId: googleId ?? undefined },
        create: { email: profile.email, name: profile.name ?? null, image: (profile as { picture?: string }).picture ?? null, googleId },
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
