// Shared Payen webhook processing for both providers (mpesa/emola).
//
// Payen's webhook carries no signature, so its body is never trusted for
// the actual confirmation decision — it is only used to figure out *which*
// local Payment to re-check. The real status always comes from a direct
// GET /payments/{id} call back to Payen (see fetchPayment below), matching
// the pattern Xclusivo already uses for the same gateway.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/client";
import { fetchPayment } from "@/lib/payments/payen-client";
import { PaymentService } from "@/lib/data-access/payments";

const CONFIRMED_STATUSES = new Set(["SUCCEEDED", "SUCCESS", "COMPLETED", "PAID"]);
const FAILED_STATUSES = new Set(["FAILED", "CANCELLED"]);

function mapStatus(payenStatus: string): PaymentStatus | null {
  const upper = payenStatus.toUpperCase();
  if (CONFIRMED_STATUSES.has(upper)) return "CONFIRMED";
  if (FAILED_STATUSES.has(upper)) return "FAILED";
  if (upper === "EXPIRED") return "TIMEOUT";
  return null; // still pending / unrecognised — do not touch the payment
}

function extractIdentifier(body: Record<string, unknown>): string | null {
  const candidate = body.transactionId ?? body.txnRef ?? body.conversationId ?? body.providerReference ?? body.paymentId;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

export type ProcessWebhookResult = { ok: boolean; reason: string };

export async function processPayenWebhook(provider: "MPESA" | "EMOLA", rawBody: unknown): Promise<ProcessWebhookResult> {
  const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as Record<string, unknown>;
  const identifier = extractIdentifier(body);
  const reportedStatus = typeof body.status === "string" ? body.status : "";

  if (!identifier) return { ok: false, reason: "missing_identifier" };

  // Idempotency ledger: the same (identifier, reported status) pair hitting
  // this twice is a duplicate delivery of the same event and must produce
  // no further side effects — a unique-constraint violation on eventId is
  // exactly that "we've already seen this" signal, not an error.
  const eventId = `${provider}:${identifier}:${reportedStatus || "unknown"}`;
  let webhookEvent;
  try {
    webhookEvent = await prisma.webhookEvent.create({
      data: { provider: "PAYEN", eventId, payload: body as Prisma.InputJsonValue },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: true, reason: "duplicate_event" };
    }
    throw error;
  }

  const payment = await prisma.payment.findFirst({
    where: { OR: [{ providerReference: identifier }, { providerIntentId: identifier }] },
  });

  if (!payment) {
    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date() } });
    return { ok: false, reason: "payment_not_found" };
  }

  // Never trust the webhook's own status — always re-verify against Payen
  // directly using the payment id Payen itself returned at initiate time.
  let verifiedStatus: string;
  try {
    const verified = await fetchPayment(payment.providerIntentId ?? identifier);
    verifiedStatus = verified.status;
  } catch (error) {
    console.error(`[webhook/payen/${provider.toLowerCase()}] status verification failed:`, error);
    return { ok: false, reason: "verify_failed" };
  }

  const mapped = mapStatus(verifiedStatus);

  await prisma.webhookEvent.update({
    where: { id: webhookEvent.id },
    data: { paymentId: payment.id, processedAt: new Date() },
  });

  if (!mapped) return { ok: true, reason: "still_pending" };

  // updateStatus is itself idempotent (no-op if the payment is already
  // CONFIRMED) — a second SUCCESS delivery for the same payment, after the
  // eventId ledger above, still cannot double-confirm the booking.
  await PaymentService.updateStatus(payment.id, mapped, null);

  return { ok: true, reason: mapped.toLowerCase() };
}
