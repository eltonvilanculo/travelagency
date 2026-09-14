import { prisma } from "@/lib/prisma";

const SAFE_ACTOR_SELECT = { id: true, name: true, email: true, role: true } as const;

export class AuditService {
  static async findRecent(limit = 100) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: SAFE_ACTOR_SELECT } },
    });
  }
}
