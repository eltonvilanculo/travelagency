// Payen Gateway HTTP client — Payen-specific request/response handling only.
// No Zambi Tour business logic here (see payen-adapter.ts for that seam).
// One application, one API key: getPayenApiKey() always returns the same
// Zambi Tour key, never a per-reservation/per-tour one.

import { getPayenApiKey, getPayenBaseUrl } from "@/lib/payments/payen-config";

export type PayenProvider = "mpesa" | "emola";

export type PayenStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "SUCCESS"
  | "COMPLETED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | string;

export type PayenPayment = {
  paymentId: string;
  providerReference: string | null;
  status: PayenStatus;
  raw: unknown;
};

export class PayenError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly responseBody: unknown
  ) {
    super(message);
    this.name = "PayenError";
  }
}

function headers(idempotencyKey?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Api-Key": getPayenApiKey(),
  };
  if (idempotencyKey) h["X-Idempotency-Key"] = idempotencyKey;
  return h;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// e-Mola/M-Pesa gateways occasionally 5xx transiently — retry those, but
// never retry with a different idempotency key (see initiate() below).
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error instanceof PayenError && error.httpStatus < 500) throw error;
      if (attempt < attempts - 1) await sleep(1000 * (attempt + 1));
    }
  }
  throw lastError;
}

function parsePaymentResponse(data: unknown): PayenPayment {
  const record = data as { data?: { payment?: Record<string, unknown> }; id?: unknown; paymentId?: unknown; status?: unknown };
  const payment = record.data?.payment;
  const paymentId = String(payment?.paymentId ?? payment?.id ?? record.id ?? record.paymentId ?? "");
  const providerReference = payment?.providerReference ?? payment?.transactionId ?? payment?.txnRef ?? null;
  const status = String(payment?.status ?? record.status ?? "PENDING").toUpperCase();
  return {
    paymentId,
    providerReference: typeof providerReference === "string" ? providerReference : null,
    status,
    raw: data,
  };
}

async function request(path: string, init: RequestInit & { idempotencyKey?: string }): Promise<unknown> {
  const { idempotencyKey, ...rest } = init;
  const res = await fetch(`${getPayenBaseUrl()}${path}`, {
    ...rest,
    headers: { ...headers(idempotencyKey), ...(rest.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(15_000),
  });

  const raw = await res.text();
  let body: unknown = raw;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    /* not JSON, keep raw text */
  }

  if (!res.ok) {
    throw new PayenError(`Payen ${path} HTTP ${res.status}`, res.status, body);
  }
  return body;
}

export type InitiateParams = {
  provider: PayenProvider;
  externalRequestId: string;
  idempotencyKey: string;
  amount: number;
  payerPhoneNumber: string;
  /** e-Mola only — required by Payen's own validation rules. */
  popUpContent?: string;
  language?: "pt" | "en";
};

/** POST /payments/{mpesa|emola}/initiate — the idempotency key MUST be the
 * same value across retries of the same intended transaction (the caller
 * owns that guarantee; see PaymentService.initiateForReservation). */
export async function initiate(params: InitiateParams): Promise<PayenPayment> {
  const payload =
    params.provider === "emola"
      ? {
          payerPhoneNumber: params.payerPhoneNumber,
          amount: params.amount,
          pop_up_content: params.popUpContent ?? "Zambi Tour",
          language: params.language ?? "pt",
        }
      : {
          payerPhoneNumber: params.payerPhoneNumber,
          amount: params.amount,
        };

  const body = await withRetry(() =>
    request(`/payments/${params.provider}/initiate`, {
      method: "POST",
      idempotencyKey: params.idempotencyKey,
      body: JSON.stringify({ externalRequestId: params.externalRequestId, payload }),
    })
  );

  return parsePaymentResponse(body);
}

/** GET /payments/{paymentId} — the source of truth for a payment's real
 * status. Never trust a webhook body alone; always confirm against this. */
export async function fetchPayment(paymentId: string): Promise<PayenPayment> {
  const body = await request(`/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
  return parsePaymentResponse(body);
}

/** GET /health — lives outside the /v1 prefix (confirmed against the live
 * gateway), unlike every other endpoint here. Lightweight connectivity
 * check only, not on the request-serving path. */
export async function health(): Promise<boolean> {
  try {
    const root = getPayenBaseUrl().replace(/\/v1$/, "");
    const res = await fetch(`${root}/health`, { headers: headers(), signal: AbortSignal.timeout(5_000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Reconciliation-screen endpoints (RF-047, not wired to any UI yet) ────
//
// KNOWN GAP (confirmed live 2026-09-15): both of these 404 on the current
// dev.payen.gestaosistema.com deployment, on an otherwise-authenticated
// key ("Cannot GET /v1/payments/me/summary" / ".../history" — a routing
// 404, not a 401, so this isn't a key/permission problem). The shapes
// below follow the written docs only and are NOT verified against a real
// response. Re-check both the URL and the parsing here against an actual
// 200 before building the Finance reconciliation screen on top of them.

export type PayenSummary = {
  succeededAmountTotal: number;
  statusBreakdown: Record<string, number>;
  contactCount: number;
  raw: unknown;
};

/** GET /payments/me/summary — scoped to the authenticated app. */
export async function fetchSummary(params?: { provider?: PayenProvider; from?: Date; to?: Date }): Promise<PayenSummary> {
  const query = new URLSearchParams();
  if (params?.provider) query.set("provider", params.provider.toUpperCase());
  if (params?.from) query.set("from", params.from.toISOString());
  if (params?.to) query.set("to", params.to.toISOString());
  const suffix = query.size ? `?${query.toString()}` : "";

  const body = await request(`/payments/me/summary${suffix}`, { method: "GET" });
  const record = body as { data?: { succeededAmountTotal?: unknown; statusBreakdown?: unknown; contactCount?: unknown } };
  return {
    succeededAmountTotal: Number(record.data?.succeededAmountTotal ?? 0),
    statusBreakdown: (record.data?.statusBreakdown as Record<string, number> | undefined) ?? {},
    contactCount: Number(record.data?.contactCount ?? 0),
    raw: body,
  };
}

export type PayenHistoryPage = {
  payments: PayenPayment[];
  page: number;
  totalPages: number;
  raw: unknown;
};

/** GET /payments/me/history — paginated, for dashboards/reconciliation. */
export async function fetchHistory(params?: {
  status?: PayenStatus;
  provider?: PayenProvider;
  page?: number;
  limit?: number;
}): Promise<PayenHistoryPage> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.provider) query.set("provider", params.provider.toUpperCase());
  query.set("page", String(params?.page ?? 1));
  query.set("limit", String(params?.limit ?? 20));

  const body = await request(`/payments/me/history?${query.toString()}`, { method: "GET" });
  const record = body as { data?: { payments?: unknown[]; pagination?: { page?: unknown; totalPages?: unknown } } };
  const payments = Array.isArray(record.data?.payments) ? record.data.payments : [];
  return {
    payments: payments.map((entry) => parsePaymentResponse({ data: { payment: entry } })),
    page: Number(record.data?.pagination?.page ?? params?.page ?? 1),
    totalPages: Number(record.data?.pagination?.totalPages ?? 1),
    raw: body,
  };
}
