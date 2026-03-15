import { z } from "zod";

export const saleLineSchema = z.object({
  productId: z.string().optional().or(z.literal("")),
  serviceId: z.string().optional().or(z.literal("")),
  description: z.string().min(1, "La descripción es requerida"),
  quantity: z.number().int().min(1, "Cantidad mínima es 1"),
  unitPrice: z.number().min(0, "El precio no puede ser negativo"),
  isTaxExempt: z.boolean().default(false),
});

export const saleSchema = z.object({
  ownerId: z.string().optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH", "CARD", "YAPPY", "BANK_TRANSFER"]),
  notes: z.string().max(500).optional().or(z.literal("")),
  lines: z.array(saleLineSchema).min(1, "Debe agregar al menos un artículo"),
});

export type SaleLineData = z.infer<typeof saleLineSchema>;
export type SaleFormData = z.infer<typeof saleSchema>;
