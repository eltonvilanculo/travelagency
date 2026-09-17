import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowed, chatRateLimit } from "@/lib/rate-limit";
import { askFaq } from "@/lib/faq/engine";
import { connectToHumanAgent } from "@/lib/faq/human-handoff";
import { FaqService } from "@/lib/data-access/faq";
import { chatMessageSchema } from "@/lib/validation/chat";

// Public endpoint (no auth) — the FAQ bot is meant to help visitors before
// they ever sign in. Every reply is either a locally-matched FAQ answer
// (zero external API cost, see lib/faq/engine.ts) or a handoff to a human
// via Chatwoot — logged either way for content-gap review (RF-065).
export async function POST(request: NextRequest) {
  if (!isAllowed(request, chatRateLimit)) {
    return NextResponse.json({ error: "Demasiadas mensagens, aguarde um momento" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { message, locale, contact } = chatMessageSchema.parse(body);

    const result = await askFaq(message, locale);

    if (result.status === "answered") {
      return NextResponse.json({
        type: "answer" as const,
        answer: result.answer,
        entryId: result.entryId,
        confidence: result.confidence,
      });
    }

    const handoff = await connectToHumanAgent({ message, locale, ...contact });
    await FaqService.logUnanswered(message, locale, "website", handoff.connected);

    return NextResponse.json({
      type: "handoff" as const,
      reason: result.reason,
      connected: handoff.connected,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Error in FAQ chat:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
