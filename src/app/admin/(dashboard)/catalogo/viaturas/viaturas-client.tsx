"use client";

import { useEffect, useState } from "react";

type ContentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

type Vehicle = {
  id: string;
  category: string;
  type: string | null;
  model: string;
  seats: number;
  luggage: number | null;
  transmission: string | null;
  withDriver: boolean;
  pricePerDay: string;
  currency: "MZN" | "USD" | "ZAR";
  deposit: string | null;
  status: ContentStatus;
};

type FormData = {
  category: string;
  type: string;
  model: string;
  seats: string;
  luggage: string;
  transmission: string;
  withDriver: boolean;
  pricePerDay: string;
  currency: "MZN" | "USD" | "ZAR";
  deposit: string;
};

const emptyForm: FormData = {
  category: "",
  type: "",
  model: "",
  seats: "",
  luggage: "",
  transmission: "",
  withDriver: false,
  pricePerDay: "",
  currency: "USD",
  deposit: "",
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

export function ViaturasClient() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadVehicles = async (): Promise<Vehicle[]> => {
    const response = await fetch("/api/admin/vehicles");
    if (!response.ok) throw new Error("Falha ao carregar viaturas");
    return response.json();
  };

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      setVehicles(await loadVehicles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadVehicles()
      .then((v) => {
        if (!cancelled) setVehicles(v);
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

  const openEditForm = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      category: vehicle.category,
      type: vehicle.type ?? "",
      model: vehicle.model,
      seats: String(vehicle.seats),
      luggage: vehicle.luggage != null ? String(vehicle.luggage) : "",
      transmission: vehicle.transmission ?? "",
      withDriver: vehicle.withDriver,
      pricePerDay: vehicle.pricePerDay,
      currency: vehicle.currency,
      deposit: vehicle.deposit ?? "",
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
      type: formData.type || undefined,
      transmission: formData.transmission || undefined,
      seats: Number(formData.seats) || 0,
      luggage: formData.luggage ? Number(formData.luggage) : undefined,
      pricePerDay: Number(formData.pricePerDay) || 0,
      deposit: formData.deposit ? Number(formData.deposit) : undefined,
    };

    try {
      const url = editingId ? `/api/admin/vehicles/${editingId}` : "/api/admin/vehicles";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao guardar viatura");
      }

      closeForm();
      await fetchVehicles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/vehicles/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao eliminar viatura");
      }
      await fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{vehicles.length} viatura(s)</p>
        <button onClick={openCreateForm} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">
          Nova viatura
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">{editingId ? "Editar viatura" : "Nova viatura"}</h2>

          {formError && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{formError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoria">
              <input required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Económico, SUV, 4x4 Safari, Minibus" className="input" />
            </Field>
            <Field label="Tipo (badge)">
              <input value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} placeholder="Sedan, SUV 4x2, Todo-o-terreno" className="input" />
            </Field>
          </div>

          <Field label="Modelo / similar">
            <input required value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="Toyota Corolla ou similar" className="input" />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Lugares">
              <input type="number" required value={formData.seats} onChange={(e) => setFormData({ ...formData, seats: e.target.value })} className="input" />
            </Field>
            <Field label="Malas">
              <input type="number" value={formData.luggage} onChange={(e) => setFormData({ ...formData, luggage: e.target.value })} className="input" />
            </Field>
            <Field label="Caixa">
              <input value={formData.transmission} onChange={(e) => setFormData({ ...formData, transmission: e.target.value })} placeholder="Manual / Automático" className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Preço/dia">
              <input type="number" required value={formData.pricePerDay} onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })} className="input" />
            </Field>
            <Field label="Moeda">
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as FormData["currency"] })} className="input">
                <option value="USD">USD</option>
                <option value="MZN">MZN</option>
                <option value="ZAR">ZAR</option>
              </select>
            </Field>
            <Field label="Caução">
              <input type="number" value={formData.deposit} onChange={(e) => setFormData({ ...formData, deposit: e.target.value })} className="input" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={formData.withDriver} onChange={(e) => setFormData({ ...formData, withDriver: e.target.checked })} />
            Com motorista
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
      ) : vehicles.length === 0 ? (
        <p className="text-slate-500 text-sm">Ainda sem viaturas.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">Modelo</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((vehicle) => {
                const actions = STATUS_ACTIONS[vehicle.status];
                return (
                  <tr key={vehicle.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{vehicle.category}</td>
                    <td className="px-4 py-3 text-slate-600">{vehicle.model}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[vehicle.status]}`}>{STATUS_LABEL[vehicle.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button onClick={() => openEditForm(vehicle)} className="link-btn">
                          Editar
                        </button>
                        {actions.primary && (
                          <button onClick={() => handleStatusChange(vehicle.id, actions.primary![0])} className="link-btn">
                            {actions.primary[1]}
                          </button>
                        )}
                        {actions.secondary && (
                          <button onClick={() => handleStatusChange(vehicle.id, actions.secondary![0])} className="link-btn text-slate-400">
                            {actions.secondary[1]}
                          </button>
                        )}
                        {vehicle.status === "DRAFT" && (
                          <button onClick={() => handleDelete(vehicle.id)} className="link-btn text-red-500">
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
