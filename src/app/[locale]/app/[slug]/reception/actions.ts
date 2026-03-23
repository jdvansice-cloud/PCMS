"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { KennelSize } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// getTodaysScheduledAppointments
// ---------------------------------------------------------------------------
export async function getTodaysScheduledAppointments() {
  const { organizationId } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    select: { id: true },
  });
  if (!branch) return { appointments: [], owners: [], kennels: [], groomers: [], vets: [], services: [] };

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      branchId: branch.id,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      checkedInAt: null,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      pet: { select: { id: true, name: true, species: true, breed: true, size: true } },
      vet: { select: { id: true, firstName: true, lastName: true } },
      service: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Fetch form data for walk-ins
  const [owners, kennels, groomers, vets, services] = await Promise.all([
    prisma.owner.findMany({
      where: { organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pets: {
          where: { isActive: true },
          select: { id: true, name: true, species: true, breed: true, size: true },
        },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.kennel.findMany({
      where: { organizationId, branchId: branch.id, isAvailable: true },
      orderBy: [{ size: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { userType: { in: ["ADMIN", "OWNER"] } },
          { role: { name: "Peluquero" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true },
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
  ]);

  // Get occupied kennels today
  const occupiedKennels = await prisma.groomingSession.findMany({
    where: {
      organizationId,
      branchId: branch.id,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      kennelId: { not: null },
      kennelReleasedAt: null,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    select: { kennelId: true },
  });
  const occupiedIds = occupiedKennels.map((s) => s.kennelId!);

  return {
    appointments,
    owners,
    kennels,
    occupiedKennelIds: occupiedIds,
    groomers,
    vets,
    services,
    branchId: branch.id,
  };
}

// ---------------------------------------------------------------------------
// checkInScheduledAppointment
// ---------------------------------------------------------------------------
export async function checkInScheduledAppointment(
  appointmentId: string,
  data: {
    kennelId?: string;
    groomerId?: string;
    petSize?: KennelSize;
    services?: string[];
    specialInstructions?: string;
  }
) {
  const { organizationId, user, slug } = await getCurrentUser();

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId },
    include: { pet: { select: { size: true } } },
  });
  if (!appointment) throw new Error("Appointment not found");

  const now = new Date();

  // Update appointment status
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "IN_PROGRESS", checkedInAt: now },
  });

  // If grooming, create a grooming session
  if (appointment.type === "GROOMING") {
    const petSize = data.petSize || appointment.pet.size || "MEDIUM";
    await prisma.groomingSession.create({
      data: {
        organizationId,
        branchId: appointment.branchId,
        petId: appointment.petId,
        appointmentId: appointment.id,
        groomerId: data.groomerId || null,
        kennelId: data.kennelId || null,
        petSize: petSize as KennelSize,
        services: data.services || [],
        specialInstructions: data.specialInstructions || null,
        scheduledAt: appointment.scheduledAt,
        kennelAssignedAt: data.kennelId ? now : null,
      },
    });
  }

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "Appointment",
    entityId: appointmentId,
    changes: { status: { old: appointment.status, new: "IN_PROGRESS" }, checkedInAt: { old: null, new: now.toISOString() } },
  });

  revalidatePath(`/app/${slug}`);
  return { success: true, type: appointment.type };
}

// ---------------------------------------------------------------------------
// createWalkInAppointment
// ---------------------------------------------------------------------------
export async function createWalkInAppointment(data: {
  type: "GROOMING" | "CONSULTATION" | "VACCINATION" | "SURGERY" | "FOLLOW_UP" | "EMERGENCY" | "OTHER";
  ownerId: string;
  petId: string;
  vetId?: string;
  serviceId?: string;
  reason?: string;
  // Grooming-specific
  kennelId?: string;
  groomerId?: string;
  petSize?: KennelSize;
  groomingServices?: string[];
  specialInstructions?: string;
}) {
  const { organizationId, user, slug } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    select: { id: true },
  });
  if (!branch) throw new Error("No branch configured");

  const now = new Date();

  // Create the appointment
  const appointment = await prisma.appointment.create({
    data: {
      organizationId,
      branchId: branch.id,
      ownerId: data.ownerId,
      petId: data.petId,
      vetId: data.type !== "GROOMING" ? (data.vetId || null) : null,
      serviceId: data.serviceId || null,
      type: data.type,
      status: "IN_PROGRESS",
      scheduledAt: now,
      durationMin: 30,
      reason: data.reason || null,
      isWalkIn: true,
      checkedInAt: now,
    },
  });

  // If grooming, create session
  if (data.type === "GROOMING") {
    const pet = await prisma.pet.findUnique({
      where: { id: data.petId },
      select: { size: true },
    });
    const petSize = data.petSize || pet?.size || "MEDIUM";

    await prisma.groomingSession.create({
      data: {
        organizationId,
        branchId: branch.id,
        petId: data.petId,
        appointmentId: appointment.id,
        groomerId: data.groomerId || null,
        kennelId: data.kennelId || null,
        petSize: petSize as KennelSize,
        services: data.groomingServices || [],
        specialInstructions: data.specialInstructions || null,
        scheduledAt: now,
        kennelAssignedAt: data.kennelId ? now : null,
      },
    });
  }

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Appointment",
    entityId: appointment.id,
    changes: { isWalkIn: { old: null, new: true } },
  });

  revalidatePath(`/app/${slug}`);
  return { success: true, type: data.type, appointmentId: appointment.id };
}
