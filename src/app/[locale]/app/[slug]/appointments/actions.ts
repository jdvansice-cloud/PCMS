"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { appointmentSchema } from "@/lib/validators/appointment";
import { createAuditLog, diffChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AppointmentStatus } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export async function getAppointments(search?: string, page = 1, status?: string) {
  const { organizationId } = await getCurrentUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId, type: { not: "GROOMING" } };

  if (status && status !== "ALL") {
    where.status = status as AppointmentStatus;
  }

  if (search) {
    where.OR = [
      { owner: { firstName: { contains: search, mode: "insensitive" } } },
      { owner: { lastName: { contains: search, mode: "insensitive" } } },
      { pet: { name: { contains: search, mode: "insensitive" } } },
      { reason: { contains: search, mode: "insensitive" } },
    ];
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        owner: { select: { firstName: true, lastName: true } },
        pet: { select: { name: true } },
        vet: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
      },
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getAppointment(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.appointment.findFirst({
    where: { id, organizationId },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
      pet: { select: { id: true, name: true, species: true, breed: true } },
      vet: { select: { id: true, firstName: true, lastName: true } },
      service: { select: { id: true, name: true, durationMin: true } },
    },
  });
}

export async function getAppointmentFormData() {
  const { organizationId } = await getCurrentUser();
  const [owners, vets, services, branch] = await Promise.all([
    prisma.owner.findMany({
      where: { organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pets: { where: { isActive: true }, select: { id: true, name: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { userType: "OWNER" },
          { userType: "ADMIN" },
          { role: { name: { contains: "Veterinario", mode: "insensitive" } } },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.service.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, type: true, durationMin: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findFirst({
      where: { organizationId, isMain: true },
      select: { id: true },
    }),
  ]);

  return { owners, vets, services, branchId: branch?.id ?? "" };
}

export async function createAppointment(formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  const parsed = appointmentSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Datos inválidos");

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    select: { id: true },
  });
  if (!branch) throw new Error("No hay sucursal configurada");

  const appointment = await prisma.appointment.create({
    data: {
      organizationId,
      branchId: branch.id,
      ownerId: parsed.data.ownerId,
      petId: parsed.data.petId,
      vetId: parsed.data.vetId || null,
      serviceId: parsed.data.serviceId || null,
      type: parsed.data.type,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMin: parseInt(parsed.data.durationMin),
      reason: parsed.data.reason || null,
      notes: parsed.data.notes || null,
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Appointment",
    entityId: appointment.id,
  });

  revalidatePath(`/app/${slug}/appointments`);
  redirect(`/app/${slug}/appointments`);
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { user, organizationId, slug } = await getCurrentUser();

  const current = await prisma.appointment.findFirst({
    where: { id, organizationId },
  });
  if (!current) return { error: "No encontrado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { status };
  if (status === "IN_PROGRESS" && !current.checkedInAt) {
    updateData.checkedInAt = new Date();
  }
  if (status === "COMPLETED" && current.kennelId) {
    updateData.kennelId = null;
  }

  await prisma.appointment.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "Appointment",
    entityId: id,
    changes: { status: { old: current.status, new: status } },
  });

  revalidatePath(`/app/${slug}/appointments`);
  return { success: true };
}

export async function deleteAppointment(id: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  await prisma.appointment.delete({ where: { id } });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "DELETE",
    entityType: "Appointment",
    entityId: id,
  });

  revalidatePath(`/app/${slug}/appointments`);
  redirect(`/app/${slug}/appointments`);
}

// ---------------------------------------------------------------------------
// getAppointmentBoard — today's clinic appointments grouped by status
// ---------------------------------------------------------------------------
export async function getAppointmentBoard(dateStr: string) {
  const { organizationId } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    select: { id: true },
  });
  if (!branch) return { appointments: [], branchId: "" };

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      branchId: branch.id,
      type: { not: "GROOMING" },
      scheduledAt: { gte: dayStart, lte: dayEnd },
      // Hide picked-up appointments
      pickedUpAt: null,
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
      pet: { select: { id: true, name: true, species: true, breed: true, size: true } },
      vet: { select: { id: true, firstName: true, lastName: true } },
      service: { select: { id: true, name: true, durationMin: true } },
      kennel: { select: { id: true, name: true, size: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return { appointments, branchId: branch.id };
}

// ---------------------------------------------------------------------------
// getKennelOccupancyAll — all kennels with occupant info for both clinic & grooming
// ---------------------------------------------------------------------------
export async function getKennelOccupancyAll(dateStr: string) {
  const { organizationId } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    select: { id: true },
  });
  if (!branch) return [];

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const kennels = await prisma.kennel.findMany({
    where: { organizationId, branchId: branch.id },
    include: {
      groomingSessions: {
        where: {
          scheduledAt: { gte: dayStart, lte: dayEnd },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          kennelReleasedAt: null,
        },
        include: { pet: { select: { name: true } } },
        take: 1,
      },
      appointments: {
        where: {
          scheduledAt: { gte: dayStart, lte: dayEnd },
          status: "IN_PROGRESS",
          type: { not: "GROOMING" },
          kennelId: { not: null },
        },
        include: { pet: { select: { name: true } } },
        take: 1,
      },
    },
    orderBy: [{ size: "asc" }, { name: "asc" }],
  });

  return kennels;
}

// ---------------------------------------------------------------------------
// assignKennelToAppointment
// ---------------------------------------------------------------------------
export async function assignKennelToAppointment(appointmentId: string, kennelId: string) {
  const { organizationId, user, slug } = await getCurrentUser();

  await prisma.appointment.update({
    where: { id: appointmentId, organizationId },
    data: { kennelId },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "Appointment",
    entityId: appointmentId,
    changes: { kennelId: { old: null, new: kennelId } },
  });

  revalidatePath(`/app/${slug}/appointments`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// releaseKennelFromAppointment
// ---------------------------------------------------------------------------
export async function releaseKennelFromAppointment(appointmentId: string) {
  const { organizationId, user, slug } = await getCurrentUser();

  await prisma.appointment.update({
    where: { id: appointmentId, organizationId },
    data: { kennelId: null },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "Appointment",
    entityId: appointmentId,
    changes: { kennelId: { old: "assigned", new: null } },
  });

  revalidatePath(`/app/${slug}/appointments`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// markAppointmentPickedUp
// ---------------------------------------------------------------------------
export async function markAppointmentPickedUp(appointmentId: string) {
  const { organizationId, user, slug } = await getCurrentUser();

  const now = new Date();
  await prisma.appointment.update({
    where: { id: appointmentId, organizationId },
    data: { pickedUpAt: now, status: "COMPLETED", kennelId: null },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "Appointment",
    entityId: appointmentId,
    changes: { pickedUpAt: { old: null, new: now.toISOString() } },
  });

  revalidatePath(`/app/${slug}/appointments`);
  return { success: true };
}
