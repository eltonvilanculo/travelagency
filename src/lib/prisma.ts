import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/database-url";

// Prisma 7's "prisma-client" generator requires an explicit driver adapter
// (see prisma/schema.prisma and the prisma-database-setup skill docs that
// `prisma init` installed under .agents/skills/). There is no implicit
// connection-string engine anymore.
function createPrismaClient() {
  // The hosted Postgres drops idle connections ("Server has closed the
  // connection", P1017). Recycle idle pooled clients quickly and keep TCP
  // alive so the pool never hands out a dead socket.
  const adapter = new PrismaPg({
    connectionString: getDatabaseUrl(),
    idleTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
    connectionTimeoutMillis: 15_000,
    max: 5,
  });
  return new PrismaClient({ adapter });
}

// Reuse a single client across Next.js hot-reloads in development so we
// don't exhaust Postgres connections on every file save.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
