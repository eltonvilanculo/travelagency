import NextAuth from "next-auth";
import { customerAuthOptions } from "@/lib/customer-auth";

// This is the customer-facing instance (Google + Facebook), deliberately
// occupying NextAuth v4's own default mount path — see the long comment
// in src/lib/customer-auth.ts for why that matters here and doesn't for
// the admin instance (now at /api/admin-auth instead).
const handler = NextAuth(customerAuthOptions);

export { handler as GET, handler as POST };
