import { z } from "zod";

export const initiatePaymentSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("MPESA"), walletNumber: z.string().min(6, "Número de carteira inválido").max(30) }),
  z.object({ method: z.literal("EMOLA"), walletNumber: z.string().min(6, "Número de carteira inválido").max(30) }),
  // Bank transfer — no wallet involved, settled in person.
  z.object({ method: z.literal("TRANSFER") }),
]);

export const updatePaymentStatusSchema = z.object({
  status: z.enum(["PENDING", "AUTHORIZED", "RECEIVED", "RECONCILED", "CONFIRMED", "FAILED", "TIMEOUT", "DIVERGENT", "CANCELLED"]),
});
