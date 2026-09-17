import { NextRequest, NextResponse } from "next/server";
import { processPayenWebhook } from "@/lib/payments/payen-webhook";

// POST /api/webhooks/payen/emola — registered with Payen as the e-Mola
// callback target. See payen-webhook.ts for why the body itself is never
// trusted for the confirmation decision.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  console.log("[webhook/payen/emola] received:", JSON.stringify(body));

  try {
    const result = await processPayenWebhook("EMOLA", body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[webhook/payen/emola] processing failed:", error);
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
