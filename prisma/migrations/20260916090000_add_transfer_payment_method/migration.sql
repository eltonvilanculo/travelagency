-- Bank transfer as a third payment method, settled in person at the
-- office rather than through Payen. See PaymentMethod's own doc comment
-- in schema.prisma.
ALTER TYPE "PaymentMethod" ADD VALUE 'TRANSFER';
