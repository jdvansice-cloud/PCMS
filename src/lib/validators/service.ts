import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  price: z.string().min(1, "Precio es requerido"),
  type: z.enum(["CONSULTATION", "VACCINATION", "SURGERY", "GROOMING", "FOLLOW_UP", "EMERGENCY", "OTHER"]),
  durationMin: z.string().min(1, "Duración es requerida"),
  isTaxExempt: z.boolean().default(false),
  isBookable: z.boolean().default(true),
  petSizes: z.array(z.enum(["SMALL", "MEDIUM", "LARGE", "XL"])).default([]),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
