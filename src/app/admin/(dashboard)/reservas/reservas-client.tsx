"use client";

import { Fragment, useEffect, useRef, useState } from "react";

type ReservationStatus =
  | "RECEIVED" | "IN_REVIEW" | "QUOTE_SENT" | "AWAITING_PAYMENT"
  | "PAYMENT_PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";
type ServiceType = "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE" | "SERVICE" | "CUSTOM";

type Customer = { fullName: string; phone: string; email: string | null };
type Agent = { name: string } | null;
type Note = { id: string; body: string; createdAt: string; author: { name: string } };
type Payment = { id: string; method: string; status: string; amount: string; currency: string };

type Reservation = {
  id: string;
  reference: string;
  tripGroupId: string | null;
  serviceType: ServiceType;
  status: ReservationStatus;
  customer: Customer;
  passengers: number;
  origin: string | null;
  destinationCity: string | null;
  customerRemarks: string | null;
  quotedPrice: string | null;
  quotedCurrency: string | null;
  createdAt: string;
  agent: Agent;
  flightOffer: { origin: string; destinationLabel: string } | null;
  hotel: { namePt: string; nameEn: string } | null;
  vehicle: { category: string; model: string } | null;
  package: { namePt: string; nameEn: string } | null;
  ancillaryService: { namePt: string; nameEn: string } | null;
  payments: Payment[];
  agentNotes: Note[];
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  RECEIVED: "Recebido",
  IN_REVIEW: "Em análise",
  QUOTE_SENT: "Cotação enviada",
  AWAITING_PAYMENT: "A aguardar pagamento",
  PAYMENT_PENDING: "Pagamento pendente",
  CONFIRMED: "Confirmado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
};

const STATUS_COLOR: Record<ReservationStatus, string> = {
  RECEIVED: "bg-slate-100 text-slate-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  QUOTE_SENT: "bg-sky-100 text-sky-700",
  AWAITING_PAYMENT: "bg-purple-100 text-purple-700",
  PAYMENT_PENDING: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-slate-200 text-slate-700",
};

// The lifecycle almost always moves forward through this sequence — one
// obvious "next step" button covers the common case. REJECTED/CANCELLED
// are terminal off-ramps reachable from any non-terminal state, not part
// of the forward flow, so they (and the ability to jump/go back for a
// correction) live in the overflow menu instead of a flat 9-way select.
const FORWARD_FLOW: ReservationStatus[] = [
  "RECEIVED", "IN_REVIEW", "QUOTE_SENT", "AWAITING_PAYMENT",
  "PAYMENT_PENDING", "CONFIRMED", "COMPLETED",
];
const TERMINAL: ReservationStatus[] = ["REJECTED", "CANCELLED"];

function nextStatus(current: ReservationStatus): ReservationStatus | null {
  const idx = FORWARD_FLOW.indexOf(current);
  if (idx === -1 || idx === FORWARD_FLOW.length - 1) return null;
  return FORWARD_FLOW[idx + 1];
}

function StatusControl({
  status,
  onChange,
}: {
  status: ReservationStatus;
  onChange: (status: ReservationStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const next = nextStatus(status);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const otherOptions = (Object.keys(STATUS_LABEL) as ReservationStatus[]).filter(
    (s) => s !== status && s !== next
  );

  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[status]}`}>
        {STATUS_LABEL[status]}
      </span>
      {next && (
        <button
          onClick={() => onChange(next)}
          className="text-xs font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap"
          title={`Avançar para "${STATUS_LABEL[next]}"`}
        >
          → {STATUS_LABEL[next]}
        </button>
      )}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-slate-400 hover:text-slate-600 px-1"
          title="Mais opções de estado"
        >
          ⋯
        </button>
        {open && (
          <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
            {otherOptions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  TERMINAL.includes(s) ? "text-red-600" : "text-slate-700"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  FLIGHT: "Voo",
  HOTEL: "Hotel",
  CAR: "Viatura",
  PACKAGE: "Pacote",
  SERVICE: "Serviço",
  CUSTOM: "Personalizado",
};

function itemName(r: Reservation): string {
  if (r.flightOffer) return `${r.flightOffer.origin} → ${r.flightOffer.destinationLabel}`;
  if (r.hotel) return r.hotel.namePt;
  if (r.vehicle) return `${r.vehicle.category} · ${r.vehicle.model}`;
  if (r.package) return r.package.namePt;
  if (r.ancillaryService) return r.ancillaryService.namePt;
  if (r.serviceType === "FLIGHT" && r.origin && r.destinationCity) return `${r.origin} → ${r.destinationCity} (a cotar)`;
  return "—";
}

export function ReservasClient() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"MPESA" | "EMOLA">("MPESA");
  const [walletNumber, setWalletNumber] = useState("");
  const [collectingPayment, setCollectingPayment] = useState(false);

  const loadReservations = async (): Promise<Reservation[]> => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (serviceTypeFilter) params.set("serviceType", serviceTypeFilter);
    const response = await fetch(`/api/admin/reservations?${params.toString()}`);
    if (!response.ok) throw new Error("Falha ao carregar reservas");
    return response.json();
  };

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      setReservations(await loadReservations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadReservations()
      .then((r) => {
        if (!cancelled) setReservations(r);
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
  }, [statusFilter, serviceTypeFilter]);

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/reservations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleAddNote = async (id: string) => {
    if (!noteDraft.trim()) return;
    setSavingNote(true);
    try {
      const response = await fetch(`/api/admin/reservations/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteDraft.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao adicionar nota");
      }
      setNoteDraft("");
      await fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSavingNote(false);
    }
  };

  const handleCollectPayment = async (id: string) => {
    if (!walletNumber.trim()) return;
    setCollectingPayment(true);
    try {
      const response = await fetch(`/api/admin/reservations/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: paymentMethod, walletNumber: walletNumber.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao iniciar pagamento");
      }
      setWalletNumber("");
      await fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCollectingPayment(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-slate-500">{reservations.length} reserva(s)</p>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="">Todos os estados</option>
            {(Object.keys(STATUS_LABEL) as ReservationStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select value={serviceTypeFilter} onChange={(e) => setServiceTypeFilter(e.target.value)} className="filter-select">
            <option value="">Todos os tipos</option>
            {(Object.keys(SERVICE_TYPE_LABEL) as ServiceType[]).map((t) => (
              <option key={t} value={t}>{SERVICE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">A carregar...</p>
      ) : reservations.length === 0 ? (
        <p className="text-slate-500 text-sm">Sem reservas para os filtros selecionados.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Referência</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Pedido</th>
                <th className="text-left px-4 py-3">Preço</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.map((r) => (
                <Fragment key={r.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.reference}
                      {r.tripGroupId && (
                        <a
                          href={`/pt/viagem/${r.tripGroupId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Parte de um pedido de viagem com vários itens — abrir a cotação completa"
                          className="block text-[11px] font-normal text-orange-600 hover:underline mt-0.5"
                        >
                          {reservations.filter((x) => x.tripGroupId === r.tripGroupId).length} itens da viagem
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{r.customer.fullName}</p>
                      <p className="text-slate-400 text-xs">{r.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="text-xs text-slate-400 uppercase mr-2">{SERVICE_TYPE_LABEL[r.serviceType]}</span>
                      {itemName(r)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {r.quotedPrice ? `${r.quotedCurrency} ${Number(r.quotedPrice).toLocaleString("pt-PT")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusControl status={r.status} onChange={(s) => handleStatusChange(r.id, s)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="link-btn">
                        {expandedId === r.id ? "Fechar" : "Detalhes"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr>
                      <td colSpan={6} className="bg-slate-50 px-4 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Detalhes</p>
                            <dl className="text-sm space-y-1">
                              <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{r.customer.email || "—"}</dd></div>
                              <div className="flex justify-between"><dt className="text-slate-500">Passageiros</dt><dd>{r.passengers}</dd></div>
                              <div className="flex justify-between"><dt className="text-slate-500">Agente</dt><dd>{r.agent?.name || "Não atribuído"}</dd></div>
                              <div className="flex justify-between"><dt className="text-slate-500">Criado</dt><dd>{new Date(r.createdAt).toLocaleString("pt-PT")}</dd></div>
                            </dl>
                            {r.customerRemarks && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Observações do cliente</p>
                                <p className="text-sm text-slate-700">{r.customerRemarks}</p>
                              </div>
                            )}
                            {r.payments.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Pagamentos</p>
                                {r.payments.map((p) => (
                                  <p key={p.id} className="text-sm text-slate-700">
                                    {p.method} · {p.currency} {Number(p.amount).toLocaleString("pt-PT")} ({p.status})
                                  </p>
                                ))}
                              </div>
                            )}
                            {r.quotedPrice && r.payments.length === 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Cobrar pagamento</p>
                                <div className="flex gap-2">
                                  <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as "MPESA" | "EMOLA")}
                                    className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
                                  >
                                    <option value="MPESA">M-Pesa</option>
                                    <option value="EMOLA">e-Mola</option>
                                  </select>
                                  <input
                                    value={walletNumber}
                                    onChange={(e) => setWalletNumber(e.target.value)}
                                    placeholder="Número da carteira"
                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                  />
                                  <button
                                    onClick={() => handleCollectPayment(r.id)}
                                    disabled={collectingPayment}
                                    className="px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                  >
                                    Iniciar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Notas internas</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                              {r.agentNotes.length === 0 && <p className="text-slate-400 text-sm">Sem notas.</p>}
                              {r.agentNotes.map((note) => (
                                <div key={note.id} className="text-sm bg-white rounded-lg border border-slate-200 px-3 py-2">
                                  <p className="text-slate-700">{note.body}</p>
                                  <p className="text-slate-400 text-xs mt-1">{note.author.name} · {new Date(note.createdAt).toLocaleString("pt-PT")}</p>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder="Adicionar nota..."
                                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                              />
                              <button
                                onClick={() => handleAddNote(r.id)}
                                disabled={savingNote}
                                className="px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                              >
                                Adicionar
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .filter-select {
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          background: white;
        }
        .link-btn {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #334155;
        }
        .link-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
