import { prisma } from "@/lib/prisma";
import type { ContentStatus } from "@/generated/prisma/client";
import { invalidateFaqEngine } from "@/lib/faq/engine";

export type CreateFaqInput = {
  category: string;
  keywords?: string[];
  questionEn: string;
  questionPt: string;
  answerEn: string;
  answerPt: string;
  source?: string | null;
};

export type UpdateFaqInput = Partial<CreateFaqInput>;

export class FaqService {
  static async findAll(options: { status?: ContentStatus } = {}) {
    return prisma.faqEntry.findMany({
      where: options.status ? { status: options.status } : undefined,
      orderBy: [{ category: "asc" }, { questionPt: "asc" }],
    });
  }

  static async findById(id: string) {
    return prisma.faqEntry.findUnique({ where: { id } });
  }

  static async create(data: CreateFaqInput, actorId: string) {
    const entry = await prisma.faqEntry.create({
      data: { ...data, keywords: data.keywords ?? [], status: "DRAFT" },
    });
    await logFaqAudit(actorId, "create", entry.id, null, entry);
    invalidateFaqEngine();
    return entry;
  }

  static async update(id: string, data: UpdateFaqInput, actorId: string) {
    const before = await prisma.faqEntry.findUnique({ where: { id } });
    if (!before) return null;
    const after = await prisma.faqEntry.update({ where: { id }, data });
    await logFaqAudit(actorId, "update", id, before, after);
    invalidateFaqEngine();
    return after;
  }

  static async updateStatus(id: string, status: ContentStatus, actorId: string) {
    const before = await prisma.faqEntry.findUnique({ where: { id } });
    if (!before) return null;
    const after = await prisma.faqEntry.update({ where: { id }, data: { status } });
    await logFaqAudit(actorId, `status:${status}`, id, before, after);
    invalidateFaqEngine();
    return after;
  }

  static async deleteDraft(id: string, actorId: string) {
    const entry = await prisma.faqEntry.findUnique({ where: { id } });
    if (!entry) return { ok: false as const, reason: "not_found" as const };
    if (entry.status !== "DRAFT") return { ok: false as const, reason: "not_draft" as const };
    await prisma.faqEntry.delete({ where: { id } });
    await logFaqAudit(actorId, "delete", id, entry, null);
    invalidateFaqEngine();
    return { ok: true as const };
  }

  // Content-gap review log (RF-065) — every question the bot couldn't
  // confidently answer, so a human can spot missing FAQ coverage.
  static async listUnanswered() {
    return prisma.faqUnanswered.findMany({ orderBy: { createdAt: "desc" } });
  }

  static async dismissUnanswered(id: string) {
    await prisma.faqUnanswered.delete({ where: { id } }).catch(() => null);
    return { ok: true as const };
  }

  static async logUnanswered(question: string, locale: "pt" | "en", channel: string, handedOff: boolean) {
    return prisma.faqUnanswered.create({
      data: { question, locale: locale === "pt" ? "PT" : "EN", channel, handedOff },
    });
  }
}

async function logFaqAudit(actorId: string, action: string, entityId: string, before: unknown, after: unknown) {
  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    actorId,
    action: `faqEntry.${action}`,
    entityType: "FaqEntry",
    entityId,
    before: before ?? undefined,
    after: after ?? undefined,
  });
}
