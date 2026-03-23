"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { sendTemplatedEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import type { KennelSize, GroomingStatus } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// getGroomingBoard
// ---------------------------------------------------------------------------
export async function getGroomingBoard(dateStr: string) {
  const { organizationId } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
  });
  if (!branch) throw new Error("Main branch not found");

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const sessions = await prisma.groomingSession.findMany({
    where: {
      organizationId,
      branchId: branch.id,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      pickedUpAt: null, // hide picked-up sessions from the board
    },
    include: {
      pet: {
        select: {
          id: true, name: true, species: true, breed: true, color: true, size: true,
          owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      },
      groomer: { select: { id: true, firstName: true, lastName: true } },
      kennel: true,
      appointment: { include: { groomingPickup: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const kennels = await prisma.kennel.findMany({
    where: { organizationId, branchId: branch.id, isAvailable: true },
    orderBy: [{ size: "asc" }, { name: "asc" }],
  });

  // Group available kennels — exclude those currently occupied
  const occupiedKennelIds = new Set(
    sessions
      .filter(
        (s) =>
          s.kennelId &&
          s.status !== "COMPLETED" &&
          s.status !== "CANCELLED" &&
          !s.kennelReleasedAt
      )
      .map((s) => s.kennelId!)
  );

  // Also check all sessions today (including picked-up ones) for occupied kennels
  const allSessionsToday = await prisma.groomingSession.findMany({
    where: {
      organizationId,
      branchId: branch.id,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      kennelId: { not: null },
      kennelReleasedAt: null,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    select: { kennelId: true },
  });
  for (const s of allSessionsToday) {
    if (s.kennelId) occupiedKennelIds.add(s.kennelId);
  }

  const SIZE_ORDER: Record<string, number> = { SMALL: 1, MEDIUM: 2, LARGE: 3, XL: 4 };

  // Available kennels indexed by minimum pet size they can serve
  const availableKennels: Record<string, typeof kennels> = {};
  const freeKennels = kennels.filter((k) => !occupiedKennelIds.has(k.id));

  // Group by the kennel's own size (backwards compatible)
  for (const k of freeKennels) {
    const key = k.size as string;
    if (!availableKennels[key]) availableKennels[key] = [];
    availableKennels[key].push(k);
  }

  // Helper: get compatible kennels for a given pet size (same size or larger)
  function getCompatibleKennels(petSize: string) {
    const minOrder = SIZE_ORDER[petSize] ?? 1;
    return freeKennels.filter((k) => (SIZE_ORDER[k.size] ?? 0) >= minOrder);
  }

  return { sessions, kennels, availableKennels, freeKennels, branchId: branch.id };
}

// ---------------------------------------------------------------------------
// getGroomers
// ---------------------------------------------------------------------------
export async function getGroomers() {
  const { organizationId } = await getCurrentUser();

  // Users who are ADMIN/OWNER or have the "Peluquero" role
  const groomers = await prisma.user.findMany({
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
  });

  return groomers;
}

// ---------------------------------------------------------------------------
// createGroomingSession
// ---------------------------------------------------------------------------
export async function createGroomingSession(data: {
  appointmentId: string;
  groomerId?: string | null;
  kennelId?: string | null;
  petSize: KennelSize;
  services: string[];
  specialInstructions?: string | null;
  notes?: string | null;
}) {
  const { organizationId, user } = await getCurrentUser();

  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointmentId },
    select: { scheduledAt: true, petId: true, branchId: true },
  });
  if (!appointment) throw new Error("Appointment not found");

  const session = await prisma.groomingSession.create({
    data: {
      organizationId,
      branchId: appointment.branchId,
      petId: appointment.petId,
      appointmentId: data.appointmentId,
      groomerId: data.groomerId ?? undefined,
      kennelId: data.kennelId ?? undefined,
      petSize: data.petSize,
      services: data.services,
      specialInstructions: data.specialInstructions,
      notes: data.notes,
      scheduledAt: appointment.scheduledAt,
      kennelAssignedAt: data.kennelId ? new Date() : undefined,
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "GroomingSession",
    entityId: session.id,
  });

  revalidatePath(`/app`);
  return session;
}

// ---------------------------------------------------------------------------
// assignKennel
// ---------------------------------------------------------------------------
export async function assignKennel(sessionId: string, kennelId: string) {
  const { organizationId, user } = await getCurrentUser();

  const session = await prisma.groomingSession.update({
    where: { id: sessionId, organizationId },
    data: { kennelId, kennelAssignedAt: new Date() },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GroomingSession",
    entityId: session.id,
    changes: { kennelId: { old: null, new: kennelId } },
  });

  revalidatePath(`/app`);
  return session;
}

// ---------------------------------------------------------------------------
// releaseKennel
// ---------------------------------------------------------------------------
export async function releaseKennel(sessionId: string) {
  const { organizationId, user } = await getCurrentUser();

  const session = await prisma.groomingSession.update({
    where: { id: sessionId, organizationId },
    data: { kennelReleasedAt: new Date(), kennelId: null },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GroomingSession",
    entityId: session.id,
    changes: { kennelId: { old: session.kennelId, new: null } },
  });

  revalidatePath(`/app`);
  return session;
}

// ---------------------------------------------------------------------------
// assignGroomer
// ---------------------------------------------------------------------------
export async function assignGroomer(sessionId: string, groomerId: string) {
  const { organizationId, user } = await getCurrentUser();

  const session = await prisma.groomingSession.update({
    where: { id: sessionId, organizationId },
    data: { groomerId },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GroomingSession",
    entityId: session.id,
    changes: { groomerId: { old: null, new: groomerId } },
  });

  revalidatePath(`/app`);
  return session;
}

// ---------------------------------------------------------------------------
// updateGroomingStatus
// ---------------------------------------------------------------------------
export async function updateGroomingStatus(
  sessionId: string,
  status: GroomingStatus
) {
  const { organizationId, user } = await getCurrentUser();

  const existing = await prisma.groomingSession.findUnique({
    where: { id: sessionId, organizationId },
    include: {
      pet: { include: { owner: true } },
      appointment: { include: { owner: true } },
    },
  });
  if (!existing) throw new Error("Session not found");

  const updateData: Record<string, unknown> = { status };

  if (status === "IN_PROGRESS") {
    updateData.startedAt = new Date();
  }
  if (status === "COMPLETED") {
    updateData.completedAt = new Date();
    if (existing.kennelId && !existing.kennelReleasedAt) {
      updateData.kennelReleasedAt = new Date();
      updateData.kennelId = null;
    }
  }

  const session = await prisma.groomingSession.update({
    where: { id: sessionId, organizationId },
    data: updateData,
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GroomingSession",
    entityId: session.id,
    changes: { status: { old: existing.status, new: status } },
  });

  // Send email notification when grooming is completed
  if (status === "COMPLETED") {
    const ownerEmail =
      existing.appointment?.owner?.email ?? existing.pet.owner.email;
    const petName = existing.pet.name;
    const ownerName = existing.appointment?.owner?.firstName ?? existing.pet.owner.firstName;

    if (ownerEmail) {
      await sendTemplatedEmail({
        organizationId,
        templateSlug: "grooming-pet-ready",
        recipientEmail: ownerEmail,
        variables: {
          petName,
          ownerName,
        },
      }).catch((err) => {
        console.error("Failed to send grooming-pet-ready email:", err);
      });
    }
  }

  revalidatePath(`/app`);
  return session;
}

// ---------------------------------------------------------------------------
// markGroomingPickedUp
// ---------------------------------------------------------------------------
export async function markGroomingPickedUp(sessionId: string) {
  const { organizationId, user } = await getCurrentUser();

  const session = await prisma.groomingSession.findUnique({
    where: { id: sessionId, organizationId },
  });
  if (!session) throw new Error("Session not found");

  const now = new Date();

  await prisma.groomingSession.update({
    where: { id: sessionId },
    data: { pickedUpAt: now },
  });

  // Also update the linked appointment if it exists
  if (session.appointmentId) {
    await prisma.appointment.update({
      where: { id: session.appointmentId },
      data: { pickedUpAt: now, status: "COMPLETED" },
    });
  }

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GroomingSession",
    entityId: sessionId,
    changes: { pickedUpAt: { old: null, new: now.toISOString() } },
  });

  revalidatePath(`/app`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// getKennelOccupancy
// ---------------------------------------------------------------------------
export async function getKennelOccupancy(dateStr: string) {
  const { organizationId } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
  });
  if (!branch) throw new Error("Main branch not found");

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
        include: {
          pet: { select: { name: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ size: "asc" }, { name: "asc" }],
  });

  return kennels;
}

// ---------------------------------------------------------------------------
// getDailyPickups
// ---------------------------------------------------------------------------
export async function getDailyPickups(dateStr: string) {
  const { organizationId } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
  });
  if (!branch) throw new Error("Main branch not found");

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const pickups = await prisma.groomingPickup.findMany({
    where: {
      organizationId,
      branchId: branch.id,
      pickupDate: { gte: dayStart, lte: dayEnd },
    },
    include: {
      appointment: {
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          pet: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { routeOrder: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });

  return pickups.map((p) => ({
    id: p.id,
    address: p.address,
    latitude: p.latitude ? Number(p.latitude) : null,
    longitude: p.longitude ? Number(p.longitude) : null,
    status: p.status,
    pickupTime: p.pickupTime,
    pickupDate: p.pickupDate.toISOString(),
    pickedUpAt: p.pickedUpAt?.toISOString() ?? null,
    deliveryTime: p.deliveryTime,
    deliveredAt: p.deliveredAt?.toISOString() ?? null,
    routeOrder: p.routeOrder,
    notes: p.notes,
    ownerName: `${p.appointment.owner.firstName} ${p.appointment.owner.lastName}`,
    ownerEmail: p.appointment.owner.email,
    petName: p.appointment.pet.name,
    appointmentId: p.appointmentId,
  }));
}

// ---------------------------------------------------------------------------
// confirmPickup
// ---------------------------------------------------------------------------
export async function confirmPickup(pickupId: string, pickupTime: string) {
  const { organizationId, user } = await getCurrentUser();

  const pickup = await prisma.groomingPickup.update({
    where: { id: pickupId, organizationId },
    data: { status: "CONFIRMED", pickupTime },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GroomingPickup",
    entityId: pickup.id,
    changes: { status: { old: "REQUESTED", new: "CONFIRMED" }, pickupTime: { old: null, new: pickupTime } },
  });

  revalidatePath(`/app`);
  return pickup;
}

// ---------------------------------------------------------------------------
// updatePickupStatus
// ---------------------------------------------------------------------------
export async function updatePickupStatus(pickupId: string, status: string) {
  const { organizationId, user } = await getCurrentUser();

  const existing = await prisma.groomingPickup.findUnique({
    where: { id: pickupId, organizationId },
    include: {
      appointment: {
        include: {
          owner: { select: { firstName: true, email: true } },
          pet: { select: { name: true } },
        },
      },
    },
  });
  if (!existing) throw new Error("Pickup not found");

  const updateData: Record<string, unknown> = { status };

  if (status === "PICKED_UP") {
    updateData.pickedUpAt = new Date();
  }
  if (status === "DELIVERED") {
    updateData.deliveredAt = new Date();
  }

  const pickup = await prisma.groomingPickup.update({
    where: { id: pickupId, organizationId },
    data: updateData,
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GroomingPickup",
    entityId: pickup.id,
    changes: { status: { old: existing.status, new: status } },
  });

  // Send email when delivered
  if (status === "DELIVERED") {
    const ownerEmail = existing.appointment.owner.email;
    const petName = existing.appointment.pet.name;
    const ownerName = existing.appointment.owner.firstName;

    if (ownerEmail) {
      await sendTemplatedEmail({
        organizationId,
        templateSlug: "grooming-pet-delivered",
        recipientEmail: ownerEmail,
        variables: { petName, ownerName },
      }).catch((err) => {
        console.error("Failed to send grooming-pet-delivered email:", err);
      });
    }
  }

  revalidatePath(`/app`);
  return pickup;
}

// ---------------------------------------------------------------------------
// optimizeRouteAction
// ---------------------------------------------------------------------------
export async function optimizeRouteAction(dateStr: string) {
  const { organizationId } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
  });
  if (!branch) throw new Error("Main branch not found");

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const pickups = await prisma.groomingPickup.findMany({
    where: {
      organizationId,
      branchId: branch.id,
      pickupDate: { gte: dayStart, lte: dayEnd },
      status: { not: "CANCELLED" },
    },
  });

  // Use Panama City defaults since Branch doesn't have lat/lng
  const branchLat = 9.0;
  const branchLng = -79.5;

  const pickupsWithCoords = pickups
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({
      id: p.id,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
    }));

  if (pickupsWithCoords.length === 0) {
    revalidatePath(`/app`);
    return;
  }

  const { optimizePickupRoute } = await import("@/lib/grooming");
  const orderedIds = optimizePickupRoute(branchLat, branchLng, pickupsWithCoords);

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.groomingPickup.update({
        where: { id },
        data: { routeOrder: index + 1 },
      })
    )
  );

  // Set null routeOrder for pickups without coordinates
  const pickupsWithoutCoords = pickups.filter((p) => !p.latitude || !p.longitude);
  if (pickupsWithoutCoords.length > 0) {
    await Promise.all(
      pickupsWithoutCoords.map((p) =>
        prisma.groomingPickup.update({
          where: { id: p.id },
          data: { routeOrder: orderedIds.length + 1 },
        })
      )
    );
  }

  revalidatePath(`/app`);
}
