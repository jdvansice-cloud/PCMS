"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { appointmentSchema, type AppointmentFormData } from "@/lib/validators/appointment";

const PAGE_SIZE = 20;

export async function getAppointments(search?: string, page: number = 1, date?: string) {
  const { organizationId } = await getCurrentUser();

  const dateFilter = date
    ? {
        scheduledAt: {
          gte: new Date(`${date}T00:00:00`),
          lt: new Date(`${date}T23:59:59`),
        },
      }
    : {};

  const where = {
    organizationId,
    ...dateFilter,
    ...(search
      ? {
          OR: [
            { reason: { contains: search, mode: "insensitive" as const } },
            { pet: { name: { contains: search, mode: "insensitive" as const } } },
            { owner: { firstName: { contains: search, mode: "insensitive" as const } } },
            { owner: { lastName: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        owner: { select: { firstName: true, lastName: true } },
        pet: { select: { name: true } },
        vet: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getAppointment(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.appointment.findFirst({
    where: { id, organizationId },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
      pet: { select: { id: true, name: true, species: true, breed: true } },
      vet: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function getAppointmentFormData() {
  const { organizationId } = await getCurrentUser();
  const [owners, vets] = await Promise.all([
    prisma.owner.findMany({
      where: { organizationId },
      select: { id: true, firstName: true, lastName: true, pets: { where: { isActive: true }, select: { id: true, name: true } } },
      orderBy: [{ firstName: "asc" }],
    }),
    prisma.user.findMany({
      where: { organizationId, isActive: true, role: { in: ["VET", "ADMIN"] } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }],
    }),
  ]);
  return { owners, vets };
}

export async function createAppointment(data: AppointmentFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.appointment.create({
    data: {
      organizationId,
      ownerId: parsed.data.ownerId,
      petId: parsed.data.petId,
      vetId: parsed.data.vetId || null,
      type: parsed.data.type,
      status: parsed.data.status,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMin: parseInt(parsed.data.durationMin),
      reason: parsed.data.reason || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/appointments");
  redirect("/dashboard/appointments");
}

export async function updateAppointment(id: string, data: AppointmentFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.appointment.updateMany({
    where: { id, organizationId },
    data: {
      ownerId: parsed.data.ownerId,
      petId: parsed.data.petId,
      vetId: parsed.data.vetId || null,
      type: parsed.data.type,
      status: parsed.data.status,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMin: parseInt(parsed.data.durationMin),
      reason: parsed.data.reason || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/appointments/${id}`);
  return { success: true };
}

export async function deleteAppointment(id: string) {
  const { organizationId } = await getCurrentUser();
  await prisma.appointment.deleteMany({ where: { id, organizationId } });
  revalidatePath("/dashboard/appointments");
  redirect("/dashboard/appointments");
}
