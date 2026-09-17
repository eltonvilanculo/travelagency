-- Facebook as a second customer sign-in provider alongside Google, both
-- mapping to the same CustomerUser row by email (see customer-auth.ts).
ALTER TABLE "customer_users" ADD COLUMN "facebookId" TEXT;
CREATE UNIQUE INDEX "customer_users_facebookId_key" ON "customer_users"("facebookId");
