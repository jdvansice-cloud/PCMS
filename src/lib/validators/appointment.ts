import { z } from "zod";

export const appointmentSchema = z.object({
  ownerId: z.string().min(1, "Cliente es requerido"),
  petId: z.string().min(1, "Mascota es requerida"),
  vetId: z.string().optional().or(z.literal("")),
  serviceId: z.string().optional().or(z.literal("")),
  type: z.enum(["CONSULTATION", "VACCINATION", "SURGERY", "GROOMING", "FOLLOW_UP", "EMERGENCY", "OTHER"]),
  scheduledAt: z.string().min(1, "Fecha es requerida"),
  durationMin: z.string().default("30"),
  reason: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
