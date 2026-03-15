import { z } from "zod";

export const ownerSchema = z.object({
  firstName: z.string().min(1, "Nombre es requerido").max(100),
  lastName: z.string().min(1, "Apellido es requerido").max(100),
  cedula: z.string().max(20).optional().or(z.literal("")),
  ruc: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type OwnerInput = z.infer<typeof ownerSchema>;
