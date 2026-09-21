import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../src/lib/database-url";

// Creates (or updates the password of) the first Administrator account,
// from BOOTSTRAP_ADMIN_* env vars. There's no self-service sign-up in this
// system on purpose (BRD §9.1 — an Administrator creates every other
// account) — this script exists only to solve the very first chicken-and-
// egg problem of an empty AdminUser table. Safe to re-run; it's an upsert.
//
// Usage: npm run admin:bootstrap

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

async function main() {
  const name = process.env.BOOTSTRAP_ADMIN_NAME;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "Missing BOOTSTRAP_ADMIN_NAME / BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD in .env"
    );
    process.exitCode = 1;
    return;
  }

  if (password === "change-me-before-running") {
    console.error("Set a real BOOTSTRAP_ADMIN_PASSWORD in .env before running this.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hash(password, 12);

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name, role: "ADMINISTRATOR", isActive: true },
    create: { name, email, passwordHash, role: "ADMINISTRATOR" },
  });

  console.log(`Administrator ready: ${user.email} (id ${user.id})`);
  console.log("Remove or change BOOTSTRAP_ADMIN_PASSWORD in .env now that this has run.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
