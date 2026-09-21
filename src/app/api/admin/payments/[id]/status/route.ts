import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/require-permission";
import { canManagePayments } from "@/lib/permissions";
import { PaymentService } from "@/lib/data-access/payments";
import { updatePaymentStatusSchema } from "@/lib/validation/payment";
import { receiptDataUrl } from "@/lib/validation/payment";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/admin/payments/[id]/status — manual override, used while
// Payen isn't wired and afterwards for anything a webhook doesn't cover.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { session, response } = await requirePermission(canManagePayments);
  if (response) return response;

  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    const form = contentType.includes("multipart/form-data") ? await request.formData() : null;
    const body = form ?? await request.json();
    const { status } = updatePaymentStatusSchema.parse(form ? { status: form.get("status") } : body);
    const receiptFile = form?.get("agentReceipt");
    const agentReceiptData = receiptFile instanceof File ? await receiptDataUrl(receiptFile) : undefined;

    const payment = await PaymentService.updateStatus(id, status, session.user.id, agentReceiptData);
    if (!payment) return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof Error && /recibo|comprovativo/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Estado inválido", details: error.issues }, { status: 400 });
    }
    console.error("Error updating payment status:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
