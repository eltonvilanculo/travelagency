"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";

type FaqInlineEntry = {
  id: string;
  questionPt: string;
  questionEn: string;
  answerPt: string;
  answerEn: string;
};

const COPY = {
  pt: { title: "Perguntas frequentes" },
  en: { title: "Frequently asked questions" },
} as const;

/** A curated handful of FAQ answers surfaced right on the page, not just
 * inside the chat widget — same PUBLISHED FaqEntry content, fetched by id
 * so each page picks the questions actually relevant to it. */
export function FaqInline({ ids, locale }: { ids: string[]; locale: Locale }) {
  const t = COPY[locale];
  const [entries, setEntries] = useState<FaqInlineEntry[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const idsKey = ids.join(",");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/faq?ids=${idsKey}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FaqInlineEntry[]) => {
        if (cancelled) return;
        // Preserve the caller's requested order rather than the API's —
        // callers list their most-relevant question first for that page.
        const byId = new Map(data.map((entry) => [entry.id, entry]));
        setEntries(idsKey.split(",").map((id) => byId.get(id)).filter((e): e is FaqInlineEntry => !!e));
      })
      .catch(() => {
        // Non-critical — the page works fine with no inline FAQ block.
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (entries.length === 0) return null;

  return (
    <div className="border border-darkgray/15 rounded-2xl bg-white/60 divide-y divide-darkgray/10 overflow-hidden">
      <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-darkgray">{t.title}</p>
      {entries.map((entry) => {
        const question = locale === "pt" ? entry.questionPt : entry.questionEn;
        const answer = locale === "pt" ? entry.answerPt : entry.answerEn;
        const open = openId === entry.id;
        return (
          <div key={entry.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : entry.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm text-textdark hover:bg-beige/50 transition-colors cursor-pointer"
            >
              <span>{question}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`w-4 h-4 text-darkgray shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open && <p className="animate-drop-in px-4 pb-3 text-xs text-parablack leading-relaxed">{answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
