import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { canManageFaq } from "@/lib/permissions";
import { FaqService } from "@/lib/data-access/faq";

// GET /api/admin/faq/unanswered — content-gap review log (RF-065)
export async function GET() {
  const { response } = await requirePermission(canManageFaq);
  if (response) return response;

  const items = await FaqService.listUnanswered();
  return NextResponse.json(items);
}
