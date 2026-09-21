-- Receipts for manual bank-transfer payments.
ALTER TABLE "payments"
ADD COLUMN "customerReceiptData" TEXT,
ADD COLUMN "agentReceiptData" TEXT;
