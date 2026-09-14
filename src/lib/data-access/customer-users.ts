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
    }));
  }
}
