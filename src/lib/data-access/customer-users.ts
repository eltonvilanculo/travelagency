import { prisma } from "@/lib/prisma";

export class CustomerUserService {
  static async findAll() {
    const users = await prisma.customerUser.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { reservations: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      createdAt: u.createdAt,
      reservationCount: u._count.reservations,
      // A customer can in principle have both linked (signed in with
      // Google once, Facebook another time — see customer-auth.ts's
      // upsert-by-email) — surfaced as a list so the admin screen can
      // show both badges rather than picking one arbitrarily.
      providers: [u.googleId ? "google" : null, u.facebookId ? "facebook" : null].filter(
        (p): p is "google" | "facebook" => p !== null
      ),
    }));
  }
}
