import { prisma } from "@/lib/prisma";
import { initiatePayment, maskWallet } from "@/lib/payments/payen-adapter";
import type { PaymentMethod, PaymentStatus, Prisma } from "@/generated/prisma/client";

const SAFE_ADMIN_SELECT = { id: true, name: true, email: true, role: true } as const;

export type InitiateReservationPaymentInput = {
  reservationId: string;
  method: PaymentMethod;
  /** Not required for TRANSFER — settled in person, no wallet involved. */
  walletNumber?: string;
};

export class PaymentService {
  /** Agent-triggered: reservation has a quote, customer is ready to pay.
   * Creates (or reuses) the Payment row, calls the Payen gateway adapter,
   * and moves the reservation into the payment part of RF-026's flow. The
   * full wallet number lives only in this function's stack — it's masked
   * before anything touches the database.
   *
   * Idempotency: the Payment row's own id is created *before* the gateway
   * is ever called, and is reused as Payen's externalRequestId AND
   * X-Idempotency-Key. A retry of the same intended transaction (double
   * click, a timed-out first attempt) reuses whatever non-terminal Payment
   * row already exists for this reservation instead of creating a new
   * one — Payen itself also treats a repeated idempotency key as "return
   * the existing result", so this is defense in depth, not the only guard. */
  static async initiateForReservation(input: InitiateReservationPaymentInput, actorId: string) {
    const reservation = await prisma.reservation.findUnique({ where: { id: input.reservationId } });
    if (!reservation) return { ok: false as const, reason: "not_found" as const };
    if (!reservation.quotedPrice || !reservation.quotedCurrency) {
      return { ok: false as const, reason: "not_quoted" as const };
    }

    const existingPending = await prisma.payment.findFirst({
      where: { reservationId: reservation.id, status: { in: ["PENDING", "AUTHORIZED", "RECEIVED"] } },
      orderBy: { createdAt: "desc" },
    });

    const walletMasked = input.walletNumber ? maskWallet(input.walletNumber) : null;

    const payment =
      existingPending ??
      (await prisma.payment.create({
        data: {
          reservationId: reservation.id,
          method: input.method,
          status: "PENDING",
          walletMasked,
          amount: reservation.quotedPrice,
          currency: reservation.quotedCurrency,
        },
      }));

    const gatewayResult = await initiatePayment({
      method: input.method,
      amount: Number(reservation.quotedPrice),
      currency: reservation.quotedCurrency,
      walletNumber: input.walletNumber,
      description: `Zambi Tour ${reservation.reference}`,
      externalRequestId: payment.id,
    });

    // method/walletMasked are re-synced here even when reusing an existing
    // pending row — an agent can correct their choice (e.g. picked M-Pesa,
    // meant Transferência) on a retry, and the stored row must reflect the
    // most recent attempt, not the first one.
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: gatewayResult.ok
        ? {
            method: input.method,
            walletMasked,
            status: gatewayResult.status,
            providerIntentId: gatewayResult.providerIntentId,
            providerReference: gatewayResult.providerReference,
            rawResponse: gatewayResult.rawResponse as Prisma.InputJsonValue,
            respondedAt: new Date(),
          }
        : {
            method: input.method,
            walletMasked,
            status: "FAILED",
            rawResponse: { error: gatewayResult.error, ...(gatewayResult.rawResponse ?? {}) } as Prisma.InputJsonValue,
            respondedAt: new Date(),
          },
    });

    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      actorId,
      action: existingPending ? "payment.retry" : "payment.initiate",
      entityType: "Payment",
      entityId: updated.id,
      before: existingPending ?? undefined,
      after: updated,
    });

    if (!gatewayResult.ok) {
      return { ok: false as const, reason: "gateway_error" as const, error: gatewayResult.error };
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "AWAITING_PAYMENT", agentId: actorId },
    });

    return { ok: true as const, payment: updated };
  }

  static async findAll(options: { status?: PaymentStatus; method?: PaymentMethod } = {}) {
    return prisma.payment.findMany({
      where: { status: options.status, method: options.method },
      include: {
        reservation: { include: { customer: true, agent: { select: SAFE_ADMIN_SELECT } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        reservation: { include: { customer: true, agent: { select: SAFE_ADMIN_SELECT } } },
        webhookEvents: true,
        reconciliation: true,
      },
    });
  }

  /** Manual status override (admin) or webhook-driven status update — both
   * paths funnel through here so the CONFIRMED cascade only ever happens
   * once. A payment already CONFIRMED is a no-op: repeated webhook
   * deliveries for the same success must not re-run side effects, reset
   * confirmedAt, or write a second audit entry. */
  static async updateStatus(id: string, status: PaymentStatus, actorId: string | null) {
    const before = await prisma.payment.findUnique({ where: { id } });
    if (!before) return null;
    if (before.status === "CONFIRMED") return before;

    const after = await prisma.payment.update({
      where: { id },
      data: { status, respondedAt: new Date() },
    });

    if (status === "CONFIRMED") {
      await prisma.reservation.update({ where: { id: before.reservationId }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
    }

    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      actorId,
      action: `payment.status:${status}`,
      entityType: "Payment",
      entityId: id,
      before,
      after,
    });

    return after;
  }

  static async summary() {
    const [pending, confirmed, failed, totalConfirmedAmount] = await Promise.all([
      prisma.payment.count({ where: { status: { in: ["PENDING", "AUTHORIZED", "RECEIVED"] } } }),
      prisma.payment.count({ where: { status: "CONFIRMED" } }),
      prisma.payment.count({ where: { status: { in: ["FAILED", "TIMEOUT", "DIVERGENT", "CANCELLED"] } } }),
      prisma.payment.aggregate({ where: { status: "CONFIRMED" }, _sum: { amount: true } }),
    ]);
    return {
      pending,
      confirmed,
      failed,
      totalConfirmedAmount: Number(totalConfirmedAmount._sum.amount ?? 0),
    };
  }
}
