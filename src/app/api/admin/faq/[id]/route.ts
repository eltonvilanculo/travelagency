import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/require-permission";
import { canManageFaq } from "@/lib/permissions";
import { FaqService } from "@/lib/data-access/faq";
import { updateFaqSchema } from "@/lib/validation/faq";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/admin/faq/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requirePermission(canManageFaq);
  if (response) return response;

  const { id } = await params;
  const entry = await FaqService.findById(id);
  if (!entry) return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
  return NextResponse.json(entry);
}

// PUT /api/admin/faq/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { session, response } = await requirePermission(canManageFaq);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateFaqSchema.parse(body);

    const entry = await FaqService.update(id, data, session.user.id);
    if (!entry) return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Error updating FAQ entry:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/admin/faq/[id] — only ever deletes a DRAFT.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { session, response } = await requirePermission(canManageFaq);
  if (response) return response;

  const { id } = await params;
  const result = await FaqService.deleteDraft(id, session.user.id);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Pergunta não encontrada" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Só é possível eliminar rascunhos; arquive em vez de eliminar" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
