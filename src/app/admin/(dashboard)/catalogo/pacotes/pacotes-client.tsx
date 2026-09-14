"use client";

import { useEffect, useState } from "react";

type ContentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
type PackageTheme = "BEACH" | "SAFARI" | "ISLAND" | "LUXURY" | "CULTURAL" | "ADVENTURE" | "CITY";

const THEME_LABEL: Record<PackageTheme, string> = {
  BEACH: "Praia",
  SAFARI: "Safari",
  ISLAND: "Ilha",
  LUXURY: "Luxo",
  CULTURAL: "Cultural",
  ADVENTURE: "Aventura",
  CITY: "Cidade",
};

type Destination = { id: string; namePt: string };

type Package = {
  id: string;
  slug: string;
  nameEn: string;
  namePt: string;
  destinationId: string | null;
  destination: Destination | null;
  theme: PackageTheme | null;
  itineraryEn: string;
  itineraryPt: string;
  inclusions: string[];
  exclusions: string[];
  durationDays: number;
  pricePerPerson: string;
  currency: "MZN" | "USD" | "ZAR";
  capacity: number | null;
  status: ContentStatus;
};

type FormData = {
  slug: string;
  nameEn: string;
  namePt: string;
  destinationId: string;
  theme: PackageTheme | "";
  itineraryEn: string;
  itineraryPt: string;
  inclusions: string;
  exclusions: string;
  durationDays: string;
  pricePerPerson: string;
  currency: "MZN" | "USD" | "ZAR";
  capacity: string;
};

const emptyForm: FormData = {
  slug: "",
  nameEn: "",
  namePt: "",
  destinationId: "",
  theme: "",
  itineraryEn: "",
  itineraryPt: "",
  inclusions: "",
  exclusions: "",
  durationDays: "",
  pricePerPerson: "",
  currency: "USD",
  capacity: "",
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

export function PacotesClient() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPackages = async (): Promise<Package[]> => {
    const response = await fetch("/api/admin/packages");
    if (!response.ok) throw new Error("Falha ao carregar pacotes");
    return response.json();
  };

  const loadDestinations = async (): Promise<Destination[]> => {
    const response = await fetch("/api/admin/destinations");
    if (!response.ok) throw new Error("Falha ao carregar destinos");
    return response.json();
  };

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      setPackages(await loadPackages());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPackages(), loadDestinations()])
      .then(([p, d]) => {
        if (!cancelled) {
          setPackages(p);
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
    setFormData(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (pkg: Package) => {
    setEditingId(pkg.id);
    setFormData({
      slug: pkg.slug,
      nameEn: pkg.nameEn,
      namePt: pkg.namePt,
      destinationId: pkg.destinationId ?? "",
      theme: pkg.theme ?? "",
      itineraryEn: pkg.itineraryEn,
      itineraryPt: pkg.itineraryPt,
      inclusions: pkg.inclusions.join(", "),
      exclusions: pkg.exclusions.join(", "),
      durationDays: String(pkg.durationDays),
      pricePerPerson: pkg.pricePerPerson,
      currency: pkg.currency,
      capacity: pkg.capacity != null ? String(pkg.capacity) : "",
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
      destinationId: formData.destinationId || undefined,
      theme: formData.theme || undefined,
      inclusions: formData.inclusions.split(",").map((s) => s.trim()).filter(Boolean),
      exclusions: formData.exclusions.split(",").map((s) => s.trim()).filter(Boolean),
      durationDays: Number(formData.durationDays) || 0,
      pricePerPerson: Number(formData.pricePerPerson) || 0,
      capacity: formData.capacity ? Number(formData.capacity) : undefined,
    };

    try {
      const url = editingId ? `/api/admin/packages/${editingId}` : "/api/admin/packages";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao guardar pacote");
      }

      closeForm();
      await fetchPackages();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/packages/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao eliminar pacote");
      }
      await fetchPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{packages.length} pacote(s)</p>
        <button onClick={openCreateForm} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">
          Novo pacote
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">{editingId ? "Editar pacote" : "Novo pacote"}</h2>

          {formError && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{formError}</div>}

          <div className="grid grid-cols-3 gap-4">
            <Field label="Slug">
              <input required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="safari-kruger-3-dias" className="input" />
            </Field>
            <Field label="Destino (opcional)">
              <select value={formData.destinationId} onChange={(e) => setFormData({ ...formData, destinationId: e.target.value })} className="input">
                <option value="">Sem destino específico</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.namePt}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tema (badge)">
              <select value={formData.theme} onChange={(e) => setFormData({ ...formData, theme: e.target.value as FormData["theme"] })} className="input">
                <option value="">Sem tema</option>
                {(Object.keys(THEME_LABEL) as PackageTheme[]).map((t) => (
                  <option key={t} value={t}>
                    {THEME_LABEL[t]}
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
            <Field label="Itinerário (PT)">
              <textarea required rows={2} value={formData.itineraryPt} onChange={(e) => setFormData({ ...formData, itineraryPt: e.target.value })} className="input" />
            </Field>
            <Field label="Itinerário (EN)">
              <textarea required rows={2} value={formData.itineraryEn} onChange={(e) => setFormData({ ...formData, itineraryEn: e.target.value })} className="input" />
            </Field>
          </div>

          <Field label="Incluído (separado por vírgula)">
            <input value={formData.inclusions} onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })} placeholder="Voos, Alojamento, Pequeno-almoço" className="input" />
          </Field>
          <Field label="Não incluído (separado por vírgula)">
            <input value={formData.exclusions} onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })} placeholder="Seguro de viagem, Extras" className="input" />
          </Field>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Duração (dias)">
              <input type="number" required value={formData.durationDays} onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })} className="input" />
            </Field>
            <Field label="Preço/pessoa">
              <input type="number" required value={formData.pricePerPerson} onChange={(e) => setFormData({ ...formData, pricePerPerson: e.target.value })} className="input" />
            </Field>
            <Field label="Moeda">
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as FormData["currency"] })} className="input">
                <option value="USD">USD</option>
                <option value="MZN">MZN</option>
                <option value="ZAR">ZAR</option>
              </select>
            </Field>
            <Field label="Capacidade">
              <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="input" />
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
      ) : packages.length === 0 ? (
        <p className="text-slate-500 text-sm">Ainda sem pacotes.</p>
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
              {packages.map((pkg) => {
                const actions = STATUS_ACTIONS[pkg.status];
                return (
                  <tr key={pkg.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{pkg.namePt}</p>
                      <p className="text-slate-400 text-xs">{pkg.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{pkg.destination?.namePt ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[pkg.status]}`}>{STATUS_LABEL[pkg.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button onClick={() => openEditForm(pkg)} className="link-btn">
                          Editar
                        </button>
                        {actions.primary && (
                          <button onClick={() => handleStatusChange(pkg.id, actions.primary![0])} className="link-btn">
                            {actions.primary[1]}
                          </button>
                        )}
                        {actions.secondary && (
                          <button onClick={() => handleStatusChange(pkg.id, actions.secondary![0])} className="link-btn text-slate-400">
                            {actions.secondary[1]}
                          </button>
                        )}
                        {pkg.status === "DRAFT" && (
                          <button onClick={() => handleDelete(pkg.id)} className="link-btn text-red-500">
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
