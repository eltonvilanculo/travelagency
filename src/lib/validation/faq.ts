import { z } from "zod";

export const createFaqSchema = z.object({
  category: z.string().min(1, "Categoria é obrigatória"),
  keywords: z.array(z.string().min(1)).optional(),
  questionPt: z.string().min(1, "Pergunta (PT) é obrigatória"),
  questionEn: z.string().min(1, "Pergunta (EN) é obrigatória"),
  answerPt: z.string().min(1, "Resposta (PT) é obrigatória"),
  answerEn: z.string().min(1, "Resposta (EN) é obrigatória"),
  source: z.string().optional(),
});

export const updateFaqSchema = createFaqSchema.partial();

export const updateFaqStatusSchema = z.object({
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]),
});
