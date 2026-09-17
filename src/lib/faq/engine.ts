import Fuse from "fuse.js";
import { prisma } from "@/lib/prisma";
import type { FaqEntry } from "@/generated/prisma/client";

// Local, zero-token FAQ matching (BRD §11 D-06: keyword/fuzzy match, not an
// LLM). Confidence is a word-overlap ratio, not a whole-sentence edit
// distance: matching a short user question against a much longer canonical
// FAQ question (e.g. "Como cancelo a minha reserva?" against "Como cancelo
// a minha reserva e recebo reembolso?") is the normal case here, and Fuse's
// own sentence-level Bitap score penalizes exactly that pattern (a verified
// near-perfect substring match only scored ~0.69 confidence in testing —
// below the 0.75 threshold). So the query is instead tokenized into content
// words, each matched against a per-entry vocabulary (exact hit, or a fuzzy
// per-word Fuse lookup for typo tolerance), and confidence is the fraction
// of the query's words that matched.

type LocaleIndex = {
  entries: Map<string, FaqEntry>;
  wordToEntries: Map<string, Set<string>>;
  wordFuse: Fuse<string>;
};
type Locale = "pt" | "en";

let cache: Record<Locale, LocaleIndex> | null = null;
let buildingPromise: Promise<Record<Locale, LocaleIndex>> | null = null;

/** Call after any create/update/status-change/delete on a FaqEntry so the
 * next question is matched against the current published set instead of a
 * stale one. Cheap to over-call — the index only actually rebuilds on the
 * next askFaq(). */
export function invalidateFaqEngine() {
  cache = null;
  buildingPromise = null;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents so "canvcelar"/"cancelar" and PT accent variants match evenly
    .toLowerCase()
    .trim();
}

// Short, common function words that carry no topical signal on their own —
// filtered out of both the indexed vocabulary and the query so overlap is
// measured on meaningful words only. Word length <= 2 is filtered
// unconditionally below, which already catches most of these.
const STOPWORDS: Record<Locale, Set<string>> = {
  pt: new Set([
    "que", "para", "com", "uma", "nao", "mais", "seu", "sua", "este", "esta",
    "sao", "meu", "minha", "isso", "tem", "ser", "aos", "dos", "das", "pelo",
    "pela", "como", "muito", "quando",
  ]),
  en: new Set([
    "the", "and", "for", "what", "how", "you", "your", "this", "that", "can",
    "will", "does", "are", "was", "have", "with", "about",
  ]),
};

function contentWords(text: string, locale: Locale): string[] {
  const normalized = normalize(text).replace(/[^a-z0-9\s]/g, " ");
  return normalized.split(/\s+/).filter((word) => word.length > 2 && !STOPWORDS[locale].has(word));
}

function buildIndex(entries: FaqEntry[], locale: Locale): LocaleIndex {
  const wordToEntries = new Map<string, Set<string>>();

  for (const entry of entries) {
    const text = [locale === "pt" ? entry.questionPt : entry.questionEn, ...entry.keywords].join(" ");
    for (const word of contentWords(text, locale)) {
      if (!wordToEntries.has(word)) wordToEntries.set(word, new Set());
      wordToEntries.get(word)!.add(entry.id);
    }
  }

  const vocabulary = Array.from(wordToEntries.keys());
  const wordFuse = new Fuse(vocabulary, { includeScore: true, threshold: 0.3 });

  return { entries: new Map(entries.map((entry) => [entry.id, entry])), wordToEntries, wordFuse };
}

async function build(): Promise<Record<Locale, LocaleIndex>> {
  const entries = await prisma.faqEntry.findMany({ where: { status: "PUBLISHED" } });
  return { pt: buildIndex(entries, "pt"), en: buildIndex(entries, "en") };
}

async function getIndex(): Promise<Record<Locale, LocaleIndex>> {
  if (cache) return cache;
  if (!buildingPromise) {
    buildingPromise = build().then((built) => {
      cache = built;
      return built;
    });
  }
  return buildingPromise;
}

const CONFIDENCE_THRESHOLD = 0.75;

// Explicit "give me a human" requests bypass matching entirely rather than
// relying on the classifier landing on the right FAQ entry for them — this
// is the one path that must never silently misfire.
const HUMAN_REQUEST_PATTERNS: Record<Locale, RegExp[]> = {
  pt: [/\bhumano\b/i, /\bpessoa\b/i, /\bagente\b/i, /\batendente\b/i, /falar com alguem/i, /nao (e|eh) (um )?robo/i],
  en: [/\bhuman\b/i, /\bperson\b/i, /\bagent\b/i, /real person/i, /talk to (someone|somebody)/i],
};

function wantsHuman(message: string, locale: Locale): boolean {
  return HUMAN_REQUEST_PATTERNS[locale].some((pattern) => pattern.test(message));
}

function bestMatch(queryWords: string[], index: LocaleIndex): { entryId: string; confidence: number } | null {
  if (queryWords.length === 0) return null;

  const entryScores = new Map<string, number>();

  for (const word of queryWords) {
    let weight = 0;
    let matchedIds: Set<string> | undefined;

    const exact = index.wordToEntries.get(word);
    if (exact) {
      weight = 1;
      matchedIds = exact;
    } else {
      const [fuzzy] = index.wordFuse.search(word);
      if (fuzzy) {
        weight = 1 - (fuzzy.score ?? 1);
        matchedIds = index.wordToEntries.get(fuzzy.item);
      }
    }

    if (matchedIds) {
      for (const id of matchedIds) {
        entryScores.set(id, (entryScores.get(id) ?? 0) + weight);
      }
    }
  }

  let bestId: string | null = null;
  let bestConfidence = 0;
  for (const [id, score] of entryScores) {
    const confidence = Math.min(1, score / queryWords.length);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestId = id;
    }
  }

  return bestId ? { entryId: bestId, confidence: bestConfidence } : null;
}

export type FaqResult =
  | { status: "answered"; entryId: string; category: string; answer: string; confidence: number }
  | { status: "fallback"; reason: "human_requested" | "low_confidence" | "no_faq_content"; confidence: number };

export async function askFaq(rawMessage: string, locale: Locale): Promise<FaqResult> {
  if (wantsHuman(normalize(rawMessage), locale)) {
    return { status: "fallback", reason: "human_requested", confidence: 1 };
  }

  const index = await getIndex();
  const localeIndex = index[locale];

  if (localeIndex.entries.size === 0) {
    return { status: "fallback", reason: "no_faq_content", confidence: 0 };
  }

  const match = bestMatch(contentWords(rawMessage, locale), localeIndex);

  if (!match || match.confidence < CONFIDENCE_THRESHOLD) {
    return { status: "fallback", reason: "low_confidence", confidence: match?.confidence ?? 0 };
  }

  const entry = localeIndex.entries.get(match.entryId);
  if (!entry) {
    return { status: "fallback", reason: "low_confidence", confidence: match.confidence };
  }

  return {
    status: "answered",
    entryId: entry.id,
    category: entry.category,
    answer: locale === "pt" ? entry.answerPt : entry.answerEn,
    confidence: match.confidence,
  };
}
