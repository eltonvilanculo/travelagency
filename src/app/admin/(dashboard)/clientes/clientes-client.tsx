"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type CustomerUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  reservationCount: number;
};

export function ClientesClient() {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">{users.length} conta(s) de cliente</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">A carregar...</p>
      ) : users.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Ainda ninguém iniciou sessão com Google — a reserva como convidado continua a funcionar normalmente sem isto.
        </p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Conta criada</th>
                <th className="text-right px-4 py-3">Pedidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
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
