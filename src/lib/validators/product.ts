import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  sku: z.string().max(50).optional().or(z.literal("")),
  barcode: z.string().max(50).optional().or(z.literal("")),
  category: z.enum([
    "FOOD",
    "MEDICATION",
    "SUPPLEMENT",
    "ACCESSORY",
    "TOY",
    "HYGIENE",
    "OTHER",
  ]),
  price: z.string().min(1, "El precio es requerido"),
  cost: z.string().optional().or(z.literal("")),
  isTaxExempt: z.boolean().optional(),
  stock: z.string().min(1, "El stock es requerido"),
  minStock: z.string().optional().or(z.literal("")),
});

export type ProductFormData = z.infer<typeof productSchema>;
