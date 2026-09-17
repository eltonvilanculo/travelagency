import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  locale: z.enum(["pt", "en"]),
  contact: z
    .object({
      name: z.string().max(120).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(40).optional(),
    })
    .optional(),
});
