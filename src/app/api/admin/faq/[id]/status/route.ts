import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/require-permission";
import { canManageFaq } from "@/lib/permissions";
import { FaqService } from "@/lib/data-access/faq";
import { updateFaqStatusSchema } from "@/lib/validation/faq";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/admin/faq/[id]/status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { session, response } = await requirePermission(canManageFaq);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = updateFaqStatusSchema.parse(body);
    const entry = await FaqService.updateStatus(id, status, session.user.id);
    if (!entry) return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Estado inválido", details: error.issues }, { status: 400 });
    }
    console.error("Error updating FAQ entry status:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
