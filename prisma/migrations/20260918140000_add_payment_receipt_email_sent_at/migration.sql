-- Tracks delivery of the payment receipt email so webhook retries do not
-- send duplicate receipts.
ALTER TABLE "payments"
ADD COLUMN "receiptEmailSentAt" TIMESTAMP(3);
