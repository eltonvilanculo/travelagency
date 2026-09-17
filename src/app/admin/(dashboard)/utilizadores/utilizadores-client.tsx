"use client";

import { useEffect, useState } from "react";

type Role = "ADMINISTRATOR" | "CATALOG_MANAGER" | "BOOKING_AGENT" | "FINANCE" | "READ_ONLY";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_LABEL: Record<Role, string> = {
  ADMINISTRATOR: "Administrador",
  CATALOG_MANAGER: "Gestor de Catálogo",
  BOOKING_AGENT: "Agente de Reservas",
  FINANCE: "Financeiro",
  READ_ONLY: "Leitura",
};

const ROLES = Object.keys(ROLE_LABEL) as Role[];

const emptyForm = { name: "", email: "", password: "", role: "READ_ONLY" as Role };

export function UtilizadoresClient({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("READ_ONLY");
  const [editActive, setEditActive] = useState(true);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = async (): Promise<AdminUser[]> => {
    const response = await fetch("/api/admin/users");
    if (!response.ok) throw new Error("Falha ao carregar utilizadores");
    return response.json();
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await loadUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
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

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao criar conta");
      }
      setForm(emptyForm);
      setCreating(false);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (user: AdminUser) => {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditActive(user.isActive);
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, isActive: editActive }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao guardar alterações");
      }
      setEditingId(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!newPassword.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao redefinir password");
      }
      setNewPassword("");
      setResettingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{users.length} conta(s)</p>
        <button
          onClick={() => {
            setCreating((v) => !v);
            setForm(emptyForm);
          }}
          className="px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
        >
          {creating ? "Cancelar" : "+ Nova Conta"}
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {creating && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Nova conta de equipa</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome completo"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              type="email"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Password (mín. 8 caracteres)"
              type="password"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !form.name || !form.email || form.password.length < 8}
            className="mt-3 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            Criar conta
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">A carregar...</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Papel</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Último acesso</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.name}
                    {u.id === currentUserId && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {editingId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as Role)}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {ROLE_LABEL[u.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === u.id ? (
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                        Ativo
                      </label>
                    ) : (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {u.isActive ? "Ativo" : "Inativo"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("pt-PT") : "Nunca"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === u.id ? (
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => handleSaveEdit(u.id)} disabled={saving} className="text-xs font-medium text-orange-600 hover:text-orange-700">
                          Guardar
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                          Cancelar
                        </button>
                      </div>
                    ) : resettingId === u.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nova password"
                          type="password"
                          className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-32"
                        />
                        <button onClick={() => handleResetPassword(u.id)} disabled={saving || newPassword.length < 8} className="text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50">
                          Guardar
                        </button>
                        <button onClick={() => { setResettingId(null); setNewPassword(""); }} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => startEditing(u)} className="text-xs font-medium text-slate-700 hover:underline">
                          Editar
                        </button>
                        <button onClick={() => { setResettingId(u.id); setNewPassword(""); }} className="text-xs font-medium text-slate-700 hover:underline">
                          Redefinir password
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
