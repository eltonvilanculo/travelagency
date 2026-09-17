"use client";

import { useEffect, useState } from "react";

type ContentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

type FaqEntry = {
  id: string;
  category: string;
  keywords: string[];
  questionEn: string;
  questionPt: string;
  answerEn: string;
  answerPt: string;
  source: string | null;
  status: ContentStatus;
};

type FaqUnanswered = {
  id: string;
  question: string;
  locale: "PT" | "EN";
  channel: string | null;
  handedOff: boolean;
  createdAt: string;
};

type FormData = {
  category: string;
  keywords: string;
  questionPt: string;
  questionEn: string;
  answerPt: string;
  answerEn: string;
  source: string;
};

const emptyForm: FormData = {
  category: "",
  keywords: "",
  questionPt: "",
  questionEn: "",
  answerPt: "",
  answerEn: "",
  source: "",
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

const parseKeywords = (raw: string): string[] =>
  raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

export function FaqClient() {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [unanswered, setUnanswered] = useState<FaqUnanswered[]>([]);
  const [unansweredLoading, setUnansweredLoading] = useState(true);

  const loadEntries = async (): Promise<FaqEntry[]> => {
    const response = await fetch("/api/admin/faq");
    if (!response.ok) throw new Error("Falha ao carregar perguntas");
    return response.json();
  };

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await loadEntries());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const loadUnanswered = async (): Promise<FaqUnanswered[]> => {
    const response = await fetch("/api/admin/faq/unanswered");
    if (!response.ok) throw new Error("Falha ao carregar registo");
    return response.json();
  };

  useEffect(() => {
    let cancelled = false;
    loadEntries()
      .then((e) => {
        if (!cancelled) setEntries(e);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    loadUnanswered()
      .then((items) => {
        if (!cancelled) setUnanswered(items);
      })
      .catch(() => {
        // Non-critical secondary panel — the main FAQ list still works if this fails.
      })
      .finally(() => {
        if (!cancelled) setUnansweredLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreateForm = (prefill?: Partial<FormData>) => {
    setEditingId(null);
    setFormData({ ...emptyForm, ...prefill });
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (entry: FaqEntry) => {
    setEditingId(entry.id);
    setFormData({
      category: entry.category,
      keywords: entry.keywords.join(", "),
      questionPt: entry.questionPt,
      questionEn: entry.questionEn,
      answerPt: entry.answerPt,
      answerEn: entry.answerEn,
      source: entry.source ?? "",
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
      keywords: parseKeywords(formData.keywords),
      source: formData.source || undefined,
    };

    try {
      const url = editingId ? `/api/admin/faq/${editingId}` : "/api/admin/faq";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao guardar pergunta");
      }

      closeForm();
      await fetchEntries();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/faq/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao mudar estado");
      }
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao eliminar pergunta");
      }
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  const dismissUnanswered = async (id: string) => {
    try {
      await fetch(`/api/admin/faq/unanswered/${id}`, { method: "DELETE" });
      setUnanswered((prev) => prev.filter((u) => u.id !== id));
    } catch {
      // best-effort
    }
  };

  const createFromUnanswered = (item: FaqUnanswered) => {
    openCreateForm(item.locale === "PT" ? { questionPt: item.question } : { questionEn: item.question });
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{entries.length} pergunta(s)</p>
          <button onClick={() => openCreateForm()} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">
            Nova pergunta
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">{editingId ? "Editar pergunta" : "Nova pergunta"}</h2>

            {formError && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{formError}</div>}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoria">
                <input required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="pagamento, cancelamento, conta" className="input" />
              </Field>
              <Field label="Palavras-chave / frases alternativas (separadas por vírgula)">
                <input
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="quero desistir, anular reserva, cancelar viagem"
                  className="input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Pergunta (PT)">
                <input required value={formData.questionPt} onChange={(e) => setFormData({ ...formData, questionPt: e.target.value })} className="input" />
              </Field>
              <Field label="Pergunta (EN)">
                <input required value={formData.questionEn} onChange={(e) => setFormData({ ...formData, questionEn: e.target.value })} className="input" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Resposta (PT)">
                <textarea required rows={3} value={formData.answerPt} onChange={(e) => setFormData({ ...formData, answerPt: e.target.value })} className="input" />
              </Field>
              <Field label="Resposta (EN)">
                <textarea required rows={3} value={formData.answerEn} onChange={(e) => setFormData({ ...formData, answerEn: e.target.value })} className="input" />
              </Field>
            </div>

            <Field label="Fonte (opcional)">
              <input value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="link ou referência interna" className="input" />
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
          <p className="text-slate-500 text-sm animate-pulse">A carregar...</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-500 text-sm">Ainda sem perguntas.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Pergunta</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const actions = STATUS_ACTIONS[entry.status];
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{entry.questionPt}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{entry.category}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[entry.status]}`}>{STATUS_LABEL[entry.status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button onClick={() => openEditForm(entry)} className="link-btn">
                            Editar
                          </button>
                          {actions.primary && (
                            <button onClick={() => handleStatusChange(entry.id, actions.primary![0])} className="link-btn">
                              {actions.primary[1]}
                            </button>
                          )}
                          {actions.secondary && (
                            <button onClick={() => handleStatusChange(entry.id, actions.secondary![0])} className="link-btn text-slate-400">
                              {actions.secondary[1]}
                            </button>
                          )}
                          {entry.status === "DRAFT" && (
                            <button onClick={() => handleDelete(entry.id)} className="link-btn text-red-500">
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
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-1">Perguntas sem resposta</h2>
        <p className="text-sm text-slate-500 mb-4">
          Perguntas que o bot não conseguiu responder com confiança — sinal de conteúdo em falta.
        </p>

        {unansweredLoading ? (
          <p className="text-slate-500 text-sm animate-pulse">A carregar...</p>
        ) : unanswered.length === 0 ? (
          <p className="text-slate-500 text-sm">Sem perguntas por rever.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {unanswered.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 truncate">{item.question}</p>
                  <p className="text-xs text-slate-400">
                    {item.locale} · {item.channel ?? "website"} · {item.handedOff ? "encaminhada para humano" : "não encaminhada"}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => createFromUnanswered(item)} className="link-btn">
                    Criar FAQ
                  </button>
                  <button onClick={() => dismissUnanswered(item.id)} className="link-btn text-slate-400">
                    Dispensar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
