import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/require-permission";
import { canManagePayments } from "@/lib/permissions";
import { PaymentService } from "@/lib/data-access/payments";
import { initiatePaymentSchema } from "@/lib/validation/payment";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/admin/reservations/[id]/payments — agent initiates payment
// collection for a quoted reservation (RF-026: -> AWAITING_PAYMENT).
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { session, response } = await requirePermission(canManagePayments);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = initiatePaymentSchema.parse(body);

    const result = await PaymentService.initiateForReservation(
      {
        reservationId: id,
        method: parsed.method,
        walletNumber: parsed.method === "TRANSFER" ? undefined : parsed.walletNumber,
      },
      session.user.id
    );

    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
      }
      if (result.reason === "gateway_error") {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      return NextResponse.json({ error: "Reserva ainda não tem uma cotação para cobrar" }, { status: 409 });
    }

    return NextResponse.json(result.payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Error initiating payment:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
