// The seam between Zambi Tour's payment flow and the Payen gateway client
// (src/lib/payments/payen-client.ts). Everything around this file — the
// Payment model, the admin dashboard, the reservation-to-payment flow, the
// webhook idempotency ledger — was built against this exact return shape
// before Payen access existed, so this is the only file that changed when
// it landed.

import { initiate, PayenError, type PayenProvider } from "@/lib/payments/payen-client";

export type InitiatePaymentInput = {
  method: "MPESA" | "EMOLA" | "TRANSFER";
  amount: number;
  currency: string;
  /** Full wallet/phone number — never persisted; the adapter is the only
   * place that ever sees it in full before it's masked for storage.
   * Not applicable to TRANSFER (settled in person, no wallet involved). */
  walletNumber?: string;
  /** Human-readable label shown in the e-Mola confirmation pop-up. */
  description: string;
  /** Zambi Tour's own identifier for this payment attempt — becomes both
   * Payen's externalRequestId and X-Idempotency-Key. Callers MUST reuse
   * the exact same value on every retry of the same intended transaction
   * (see PaymentService.initiateForReservation). Unused for TRANSFER,
   * which never calls Payen at all. */
  externalRequestId: string;
};

export type InitiatePaymentResult =
  | {
      ok: true;
      // TRANSFER never gets a Payen-issued id — there's no gateway call.
      providerIntentId: string | null;
      providerReference: string | null;
      // Matches the schema's PaymentStatus enum. Initiation acceptance is
      // never mapped straight to CONFIRMED here — RF rule: a successful
      // initiate call means Payen *accepted* the request, not that the
      // customer has actually paid. Final confirmation only ever comes
      // from the webhook/GET-verified status (see payen-webhook.ts), or
      // for TRANSFER, an agent manually confirming the funds arrived.
      status: "PENDING" | "RECEIVED" | "CONFIRMED" | "FAILED";
      rawResponse: Record<string, unknown>;
    }
  | {
      ok: false;
      error: string;
      rawResponse?: Record<string, unknown>;
    };

const SUCCEEDED = new Set(["SUCCEEDED", "SUCCESS", "COMPLETED", "PAID"]);
const FAILED = new Set(["FAILED", "CANCELLED", "EXPIRED"]);

function normalizeMozPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("258") && digits.length === 12) return digits;
  if (digits.length === 9) return `258${digits}`;
  return null;
}

function providerFor(method: "MPESA" | "EMOLA"): PayenProvider {
  return method === "MPESA" ? "mpesa" : "emola";
}

/** Payen's own request rules — checked here so a bad number/amount never
 * reaches the gateway, and so the agent gets an immediate, specific error
 * instead of a generic 400 from Payen. Only ever called for MPESA/EMOLA. */
function validate(method: "MPESA" | "EMOLA", amount: number, phone: string): string | null {
  const prefix = phone.slice(3, 5);
  if (method === "MPESA" && !["84", "85"].includes(prefix)) {
    return "M-Pesa só aceita números com prefixo 84 ou 85.";
  }
  if (method === "EMOLA") {
    if (!["86", "87"].includes(prefix)) return "e-Mola só aceita números com prefixo 86 ou 87.";
    if (amount < 100) return "O valor mínimo para e-Mola é 100 MZN.";
  }
  return null;
}

export async function initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
  // Bank transfer never touches Payen — it's settled in person, matched
  // against the reservation reference the customer brings in. No wallet,
  // no provider call, just a PENDING intent an agent confirms by hand
  // once the funds land (same manual-override path used before Payen
  // existed at all).
  if (input.method === "TRANSFER") {
    return {
      ok: true,
      providerIntentId: null,
      providerReference: null,
      status: "PENDING",
      rawResponse: { transfer: true, note: "Bank transfer — settled in person, no gateway call." },
    };
  }

  if (input.currency !== "MZN") {
    return { ok: false, error: "Pagamentos M-Pesa/e-Mola só são possíveis para cotações em MZN." };
  }

  const phone = normalizeMozPhone(input.walletNumber ?? "");
  if (!phone) {
    return { ok: false, error: "Número de carteira inválido." };
  }

  const validationError = validate(input.method, input.amount, phone);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const result = await initiate({
      provider: providerFor(input.method),
      externalRequestId: input.externalRequestId,
      idempotencyKey: input.externalRequestId,
      amount: input.amount,
      payerPhoneNumber: phone,
      popUpContent: input.description.slice(0, 60),
      language: "pt",
    });

    const status = SUCCEEDED.has(result.status) ? "CONFIRMED" : FAILED.has(result.status) ? "FAILED" : "PENDING";

    return {
      ok: true,
      providerIntentId: result.paymentId,
      providerReference: result.providerReference,
      status,
      rawResponse: result.raw as Record<string, unknown>,
    };
  } catch (error) {
    if (error instanceof PayenError) {
      return {
        ok: false,
        error: `Payen recusou o pedido (HTTP ${error.httpStatus}).`,
        rawResponse: { httpStatus: error.httpStatus, body: error.responseBody },
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Falha ao contactar o Payen: ${message}` };
  }
}

/** Keeps only the last 4 digits — the schema deliberately never stores a
 * full wallet number (NFR Pagamentos). */
export function maskWallet(walletNumber: string): string {
  const digits = walletNumber.replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}
