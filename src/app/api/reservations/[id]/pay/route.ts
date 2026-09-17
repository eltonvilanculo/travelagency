import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomerUser } from "@/lib/customer-auth";
import { PaymentService } from "@/lib/data-access/payments";
import { initiatePaymentSchema } from "@/lib/validation/payment";
import { isAllowed, paymentRateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

async function requireOwnedReservation(id: string) {
  const customerUser = await getCurrentCustomerUser();
  if (!customerUser) {
    return { ok: false as const, response: NextResponse.json({ error: "Autenticação necessária" }, { status: 401 }) };
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation || reservation.customerUserId !== customerUser.id) {
    // Same 404 whether the reservation doesn't exist or belongs to someone
    // else — a 403 would confirm the id is real, which it shouldn't for a
    // reservation that isn't yours.
    return { ok: false as const, response: NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 }) };
  }

  return { ok: true as const, reservation };
}

// POST /api/reservations/[id]/pay — the customer pays for their own
// already-quoted reservation online (Mpesa/eMola/transfer), the same path
// an agent uses from /admin/pagamentos, minus the agent-only bookkeeping
// (see PaymentService.initiateForReservation).
export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!isAllowed(request, paymentRateLimit)) {
    return NextResponse.json({ error: "Demasiadas tentativas, aguarde um momento" }, { status: 429 });
  }

  const { id } = await params;
  const owned = await requireOwnedReservation(id);
  if (!owned.ok) return owned.response;

  try {
    const body = await request.json();
    const parsed = initiatePaymentSchema.parse(body);

    const result = await PaymentService.initiateForReservation(
      {
        reservationId: id,
        method: parsed.method,
        walletNumber: parsed.method === "TRANSFER" ? undefined : parsed.walletNumber,
      },
      null
    );

    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
      }
      if (result.reason === "gateway_error") {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      return NextResponse.json({ error: "Esta reserva ainda não tem um valor confirmado para pagar" }, { status: 409 });
    }

    return NextResponse.json(result.payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Error initiating customer payment:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// GET /api/reservations/[id]/pay — poll the latest payment's status after
// initiating (Payen confirmation arrives asynchronously via webhook).
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const owned = await requireOwnedReservation(id);
  if (!owned.ok) return owned.response;

  const payment = await PaymentService.findLatestForReservation(id);
  return NextResponse.json({ reservationStatus: owned.reservation.status, payment });
}
