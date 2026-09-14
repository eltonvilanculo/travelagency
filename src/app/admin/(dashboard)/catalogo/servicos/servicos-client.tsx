"use client";

import { useEffect, useState } from "react";

type ContentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

type Service = {
  id: string;
  key: string;
  nameEn: string;
  namePt: string;
  descriptionEn: string;
  descriptionPt: string;
  icon: string | null;
  status: ContentStatus;
  sortOrder: number;
};

type FormData = {
  key: string;
  nameEn: string;
  namePt: string;
  descriptionEn: string;
  descriptionPt: string;
  icon: string;
  sortOrder: string;
};

const emptyForm: FormData = {
  key: "",
  nameEn: "",
  namePt: "",
  descriptionEn: "",
  descriptionPt: "",
  icon: "",
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

const STATUS_ACTIONS: Record<ContentStatus, { primary?: [ContentStatus, string]; secondary?: [ContentStatus, string] }> = {
  DRAFT: { primary: ["IN_REVIEW", "Enviar para revisão"] },
  IN_REVIEW: { primary: ["APPROVED", "Aprovar"], secondary: ["DRAFT", "Devolver a rascunho"] },
  APPROVED: { primary: ["PUBLISHED", "Publicar"], secondary: ["DRAFT", "Devolver a rascunho"] },
  PUBLISHED: { secondary: ["APPROVED", "Remover Publicação"] },
  ARCHIVED: { primary: ["DRAFT", "Restaurar para rascunho"] },
};

export function ServicosClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadServices = async (): Promise<Service[]> => {
    const response = await fetch("/api/admin/services");
    if (!response.ok) throw new Error("Falha ao carregar serviços");
    return response.json();
  };

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      setServices(await loadServices());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadServices()
      .then((s) => {
        if (!cancelled) setServices(s);
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

  const openEditForm = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      key: service.key,
      nameEn: service.nameEn,
      namePt: service.namePt,
      descriptionEn: service.descriptionEn,
      descriptionPt: service.descriptionPt,
      icon: service.icon ?? "",
      sortOrder: String(service.sortOrder),
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
      icon: formData.icon || undefined,
      sortOrder: Number(formData.sortOrder) || 0,
    };

    try {
      const url = editingId ? `/api/admin/services/${editingId}` : "/api/admin/services";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao guardar serviço");
      }

      closeForm();
      await fetchServices();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/services/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao eliminar serviço");
      }
      await fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{services.length} serviço(s)</p>
        <button onClick={openCreateForm} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">
          Novo serviço
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">{editingId ? "Editar serviço" : "Novo serviço"}</h2>

          {formError && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{formError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Chave">
              <input required value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} placeholder="visa, insurance, tour-guide" className="input" />
            </Field>
            <Field label="Ícone (caminho)">
              <input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="/images/paths.svg" className="input" />
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
              <textarea required rows={3} value={formData.descriptionPt} onChange={(e) => setFormData({ ...formData, descriptionPt: e.target.value })} className="input" />
            </Field>
            <Field label="Descrição (EN)">
              <textarea required rows={3} value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} className="input" />
            </Field>
          </div>

          <Field label="Ordem">
            <input type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })} className="input w-32" />
          </Field>

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
      ) : services.length === 0 ? (
        <p className="text-slate-500 text-sm">Ainda sem serviços.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Chave</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((service) => {
                const actions = STATUS_ACTIONS[service.status];
                return (
                  <tr key={service.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{service.namePt}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{service.key}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[service.status]}`}>{STATUS_LABEL[service.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button onClick={() => openEditForm(service)} className="link-btn">
                          Editar
                        </button>
                        {actions.primary && (
                          <button onClick={() => handleStatusChange(service.id, actions.primary![0])} className="link-btn">
                            {actions.primary[1]}
                          </button>
                        )}
                        {actions.secondary && (
                          <button onClick={() => handleStatusChange(service.id, actions.secondary![0])} className="link-btn text-slate-400">
                            {actions.secondary[1]}
                          </button>
                        )}
                        {service.status === "DRAFT" && (
                          <button onClick={() => handleDelete(service.id)} className="link-btn text-red-500">
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
