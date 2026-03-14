import { z } from "zod";

export const appointmentSchema = z.object({
  ownerId: z.string().min(1, "El cliente es requerido"),
  petId: z.string().min(1, "La mascota es requerida"),
  vetId: z.string().optional().or(z.literal("")),
  type: z.enum([
    "CONSULTATION", "VACCINATION", "SURGERY", "GROOMING",
    "FOLLOW_UP", "EMERGENCY", "OTHER",
  ]),
  status: z.enum([
    "SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED",
    "CANCELLED", "NO_SHOW",
  ]),
  scheduledAt: z.string().min(1, "La fecha y hora son requeridas"),
  durationMin: z.string().min(1, "La duración es requerida"),
  reason: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
