"use client";

import { useEffect, useState } from "react";

type PaymentStatus = "PENDING" | "AUTHORIZED" | "RECEIVED" | "RECONCILED" | "CONFIRMED" | "FAILED" | "TIMEOUT" | "DIVERGENT" | "CANCELLED";
type PaymentMethod = "MPESA" | "EMOLA" | "TRANSFER";

type Payment = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  currency: string;
  walletMasked: string | null;
  providerIntentId: string | null;
  createdAt: string;
  respondedAt: string | null;
  reservation: {
    reference: string;
    customer: { fullName: string; phone: string };
    agent: { name: string } | null;
  };
};

type Summary = { pending: number; confirmed: number; failed: number; totalConfirmedAmount: number };

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  AUTHORIZED: "Autorizado",
  RECEIVED: "Recebido",
  RECONCILED: "Reconciliado",
  CONFIRMED: "Confirmado",
  FAILED: "Falhado",
  TIMEOUT: "Expirado",
  DIVERGENT: "Divergente",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  AUTHORIZED: "bg-sky-100 text-sky-700",
  RECEIVED: "bg-sky-100 text-sky-700",
  RECONCILED: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  TIMEOUT: "bg-red-100 text-red-700",
  DIVERGENT: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const METHOD_LABEL: Record<PaymentMethod, string> = { MPESA: "M-Pesa", EMOLA: "e-Mola", TRANSFER: "Transferência" };

export function PagamentosClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const loadPayments = async (): Promise<Payment[]> => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (methodFilter) params.set("method", methodFilter);
    const response = await fetch(`/api/admin/payments?${params.toString()}`);
    if (!response.ok) throw new Error("Falha ao carregar pagamentos");
    return response.json();
  };

  const loadSummary = async (): Promise<Summary> => {
    const response = await fetch("/api/admin/payments/summary");
    if (!response.ok) throw new Error("Falha ao carregar resumo");
    return response.json();
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, s] = await Promise.all([loadPayments(), loadSummary()]);
      setPayments(p);
      setSummary(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPayments(), loadSummary()])
      .then(([p, s]) => {
        if (!cancelled) {
          setPayments(p);
          setSummary(s);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, methodFilter]);

  const handleStatusChange = async (id: string, status: PaymentStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/payments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return (
    <div>
      {/* Summary tiles */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryTile label="Pendentes" value={String(summary.pending)} />
          <SummaryTile label="Confirmados" value={String(summary.confirmed)} />
          <SummaryTile label="Falhados / cancelados" value={String(summary.failed)} />
          <SummaryTile label="Total confirmado" value={summary.totalConfirmedAmount.toLocaleString("pt-PT")} highlight />
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-slate-500">{payments.length} pagamento(s)</p>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="">Todos os estados</option>
            {(Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="filter-select">
            <option value="">Todos os métodos</option>
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{METHOD_LABEL[m]}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">A carregar...</p>
      ) : payments.length === 0 ? (
        <p className="text-slate-500 text-sm">Sem pagamentos para os filtros selecionados.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Reserva</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Método</th>
                <th className="text-left px-4 py-3">Valor</th>
                <th className="text-left px-4 py-3">Carteira</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.reservation.reference}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{p.reservation.customer.fullName}</p>
                    <p className="text-slate-400 text-xs">{p.reservation.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{METHOD_LABEL[p.method]}</td>
                  <td className="px-4 py-3 text-slate-900">{p.currency} {Number(p.amount).toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.walletMasked || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value as PaymentStatus)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_COLOR[p.status]}`}
                    >
                      {(Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        Pagamentos são iniciados a partir de uma reserva já cotada (separador Reservas), através do gateway Payen
        (M-Pesa / e-Mola). O estado muda automaticamente quando o webhook do Payen confirma o pagamento; a mudança
        manual aqui serve para qualquer caso que o webhook não cubra.
      </p>

      <style jsx>{`
        .filter-select {
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          background: white;
        }
      `}</style>
    </div>
  );
}

function SummaryTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${highlight ? "text-orange-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
