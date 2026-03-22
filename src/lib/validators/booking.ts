import { z } from "zod";

export const bookingSchema = z.object({
  // Owner info
  firstName: z.string().min(1, "Nombre es requerido").max(100),
  lastName: z.string().min(1, "Apellido es requerido").max(100),
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().min(1, "Teléfono es requerido").max(20),

  // Pet info
  petName: z.string().min(1, "Nombre de mascota es requerido").max(100),
  species: z.enum(["DOG", "CAT"]).default("DOG"),
  breed: z.string().max(100).optional().or(z.literal("")),
  petSize: z.enum(["SMALL", "MEDIUM", "LARGE"]),

  // Services
  serviceIds: z.array(z.string()).min(1, "Selecciona al menos un servicio"),

  // Pickup
  needsPickup: z.boolean().default(false),
  pickupAddress: z.string().optional().or(z.literal("")),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),

  // Date
  date: z.string().min(1, "Fecha es requerida"),
});

export type BookingInput = z.infer<typeof bookingSchema>;
