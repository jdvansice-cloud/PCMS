import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  price: z.string().min(1, "El precio es requerido"),
  isTaxExempt: z.boolean().optional(),
  type: z.enum([
    "CONSULTATION",
    "VACCINATION",
    "SURGERY",
    "GROOMING",
    "FOLLOW_UP",
    "EMERGENCY",
    "OTHER",
  ]),
  durationMin: z.string().min(1, "La duración es requerida"),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
