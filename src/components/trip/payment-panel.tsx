"use client";

import { useState } from "react";
import Image from "next/image";
import { formatMZN, formatUSDApprox } from "@/lib/currency";
import type { Locale } from "@/i18n/config";

type Method = "MPESA" | "EMOLA" | "TRANSFER";

type PaymentPanelProps = {
  reservationId: string;
  itemName: string;
  amount: number;
  currency: string;
  locale: Locale;
};

const COPY = {
  pt: {
    payNow: "Pagar agora",
    method: "Método de pagamento",
    transfer: "Transferência",
    wallet: "Número (Mpesa/eMola)",
    submit: "Confirmar pagamento",
    submitting: "A processar...",
    cancel: "Cancelar",
    statusPending: "A aguardar confirmação do pagamento...",
    statusConfirmed: "Pagamento confirmado!",
    statusFailed: "O pagamento falhou. Pode tentar novamente.",
    transferNote: "Guarde a referência da sua reserva e apresente-a no nosso escritório para pagar.",
    transferReceipt: "Comprovativo da transferência",
    transferReceiptRequired: "Anexe o comprovativo para enviar a transferência.",
    error: "Algo correu mal, tente novamente.",
  },
  en: {
    payNow: "Pay now",
    method: "Payment method",
    transfer: "Transfer",
    wallet: "Number (Mpesa/eMola)",
    submit: "Confirm payment",
    submitting: "Processing...",
    cancel: "Cancel",
    statusPending: "Waiting for payment confirmation...",
    statusConfirmed: "Payment confirmed!",
    statusFailed: "Payment failed. You can try again.",
    transferNote: "Keep your reservation reference and present it at our office to pay.",
    transferReceipt: "Transfer receipt",
    transferReceiptRequired: "Attach the receipt to submit the transfer.",
    error: "Something went wrong, please try again.",
  },
} as const;

const FAILED_STATUSES = new Set(["FAILED", "TIMEOUT", "CANCELLED", "DIVERGENT"]);
const TERMINAL_STATUSES = new Set(["CONFIRMED", ...FAILED_STATUSES]);

export function PaymentPanel({ reservationId, itemName, amount, currency, locale }: PaymentPanelProps) {
  const t = COPY[locale];
  const [expanded, setExpanded] = useState(false);
  const [method, setMethod] = useState<Method>("MPESA");
  const [wallet, setWallet] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = (attempt: number) => {
    if (attempt > 10) return;
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/reservations/${reservationId}/pay`);
        if (!res.ok) return;
        const data = await res.json();
        const s = data.payment?.status as string | undefined;
        if (s) setStatus(s);
        if (s && !TERMINAL_STATUSES.has(s)) poll(attempt + 1);
      } catch {
        // best-effort polling — a missed tick just gets retried next time
      }
    }, 3000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const request = method === "TRANSFER"
        ? (() => {
            if (!receipt) throw new Error(t.transferReceiptRequired);
            const form = new FormData();
            form.append("method", method);
            form.append("receipt", receipt);
            return { body: form };
          })()
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method, walletNumber: wallet }) };
      const res = await fetch(`/api/reservations/${reservationId}/pay`, { method: "POST", ...request });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.error);
      setStatus(data.status);
      if (!TERMINAL_STATUSES.has(data.status)) poll(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "CONFIRMED") {
    return <p className="text-emerald-700 text-sm font-medium animate-pop">{t.statusConfirmed}</p>;
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="bg-orange text-white text-sm font-semibold rounded-full px-4 py-2 hover:bg-orange/90 transition-colors animate-pop cursor-pointer"
      >
        {t.payNow}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="animate-drop-in border border-darkgray/20 rounded-xl p-4 space-y-3 bg-beige/40 text-left">
      <p className="text-sm text-textdark font-medium">{itemName}</p>
      <p className="text-orange font-semibold">
        {formatMZN(amount, currency, locale)} <span className="text-darkgray text-xs font-normal">({formatUSDApprox(amount, currency, locale)})</span>
      </p>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div>
        <p className="text-xs font-medium text-darkgray mb-1.5">{t.method}</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMethod("MPESA")}
            className={`rounded-lg border-2 p-2 flex items-center justify-center h-12 transition-colors cursor-pointer ${
              method === "MPESA" ? "border-orange bg-orange/5" : "border-darkgray/20 bg-white hover:border-darkgray/40"
            }`}
            aria-label="M-Pesa"
          >
            <Image src="/images/m-pesa.jpg" alt="M-Pesa" width={64} height={28} className="h-6 w-auto object-contain rounded" />
          </button>
          <button
            type="button"
            onClick={() => setMethod("EMOLA")}
            className={`rounded-lg border-2 p-2 flex items-center justify-center h-12 transition-colors cursor-pointer ${
              method === "EMOLA" ? "border-orange bg-orange/5" : "border-darkgray/20 bg-white hover:border-darkgray/40"
            }`}
            aria-label="e-Mola"
          >
            <Image src="/images/e-mola.png" alt="e-Mola" width={64} height={28} className="h-6 w-auto object-contain" />
          </button>
          <button
            type="button"
            onClick={() => setMethod("TRANSFER")}
            className={`rounded-lg border-2 p-2 flex flex-col items-center justify-center h-12 gap-0.5 transition-colors cursor-pointer ${
              method === "TRANSFER" ? "border-orange bg-orange/5" : "border-darkgray/20 bg-white hover:border-darkgray/40"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-textdark">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 10h16M12 3 2 10h20L12 3ZM6 10v11M10 10v11M14 10v11M18 10v11" />
            </svg>
            <span className="text-[9px] font-semibold text-textdark leading-none">{t.transfer}</span>
          </button>
        </div>
      </div>

      {method !== "TRANSFER" ? (
        <label className="block text-xs font-medium text-darkgray">
          {t.wallet}
          <input
            required
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="84xxxxxxx"
            className="mt-1 w-full border border-darkgray/30 rounded-lg px-3 py-2 text-sm"
          />
        </label>
      ) : (
        <div className="space-y-2">
          <p className="text-darkgray text-xs">{t.transferNote}</p>
          <label className="block text-xs font-medium text-darkgray">
            {t.transferReceipt}
            <input
              required
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-xs"
            />
          </label>
        </div>
      )}

      {status && status !== "CONFIRMED" && (
        <p className="text-darkgray text-xs animate-fade-in">{FAILED_STATUSES.has(status) ? t.statusFailed : t.statusPending}</p>
      )}

      <div className="flex gap-3 items-center">
        <button
          type="submit"
          disabled={submitting}
          className="bg-orange text-white text-sm font-semibold rounded-full px-4 py-2 hover:bg-orange/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {submitting ? t.submitting : t.submit}
        </button>
        <button type="button" onClick={() => setExpanded(false)} className="text-darkgray text-sm hover:text-textdark cursor-pointer">
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
