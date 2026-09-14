-- CreateTable
CREATE TABLE "customer_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_users_email_key" ON "customer_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_users_googleId_key" ON "customer_users"("googleId");

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN "tripGroupId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "customerUserId" TEXT;

-- CreateIndex
CREATE INDEX "reservations_tripGroupId_idx" ON "reservations"("tripGroupId");

-- CreateIndex
CREATE INDEX "reservations_customerUserId_idx" ON "reservations"("customerUserId");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "customer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
