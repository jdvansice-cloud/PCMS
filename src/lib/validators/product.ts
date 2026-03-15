import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  sku: z.string().max(50).optional().or(z.literal("")),
  barcode: z.string().max(50).optional().or(z.literal("")),
  category: z.enum(["FOOD", "MEDICATION", "SUPPLEMENT", "ACCESSORY", "TOY", "HYGIENE", "OTHER"]),
  price: z.string().min(1, "Precio es requerido"),
  cost: z.string().optional().or(z.literal("")),
  isTaxExempt: z.boolean().default(false),
  stock: z.string().default("0"),
  minStock: z.string().default("0"),
  expirationDate: z.string().optional().or(z.literal("")),
  batchNumber: z.string().max(50).optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;
