import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/require-permission";
import { canManageFaq } from "@/lib/permissions";
import { FaqService } from "@/lib/data-access/faq";
import { createFaqSchema } from "@/lib/validation/faq";
import { ContentStatus } from "@/generated/prisma/client";

const statusQuerySchema = z.enum(ContentStatus).optional();

// GET /api/admin/faq — list, optional ?status= filter
export async function GET(request: NextRequest) {
  const { response } = await requirePermission(canManageFaq);
  if (response) return response;

  const statusParam = statusQuerySchema.safeParse(
    request.nextUrl.searchParams.get("status") ?? undefined
  );
  if (!statusParam.success) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const entries = await FaqService.findAll(statusParam.data ? { status: statusParam.data } : {});
  return NextResponse.json(entries);
}

// POST /api/admin/faq — create (always starts as DRAFT, RF-015)
export async function POST(request: NextRequest) {
  const { session, response } = await requirePermission(canManageFaq);
  if (response) return response;

  try {
    const body = await request.json();
    const data = createFaqSchema.parse(body);
    const entry = await FaqService.create(data, session.user.id);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Error creating FAQ entry:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
