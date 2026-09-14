"use client";

import { useEffect, useState } from "react";

type ContentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

type Destination = { id: string; namePt: string; nameEn: string };

type Hotel = {
  id: string;
  slug: string;
  nameEn: string;
  namePt: string;
  destinationId: string;
  destination: Destination;
  category: string | null;
  stars: number | null;
  address: string;
  descriptionEn: string;
  descriptionPt: string;
  amenities: string[];
  pricePerNight: string;
  currency: "MZN" | "USD" | "ZAR";
  status: ContentStatus;
};

type FormData = {
  slug: string;
  nameEn: string;
  namePt: string;
  destinationId: string;
  category: string;
  stars: string;
  address: string;
  descriptionEn: string;
  descriptionPt: string;
  amenities: string;
  pricePerNight: string;
  currency: "MZN" | "USD" | "ZAR";
};

const emptyForm: FormData = {
  slug: "",
  nameEn: "",
  namePt: "",
  destinationId: "",
  category: "",
  stars: "",
  address: "",
  descriptionEn: "",
  descriptionPt: "",
  amenities: "",
  pricePerNight: "",
  currency: "USD",
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

export function HoteisClient() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadHotels = async (): Promise<Hotel[]> => {
    const response = await fetch("/api/admin/hotels");
    if (!response.ok) throw new Error("Falha ao carregar hotéis");
    return response.json();
  };

  const loadDestinations = async (): Promise<Destination[]> => {
    const response = await fetch("/api/admin/destinations");
    if (!response.ok) throw new Error("Falha ao carregar destinos");
    return response.json();
  };

  const fetchHotels = async () => {
    setLoading(true);
    setError(null);
    try {
      setHotels(await loadHotels());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadHotels(), loadDestinations()])
      .then(([h, d]) => {
        if (!cancelled) {
          setHotels(h);
          setDestinations(d);
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
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, destinationId: destinations[0]?.id ?? "" });
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (hotel: Hotel) => {
    setEditingId(hotel.id);
    setFormData({
      slug: hotel.slug,
      nameEn: hotel.nameEn,
      namePt: hotel.namePt,
      destinationId: hotel.destinationId,
      category: hotel.category ?? "",
      stars: hotel.stars != null ? String(hotel.stars) : "",
      address: hotel.address,
      descriptionEn: hotel.descriptionEn,
      descriptionPt: hotel.descriptionPt,
      amenities: hotel.amenities.join(", "),
      pricePerNight: hotel.pricePerNight,
      currency: hotel.currency,
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
      category: formData.category || undefined,
      stars: formData.stars ? Number(formData.stars) : undefined,
      amenities: formData.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      pricePerNight: Number(formData.pricePerNight) || 0,
    };

    try {
      const url = editingId ? `/api/admin/hotels/${editingId}` : "/api/admin/hotels";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao guardar hotel");
      }

      closeForm();
      await fetchHotels();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/hotels/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchHotels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/hotels/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao eliminar hotel");
      }
      await fetchHotels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{hotels.length} hotel(éis)</p>
        <button
          onClick={openCreateForm}
          disabled={destinations.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          Novo hotel
        </button>
      </div>

      {destinations.length === 0 && !loading && (
        <div className="mb-4 rounded-lg bg-amber-50 text-amber-700 text-sm px-4 py-3">
          Crie pelo menos um destino primeiro. Cada hotel pertence a um destino.
        </div>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">{editingId ? "Editar hotel" : "Novo hotel"}</h2>

          {formError && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{formError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug">
              <input
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="polana-serena-hotel"
                className="input"
              />
            </Field>
            <Field label="Destino">
              <select
                required
                value={formData.destinationId}
                onChange={(e) => setFormData({ ...formData, destinationId: e.target.value })}
                className="input"
              >
                <option value="" disabled>
                  Escolha um destino
                </option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.namePt}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome (PT)">
              <input required value={formData.namePt} onChange={(e) => setFormData({ ...formData, namePt: e.target.value })} className="input" />
            </Field>
            <Field label="Nome (EN)">
              <input required value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Descrição (PT)">
              <textarea required rows={2} value={formData.descriptionPt} onChange={(e) => setFormData({ ...formData, descriptionPt: e.target.value })} className="input" />
            </Field>
            <Field label="Descrição (EN)">
              <textarea required rows={2} value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} className="input" />
            </Field>
          </div>

          <Field label="Endereço">
            <input required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input" />
          </Field>

          <Field label="Comodidades (separadas por vírgula)">
            <input
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
              placeholder="Piscina, Spa, Restaurante, WiFi"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Categoria">
              <input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Boutique" className="input" />
            </Field>
            <Field label="Estrelas (0-5)">
              <input type="number" min={0} max={5} value={formData.stars} onChange={(e) => setFormData({ ...formData, stars: e.target.value })} className="input" />
            </Field>
            <Field label="Preço/noite">
              <input type="number" required value={formData.pricePerNight} onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })} className="input" />
            </Field>
            <Field label="Moeda">
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as FormData["currency"] })} className="input">
                <option value="USD">USD</option>
                <option value="MZN">MZN</option>
                <option value="ZAR">ZAR</option>
              </select>
            </Field>
          </div>

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
        <p className="text-slate-500 text-sm">A carregar...</p>
      ) : hotels.length === 0 ? (
        <p className="text-slate-500 text-sm">Ainda sem hotéis.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Destino</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hotels.map((hotel) => {
                const actions = STATUS_ACTIONS[hotel.status];
                return (
                  <tr key={hotel.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{hotel.namePt}</p>
                      <p className="text-slate-400 text-xs">{hotel.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{hotel.destination?.namePt}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[hotel.status]}`}>{STATUS_LABEL[hotel.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button onClick={() => openEditForm(hotel)} className="link-btn">
                          Editar
                        </button>
                        {actions.primary && (
                          <button onClick={() => handleStatusChange(hotel.id, actions.primary![0])} className="link-btn">
                            {actions.primary[1]}
                          </button>
                        )}
                        {actions.secondary && (
                          <button onClick={() => handleStatusChange(hotel.id, actions.secondary![0])} className="link-btn text-slate-400">
                            {actions.secondary[1]}
                          </button>
                        )}
                        {hotel.status === "DRAFT" && (
                          <button onClick={() => handleDelete(hotel.id)} className="link-btn text-red-500">
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
