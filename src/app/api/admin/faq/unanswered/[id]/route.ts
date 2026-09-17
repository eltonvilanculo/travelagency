import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { canManageFaq } from "@/lib/permissions";
import { FaqService } from "@/lib/data-access/faq";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/admin/faq/unanswered/[id] — dismiss once reviewed (turned into
// a new FAQ entry, or judged not worth one).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requirePermission(canManageFaq);
  if (response) return response;

  const { id } = await params;
  await FaqService.dismissUnanswered(id);
  return NextResponse.json({ ok: true });
}
