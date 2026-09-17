"use client";

import { Fragment, useEffect, useState } from "react";

type Actor = { id: string; name: string; email: string; role: string } | null;

type AuditEntry = {
  id: string;
  actorId: string | null;
  actor: Actor;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
};

export function AuditoriaClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/audit")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar o registo de auditoria");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEntries(data);
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
      <p className="text-sm text-slate-500 mb-4">{entries.length} registo(s) mais recente(s)</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">A carregar...</p>
      ) : entries.length === 0 ? (
        <p className="text-slate-500 text-sm">Ainda sem registos de auditoria.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Quando</th>
                <th className="text-left px-4 py-3">Autor</th>
                <th className="text-left px-4 py-3">Ação</th>
                <th className="text-left px-4 py-3">Entidade</th>
                <th className="text-right px-4 py-3">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <Fragment key={e.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {e.actor ? e.actor.name : <span className="text-slate-400">Sistema</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{e.action}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {e.entityType} <span className="text-slate-400 text-xs">{e.entityId.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                        className="text-xs font-medium text-slate-700 hover:underline"
                      >
                        {expandedId === e.id ? "Fechar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === e.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Antes</p>
                            <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                              {e.before ? JSON.stringify(e.before, null, 2) : "—"}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Depois</p>
                            <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                              {e.after ? JSON.stringify(e.after, null, 2) : "—"}
                            </pre>
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
    </div>
  );
}
