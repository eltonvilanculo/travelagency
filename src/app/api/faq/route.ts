import { NextRequest, NextResponse } from "next/server";
import { FaqService } from "@/lib/data-access/faq";

// GET /api/faq?ids=faq-a,faq-b — public, read-only, PUBLISHED entries only.
// Used to surface a curated handful of chatbot answers directly on a page
// (booking form, payment panel) rather than only inside the chat widget —
// same content, no auth needed since it's exactly what any visitor could
// already ask the bot.
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  const ids = idsParam ? new Set(idsParam.split(",").map((id) => id.trim()).filter(Boolean)) : null;

  const entries = await FaqService.findAll({ status: "PUBLISHED" });
  const filtered = ids ? entries.filter((entry) => ids.has(entry.id)) : entries;

  return NextResponse.json(
    filtered.map((entry) => ({
      id: entry.id,
      category: entry.category,
      questionPt: entry.questionPt,
      questionEn: entry.questionEn,
      answerPt: entry.answerPt,
      answerEn: entry.answerEn,
    }))
  );
}
