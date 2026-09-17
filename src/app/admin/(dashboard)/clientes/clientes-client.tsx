"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Provider = "google" | "facebook";

type CustomerUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  reservationCount: number;
  providers: Provider[];
};

const PROVIDER_BADGE: Record<Provider, { label: string; className: string }> = {
  google: { label: "Google", className: "bg-blue-50 text-blue-700" },
  facebook: { label: "Facebook", className: "bg-indigo-50 text-indigo-700" },
};

export function ClientesClient() {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/customer-users")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar clientes");
        return res.json();
      })
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-slate-500">
          {filtered.length} de {users.length} conta(s) de cliente
        </p>
        {users.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por nome ou email..."
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 max-w-full"
          />
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">A carregar...</p>
      ) : users.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Ainda ninguém iniciou sessão com Google ou Facebook — a reserva como convidado continua a funcionar normalmente sem isto.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhum cliente corresponde a &ldquo;{search}&rdquo;.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Sessão via</th>
                <th className="text-left px-4 py-3">Conta criada</th>
                <th className="text-right px-4 py-3">Pedidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.image ? (
                        <Image src={u.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-slate-900">{u.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {u.providers.map((p) => (
                        <span key={p} className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROVIDER_BADGE[p].className}`}>
                          {PROVIDER_BADGE[p].label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString("pt-PT")}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium">{u.reservationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
