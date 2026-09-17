"use client";

import { useEffect, useState } from "react";

type ContentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

type FlightOffer = {
  origin: string;
  destinationLabel: string;
  airline: string;
  status: ContentStatus;
};

type PromoFare = {
  id: string;
  labelEn: string;
  labelPt: string;
  highlightEn: string | null;
  highlightPt: string | null;
  promoPrice: string;
  currency: "MZN" | "USD" | "ZAR";
  startsAt: string;
  endsAt: string;
  active: boolean;
  featured: boolean;
  flightOffer: FlightOffer;
};

type FormData = {
  origin: string;
  destinationLabel: string;
  airline: string;
  labelPt: string;
  labelEn: string;
  highlightPt: string;
  highlightEn: string;
  promoPrice: string;
  currency: "MZN" | "USD" | "ZAR";
  startsAt: string;
  endsAt: string;
  featured: boolean;
};

const emptyForm: FormData = {
  origin: "",
  destinationLabel: "",
  airline: "",
  labelPt: "",
  labelEn: "",
  highlightPt: "",
  highlightEn: "",
  promoPrice: "",
  currency: "USD",
  startsAt: "",
  endsAt: "",
  featured: false,
};

const STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  APPROVED: "Aprovado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};

const STATUS_COLOR: Record<ContentStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-sky-100 text-sky-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

const STATUS_ACTIONS: Record<ContentStatus, { primary?: [ContentStatus, string]; secondary?: [ContentStatus, string] }> = {
  DRAFT: { primary: ["IN_REVIEW", "Enviar para revisão"] },
  IN_REVIEW: { primary: ["APPROVED", "Aprovar"], secondary: ["DRAFT", "Devolver a rascunho"] },
  APPROVED: { primary: ["PUBLISHED", "Publicar"], secondary: ["DRAFT", "Devolver a rascunho"] },
  PUBLISHED: { secondary: ["APPROVED", "Remover Publicação"] },
  ARCHIVED: { primary: ["DRAFT", "Restaurar para rascunho"] },
};

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function PromocoesClient() {
  const [fares, setFares] = useState<PromoFare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadFares = async (): Promise<PromoFare[]> => {
    const response = await fetch("/api/admin/promo-fares");
    if (!response.ok) throw new Error("Falha ao carregar ofertas");
    return response.json();
  };

  const fetchFares = async () => {
    setLoading(true);
    setError(null);
    try {
      setFares(await loadFares());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadFares()
      .then((f) => {
        if (!cancelled) setFares(f);
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
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (fare: PromoFare) => {
    setEditingId(fare.id);
    setFormData({
      origin: fare.flightOffer.origin,
      destinationLabel: fare.flightOffer.destinationLabel,
      airline: fare.flightOffer.airline,
      labelPt: fare.labelPt,
      labelEn: fare.labelEn,
      highlightPt: fare.highlightPt ?? "",
      highlightEn: fare.highlightEn ?? "",
      promoPrice: fare.promoPrice,
      currency: fare.currency,
      startsAt: toDateInput(fare.startsAt),
      endsAt: toDateInput(fare.endsAt),
      featured: fare.featured,
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      ...formData,
      highlightPt: formData.highlightPt || undefined,
      highlightEn: formData.highlightEn || undefined,
      promoPrice: Number(formData.promoPrice) || 0,
    };

    try {
      const url = editingId ? `/api/admin/promo-fares/${editingId}` : "/api/admin/promo-fares";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao guardar oferta");
      }

      closeForm();
      await fetchFares();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/promo-fares/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchFares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/promo-fares/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao eliminar oferta");
      }
      await fetchFares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{fares.length} oferta(s) de voo</p>
        <button onClick={openCreateForm} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">
          Nova oferta
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Só ofertas de voo por agora: é o único tipo com secção pública (a faixa de promoções na página inicial).
      </p>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">{editingId ? "Editar oferta" : "Nova oferta"}</h2>

          {formError && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{formError}</div>}

          <div className="grid grid-cols-3 gap-4">
            <Field label="Origem">
              <input required value={formData.origin} onChange={(e) => setFormData({ ...formData, origin: e.target.value })} placeholder="Maputo" className="input" />
            </Field>
            <Field label="Destino">
              <input required value={formData.destinationLabel} onChange={(e) => setFormData({ ...formData, destinationLabel: e.target.value })} placeholder="Joanesburgo" className="input" />
            </Field>
            <Field label="Companhia aérea">
              <input required value={formData.airline} onChange={(e) => setFormData({ ...formData, airline: e.target.value })} placeholder="LAM" className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Etiqueta (PT)">
              <input required value={formData.labelPt} onChange={(e) => setFormData({ ...formData, labelPt: e.target.value })} placeholder="OFERTA" className="input" />
            </Field>
            <Field label="Etiqueta (EN)">
              <input required value={formData.labelEn} onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })} placeholder="DEAL" className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Destaque (PT)">
              <input value={formData.highlightPt} onChange={(e) => setFormData({ ...formData, highlightPt: e.target.value })} placeholder="Voo direto, bagagem incluída" className="input" />
            </Field>
            <Field label="Destaque (EN)">
              <input value={formData.highlightEn} onChange={(e) => setFormData({ ...formData, highlightEn: e.target.value })} className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Preço">
              <input type="number" required value={formData.promoPrice} onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })} className="input" />
            </Field>
            <Field label="Moeda">
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as FormData["currency"] })} className="input">
                <option value="USD">USD</option>
                <option value="MZN">MZN</option>
                <option value="ZAR">ZAR</option>
              </select>
            </Field>
            <Field label="Válido desde">
              <input type="date" required value={formData.startsAt} onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })} className="input" />
            </Field>
            <Field label="Válido até">
              <input type="date" required value={formData.endsAt} onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })} className="input" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} />
            Destaque (tratamento visual especial no cartão)
          </label>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50">
              {saving ? "A guardar..." : "Guardar"}
            </button>
            <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">A carregar...</p>
      ) : fares.length === 0 ? (
        <p className="text-slate-500 text-sm">Ainda sem ofertas.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Rota</th>
                <th className="text-left px-4 py-3">Etiqueta</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fares.map((fare) => {
                const status = fare.flightOffer.status;
                const actions = STATUS_ACTIONS[status];
                return (
                  <tr key={fare.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {fare.flightOffer.origin} → {fare.flightOffer.destinationLabel}
                      </p>
                      <p className="text-slate-400 text-xs">{fare.flightOffer.airline}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fare.labelPt}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button onClick={() => openEditForm(fare)} className="link-btn">
                          Editar
                        </button>
                        {actions.primary && (
                          <button onClick={() => handleStatusChange(fare.id, actions.primary![0])} className="link-btn">
                            {actions.primary[1]}
                          </button>
                        )}
                        {actions.secondary && (
                          <button onClick={() => handleStatusChange(fare.id, actions.secondary![0])} className="link-btn text-slate-400">
                            {actions.secondary[1]}
                          </button>
                        )}
                        {status === "DRAFT" && (
                          <button onClick={() => handleDelete(fare.id)} className="link-btn text-red-500">
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
