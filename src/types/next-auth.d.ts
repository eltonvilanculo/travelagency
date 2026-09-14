import type { AdminRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      // Optional and admin-role-less on purpose: this same ambient type is
      // shared with the customer-facing NextAuth instance
      // (src/lib/customer-auth.ts), whose sessions never set role and do
      // set image (the Google profile picture).
      role?: AdminRole;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role?: AdminRole;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AdminRole;
  }
}
