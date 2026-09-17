"use client";

import { useEffect, useState } from "react";

type ContentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

type Destination = {
  id: string;
  slug: string;
  nameEn: string;
  namePt: string;
  country: string;
  region: string | null;
  descriptionEn: string;
  descriptionPt: string;
  taglineEn: string | null;
  taglinePt: string | null;
  seoTitleEn: string | null;
  seoTitlePt: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionPt: string | null;
  status: ContentStatus;
  sortOrder: number;
};

type FormData = {
  slug: string;
  nameEn: string;
  namePt: string;
  country: string;
  region: string;
  taglineEn: string;
  taglinePt: string;
  descriptionEn: string;
  descriptionPt: string;
  seoTitleEn: string;
  seoTitlePt: string;
  seoDescriptionEn: string;
  seoDescriptionPt: string;
  sortOrder: string;
};

const emptyForm: FormData = {
  slug: "",
  nameEn: "",
  namePt: "",
  country: "",
  region: "",
  taglineEn: "",
  taglinePt: "",
  descriptionEn: "",
  descriptionPt: "",
  seoTitleEn: "",
  seoTitlePt: "",
  seoDescriptionEn: "",
  seoDescriptionPt: "",
  sortOrder: "0",
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

// RF-015: draft → review → approved → published, plus archive/unpublish.
// Each entry is [next status, button label] for the primary action, and an
// optional secondary (demoting) action.
const STATUS_ACTIONS: Record<ContentStatus, { primary?: [ContentStatus, string]; secondary?: [ContentStatus, string] }> = {
  DRAFT: { primary: ["IN_REVIEW", "Enviar para revisão"] },
  IN_REVIEW: { primary: ["APPROVED", "Aprovar"], secondary: ["DRAFT", "Devolver a rascunho"] },
  APPROVED: { primary: ["PUBLISHED", "Publicar"], secondary: ["DRAFT", "Devolver a rascunho"] },
  PUBLISHED: { secondary: ["APPROVED", "Remover Publicação"] },
  ARCHIVED: { primary: ["DRAFT", "Restaurar para rascunho"] },
};

export function DestinosClient() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Plain async fetch, no setState of its own — safe to call from the
  // mount effect below (react-hooks/set-state-in-effect disallows setState
  // synchronously at the top of an effect; this only touches state in the
  // .then/.catch/.finally callbacks, after the fetch has already resolved).
  const loadDestinations = async (): Promise<Destination[]> => {
    const response = await fetch("/api/admin/destinations");
    if (!response.ok) throw new Error("Falha ao carregar destinos");
    return response.json();
  };

  // Stateful wrapper for refetching after a user-initiated mutation
  // (create/edit/delete/status change) — synchronous setLoading/setError
  // here is fine since it's a button-click handler, not an effect body.
  const fetchDestinations = async () => {
    setLoading(true);
    setError(null);
    try {
      setDestinations(await loadDestinations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadDestinations()
      .then((data) => {
        if (!cancelled) setDestinations(data);
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

  const openEditForm = (destination: Destination) => {
    setEditingId(destination.id);
    setFormData({
      slug: destination.slug,
      nameEn: destination.nameEn,
      namePt: destination.namePt,
      country: destination.country,
      region: destination.region ?? "",
      taglineEn: destination.taglineEn ?? "",
      taglinePt: destination.taglinePt ?? "",
      descriptionEn: destination.descriptionEn,
      descriptionPt: destination.descriptionPt,
      seoTitleEn: destination.seoTitleEn ?? "",
      seoTitlePt: destination.seoTitlePt ?? "",
      seoDescriptionEn: destination.seoDescriptionEn ?? "",
      seoDescriptionPt: destination.seoDescriptionPt ?? "",
      sortOrder: String(destination.sortOrder),
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
      region: formData.region || undefined,
      taglineEn: formData.taglineEn || undefined,
      taglinePt: formData.taglinePt || undefined,
      seoTitleEn: formData.seoTitleEn || undefined,
      seoTitlePt: formData.seoTitlePt || undefined,
      seoDescriptionEn: formData.seoDescriptionEn || undefined,
      seoDescriptionPt: formData.seoDescriptionPt || undefined,
      sortOrder: Number(formData.sortOrder) || 0,
    };

    try {
      const url = editingId ? `/api/admin/destinations/${editingId}` : "/api/admin/destinations";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao guardar destino");
      }

      closeForm();
      await fetchDestinations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/destinations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchDestinations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/destinations/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao eliminar destino");
      }
      await fetchDestinations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{destinations.length} destino(s)</p>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
        >
          Novo destino
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <h2 className="font-semibold text-slate-900">
            {editingId ? "Editar destino" : "Novo destino"}
          </h2>

          {formError && (
            <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{formError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug">
              <input
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="cabo-delgado"
                className="input"
              />
            </Field>
            <Field label="País">
              <input
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome (PT)">
              <input
                required
                value={formData.namePt}
                onChange={(e) => setFormData({ ...formData, namePt: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Nome (EN)">
              <input
                required
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tagline (PT): linha curta para o carrossel">
              <input
                value={formData.taglinePt}
                onChange={(e) => setFormData({ ...formData, taglinePt: e.target.value })}
                placeholder="Onde o mar encontra a savana"
                className="input"
              />
            </Field>
            <Field label="Tagline (EN): short line for the carousel">
              <input
                value={formData.taglineEn}
                onChange={(e) => setFormData({ ...formData, taglineEn: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Descrição (PT)">
              <textarea
                required
                rows={3}
                value={formData.descriptionPt}
                onChange={(e) => setFormData({ ...formData, descriptionPt: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Descrição (EN)">
              <textarea
                required
                rows={3}
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Região (opcional)">
              <input
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Ordem">
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "A guardar..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">A carregar...</p>
      ) : destinations.length === 0 ? (
        <p className="text-slate-500 text-sm">Ainda sem destinos.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">País</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {destinations.map((destination) => {
                const actions = STATUS_ACTIONS[destination.status];
                return (
                  <tr key={destination.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{destination.namePt}</p>
                      <p className="text-slate-400 text-xs">{destination.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{destination.country}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[destination.status]}`}>
                        {STATUS_LABEL[destination.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button onClick={() => openEditForm(destination)} className="link-btn">
                          Editar
                        </button>
                        {actions.primary && (
                          <button
                            onClick={() => handleStatusChange(destination.id, actions.primary![0])}
                            className="link-btn"
                          >
                            {actions.primary[1]}
                          </button>
                        )}
                        {actions.secondary && (
                          <button
                            onClick={() => handleStatusChange(destination.id, actions.secondary![0])}
                            className="link-btn text-slate-400"
                          >
                            {actions.secondary[1]}
                          </button>
                        )}
                        {destination.status === "DRAFT" && (
                          <button
                            onClick={() => handleDelete(destination.id)}
                            className="link-btn text-red-500"
                          >
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
