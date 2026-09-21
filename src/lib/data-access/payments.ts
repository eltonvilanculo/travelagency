import { prisma } from "@/lib/prisma";
import { initiatePayment, maskWallet } from "@/lib/payments/payen-adapter";
import type { PaymentMethod, PaymentStatus, Prisma } from "@/generated/prisma/client";
import { receiptSchema } from "@/lib/validation/payment";
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail } from "@/lib/email-templates";

const SAFE_ADMIN_SELECT = { id: true, name: true, email: true, role: true } as const;

function receiptAttachment(data: string | null, reference: string) {
  if (!data) return undefined;
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return undefined;
  const extension = match[1] === "application/pdf" ? "pdf" : match[1].split("/")[1] ?? "bin";
  return {
    filename: `comprovativo-${reference}.${extension}`,
    content: Buffer.from(match[2], "base64"),
    contentType: match[1],
  };
}

export type InitiateReservationPaymentInput = {
  reservationId: string;
  method: PaymentMethod;
  /** Not required for TRANSFER — settled in person, no wallet involved. */
  walletNumber?: string;
  /** Required when the customer submits a manual bank transfer. */
  customerReceiptData?: string;
};

export class PaymentService {
  private static async sendReceiptEmail(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { reservation: { include: { customer: true } } },
    });
    if (!payment || payment.status !== "CONFIRMED" || !payment.reservation.customer.email || payment.receiptEmailSentAt) return;

    const email = paymentReceiptEmail({
      customerName: payment.reservation.customer.fullName,
      reference: payment.reservation.reference,
      method: payment.method,
      amount: Number(payment.amount),
      currency: payment.currency,
      providerReference: payment.providerReference,
      paidAt: payment.respondedAt ?? new Date(),
    });
    const attachment = receiptAttachment(payment.agentReceiptData ?? payment.customerReceiptData, payment.reservation.reference);
    const result = await sendEmail({
      to: payment.reservation.customer.email,
      subject: email.subject,
      html: email.html,
      ...(attachment ? { attachments: [attachment] } : {}),
    });
    if (!result.success) {
      console.error(`Payment receipt email failed for reservation ${payment.reservation.reference}:`, result.error);
      return;
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: { receiptEmailSentAt: new Date() },
    });
  }

  /** Either an agent (RF-026: -> AWAITING_PAYMENT) or the customer
   * themselves, paying online for their own already-quoted reservation.
   * Creates (or reuses) the Payment row, calls the Payen gateway adapter,
   * and moves the reservation into the payment part of the flow. The full
   * wallet number lives only in this function's stack — it's masked before
   * anything touches the database.
   *
   * actorId is null for a customer self-service payment — AuditLog.actorId
   * and Reservation.agentId are both FK'd to AdminUser, so there is no
   * "customer" value to put there; `agentId` is simply left untouched in
   * that case rather than overwritten with something invalid.
   *
   * Idempotency: the Payment row's own id is created *before* the gateway
   * is ever called, and is reused as Payen's externalRequestId AND
   * X-Idempotency-Key. A retry of the same intended transaction (double
   * click, a timed-out first attempt) reuses whatever non-terminal Payment
   * row already exists for this reservation instead of creating a new
   * one — Payen itself also treats a repeated idempotency key as "return
   * the existing result", so this is defense in depth, not the only guard. */
  static async initiateForReservation(input: InitiateReservationPaymentInput, actorId: string | null) {
    const reservation = await prisma.reservation.findUnique({ where: { id: input.reservationId } });
    if (!reservation) return { ok: false as const, reason: "not_found" as const };
    if (!reservation.quotedPrice || !reservation.quotedCurrency) {
      return { ok: false as const, reason: "not_quoted" as const };
    }
    if (input.method === "TRANSFER" && !input.customerReceiptData && actorId === null) {
      return { ok: false as const, reason: "receipt_required" as const };
    }
    if (input.customerReceiptData) receiptSchema.parse(input.customerReceiptData);

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
          customerReceiptData: input.customerReceiptData,
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
            ...(input.customerReceiptData ? { customerReceiptData: input.customerReceiptData } : {}),
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
      data: {
        status: gatewayResult.status === "CONFIRMED" ? "CONFIRMED" : "AWAITING_PAYMENT",
        ...(gatewayResult.status === "CONFIRMED" ? { confirmedAt: new Date() } : {}),
        ...(actorId ? { agentId: actorId } : {}),
      },
    });
    if (gatewayResult.status === "CONFIRMED") await this.sendReceiptEmail(updated.id);

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

  static async findLatestForReservation(reservationId: string) {
    return prisma.payment.findFirst({
      where: { reservationId },
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
  static async updateStatus(id: string, status: PaymentStatus, actorId: string | null, agentReceiptData?: string) {
    const before = await prisma.payment.findUnique({ where: { id } });
    if (!before) return null;
    if (before.status === "CONFIRMED") return before;
    if (status === "CONFIRMED" && before.method === "TRANSFER" && !agentReceiptData) {
      throw new Error("É obrigatório anexar o comprovativo da agência para confirmar a transferência");
    }
    if (agentReceiptData) receiptSchema.parse(agentReceiptData);

    const after = await prisma.payment.update({
      where: { id },
      data: { status, respondedAt: new Date(), ...(agentReceiptData ? { agentReceiptData } : {}) },
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
    if (status === "CONFIRMED") await this.sendReceiptEmail(after.id);

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
