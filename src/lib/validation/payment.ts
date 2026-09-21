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

export const receiptSchema = z.string().regex(
  /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/,
  "Recibo inválido"
);

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export function receiptDataUrl(file: File): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_RECEIPT_BYTES) {
      throw new Error("O recibo deve ter entre 1 byte e 5 MB");
    }

    const type = file.type.toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(type)) {
      throw new Error("O recibo deve ser JPG, PNG, WEBP ou PDF");
    }

    return `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;
  });
}
