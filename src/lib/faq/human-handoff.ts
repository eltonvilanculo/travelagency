type HandoffInput = {
  message: string;
  locale: "pt" | "en";
  name?: string;
  email?: string;
  phone?: string;
};

type HandoffResult =
  | { connected: true; conversationId: number }
  | { connected: false; reason: "not_configured" | "request_failed" };

function buildHandoffMessage(input: HandoffInput): string {
  const label = input.locale === "pt" ? "Pergunta do utilizador" : "User question";
  return `[FAQ bot handoff]\n${label}: ${input.message}`;
}

// Chatwoot's Public API for an "API Channel" inbox — the flow Chatwoot
// itself documents for bot-to-human handoff: create a contact, open a
// conversation on that contact, send the bot's transcript as the first
// message. Only needs the inbox's public identifier (CHATWOOT_INBOX_IDENTIFIER),
// never an account-level API token. This hasn't been exercised against a
// live Chatwoot instance in this session — verify the exact request/response
// shape against your instance's API docs (Chatwoot version can drift this)
// before relying on it in production.
//
// Deliberately never throws: if Chatwoot isn't configured yet, or the
// request fails for any reason, the caller still logs the question via
// FaqService.logUnanswered for manual follow-up — a missing/broken
// Chatwoot integration degrades to "logged for a human to see later"
// rather than breaking the chat widget.
export async function connectToHumanAgent(input: HandoffInput): Promise<HandoffResult> {
  const baseUrl = process.env.CHATWOOT_BASE_URL?.trim().replace(/\/+$/, "");
  const inboxIdentifier = process.env.CHATWOOT_INBOX_IDENTIFIER?.trim();

  if (!baseUrl || !inboxIdentifier) {
    return { connected: false, reason: "not_configured" };
  }

  try {
    const contactRes = await fetch(`${baseUrl}/public/api/v1/inboxes/${inboxIdentifier}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name || "Website visitor",
        email: input.email,
        phone_number: input.phone,
      }),
    });
    if (!contactRes.ok) return { connected: false, reason: "request_failed" };
    const contact = (await contactRes.json()) as { source_id?: string };
    if (!contact.source_id) return { connected: false, reason: "request_failed" };

    const conversationRes = await fetch(
      `${baseUrl}/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contact.source_id}/conversations`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
    );
    if (!conversationRes.ok) return { connected: false, reason: "request_failed" };
    const conversation = (await conversationRes.json()) as { id?: number };
    if (!conversation.id) return { connected: false, reason: "request_failed" };

    const messageRes = await fetch(
      `${baseUrl}/public/api/v1/inboxes/${inboxIdentifier}/contacts/${contact.source_id}/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: buildHandoffMessage(input), echo_id: `faq-bot-${Date.now()}` }),
      }
    );
    if (!messageRes.ok) return { connected: false, reason: "request_failed" };

    return { connected: true, conversationId: conversation.id };
  } catch (error) {
    console.error("[faq] Chatwoot handoff failed:", error);
    return { connected: false, reason: "request_failed" };
  }
}
