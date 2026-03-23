import { z } from "zod";

export const petSchema = z.object({
  ownerId: z.string().min(1, "Dueño es requerido"),
  name: z.string().min(1, "Nombre es requerido").max(100),
  species: z.enum(["DOG", "CAT", "BIRD", "REPTILE", "RODENT", "OTHER"]),
  breed: z.string().max(100).optional().or(z.literal("")),
  sex: z.enum(["MALE", "FEMALE", "UNKNOWN"]),
  size: z.enum(["SMALL", "MEDIUM", "LARGE", "XL"]).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  weight: z.string().optional().or(z.literal("")),
  color: z.string().max(50).optional().or(z.literal("")),
  microchipId: z.string().max(50).optional().or(z.literal("")),
  allergies: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type PetInput = z.infer<typeof petSchema>;
