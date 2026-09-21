import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/require-permission";
import { canManageReservations } from "@/lib/permissions";
import { ReservationService } from "@/lib/data-access/reservations";
import { updateReservationStatusSchema } from "@/lib/validation/reservation-admin";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/admin/reservations/[id]/status — RF-026's state list.
// Every legal status is reachable here deliberately (unlike the catalog
// workflow's fixed forward/back pair) since an agent may need to correct
// a mis-click or handle an edge case a rigid state machine can't predict.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { session, response } = await requirePermission(canManageReservations);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = updateReservationStatusSchema.parse(body);

    const reservation = await ReservationService.updateStatus(id, status, session.user.id, session.user.id);
    if (!reservation) return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
    return NextResponse.json(reservation);
  } catch (error) {
    if (error instanceof Error && error.message.includes("comprovativo")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Estado inválido", details: error.issues }, { status: 400 });
    }
    console.error("Error updating reservation status:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
