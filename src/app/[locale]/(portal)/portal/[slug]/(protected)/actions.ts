"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentPortalUser } from "@/lib/portal-auth";

// ── Dashboard ────────────────────────────────────────────────

export async function getPortalDashboard() {
  const { owner, organizationId } = await getCurrentPortalUser();

  const [upcomingAppointments, petCount, loyaltyBalance, giftCardCount] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          organizationId,
          ownerId: owner.id,
          scheduledAt: { gte: new Date() },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        select: {
          id: true,
          type: true,
          scheduledAt: true,
          status: true,
          service: { select: { name: true } },
          pet: { select: { name: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      prisma.pet.count({
        where: { organizationId, ownerId: owner.id, isActive: true },
      }),
      prisma.loyaltyLedger.aggregate({
        where: { ownerId: owner.id },
        _sum: { amount: true },
      }),
      prisma.giftCard.count({
        where: { purchasedById: owner.id, status: "ACTIVE" },
      }),
    ]);

  return {
    upcomingAppointments: upcomingAppointments.map((a) => ({
      id: a.id,
      type: a.type,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      serviceName: a.service?.name ?? null,
      petName: a.pet?.name ?? null,
    })),
    petCount,
    loyaltyBalance: Number(loyaltyBalance._sum?.amount ?? 0),
    giftCardCount,
  };
}

// ── Pets ─────────────────────────────────────────────────────

export async function createMyPet(data: {
  name: string;
  species: "DOG" | "CAT" | "BIRD" | "REPTILE" | "RODENT" | "OTHER";
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  size: "SMALL" | "MEDIUM" | "LARGE" | "XL";
  color: string;
  breed?: string | null;
  dateOfBirth?: string | null;
  weight?: number | null;
  allergies?: string | null;
  microchipId?: string | null;
}) {
  const { owner, organizationId } = await getCurrentPortalUser();

  const pet = await prisma.pet.create({
    data: {
      organizationId,
      ownerId: owner.id,
      name: data.name,
      species: data.species,
      sex: data.sex,
      size: data.size,
      color: data.color,
      breed: data.breed ?? null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      weight: data.weight ?? null,
      allergies: data.allergies ?? null,
      microchipId: data.microchipId ?? null,
    },
  });

  return { id: pet.id };
}

export async function getMyPets() {
  const { owner, organizationId } = await getCurrentPortalUser();

  return prisma.pet.findMany({
    where: { organizationId, ownerId: owner.id, isActive: true },
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      sex: true,
      dateOfBirth: true,
      weight: true,
      color: true,
      size: true,
      photoUrl: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getPetDetail(petId: string) {
  const { owner, organizationId } = await getCurrentPortalUser();

  const pet = await prisma.pet.findFirst({
    where: { id: petId, organizationId, ownerId: owner.id },
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      sex: true,
      dateOfBirth: true,
      weight: true,
      color: true,
      size: true,
      photoUrl: true,
      allergies: true,
      microchipId: true,
      medicalRecords: {
        select: {
          id: true,
          diagnosis: true,
          notes: true,
          createdAt: true,
          prescriptions: {
            select: { id: true, medicationName: true, dosage: true, frequency: true, instructions: true },
          },
          appointment: {
            select: {
              type: true,
              scheduledAt: true,
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      vaccinations: {
        select: {
          id: true,
          vaccineName: true,
          administeredAt: true,
          nextDueDate: true,
          notes: true,
        },
        orderBy: { administeredAt: "desc" },
      },
    },
  });

  if (!pet) return null;

  return {
    ...pet,
    dateOfBirth: pet.dateOfBirth?.toISOString() ?? null,
    weight: pet.weight ? Number(pet.weight) : null,
    medicalRecords: pet.medicalRecords.map((r) => ({
      id: r.id,
      diagnosis: r.diagnosis,
      notes: r.notes,
      prescriptions: r.prescriptions,
      createdAt: r.createdAt.toISOString(),
      appointment: r.appointment
        ? {
            type: r.appointment.type,
            scheduledAt: r.appointment.scheduledAt.toISOString(),
            serviceName: r.appointment.service?.name ?? null,
          }
        : null,
    })),
    vaccinations: pet.vaccinations.map((v) => ({
      id: v.id,
      vaccineName: v.vaccineName,
      notes: v.notes,
      administeredAt: v.administeredAt.toISOString(),
      nextDueDate: v.nextDueDate?.toISOString() ?? null,
    })),
  };
}

// ── Appointments ─────────────────────────────────────────────

export async function getMyAppointments(filter: "upcoming" | "past") {
  const { owner, organizationId } = await getCurrentPortalUser();
  const now = new Date();

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      ownerId: owner.id,
      ...(filter === "upcoming"
        ? { scheduledAt: { gte: now }, status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] } }
        : { OR: [{ scheduledAt: { lt: now } }, { status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } }] }),
    },
    select: {
      id: true,
      type: true,
      scheduledAt: true,
      status: true,
      reason: true,
      service: { select: { name: true } },
      pet: { select: { name: true } },
      vet: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: filter === "upcoming" ? "asc" : "desc" },
    take: 50,
  });

  return appointments.map((a) => ({
    id: a.id,
    type: a.type,
    scheduledAt: a.scheduledAt.toISOString(),
    status: a.status,
    reason: a.reason,
    serviceName: a.service?.name ?? null,
    petName: a.pet?.name ?? null,
    vetName: a.vet ? `${a.vet.firstName} ${a.vet.lastName}` : null,
  }));
}

export async function getAppointmentDetail(appointmentId: string) {
  const { owner, organizationId } = await getCurrentPortalUser();

  const apt = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId, ownerId: owner.id },
    select: {
      id: true,
      type: true,
      scheduledAt: true,
      durationMin: true,
      status: true,
      reason: true,
      notes: true,
      service: { select: { name: true, price: true } },
      pet: { select: { name: true, species: true } },
      vet: { select: { firstName: true, lastName: true } },
      groomingSession: {
        select: {
          status: true,
          services: true,
          completedAt: true,
        },
      },
      medicalRecord: {
        select: {
          diagnosis: true,
          notes: true,
          prescriptions: {
            select: { medicationName: true, dosage: true, frequency: true, instructions: true },
          },
        },
      },
    },
  });

  if (!apt) return null;

  return {
    ...apt,
    scheduledAt: apt.scheduledAt.toISOString(),
    service: apt.service
      ? { name: apt.service.name, price: Number(apt.service.price) }
      : null,
    vetName: apt.vet ? `${apt.vet.firstName} ${apt.vet.lastName}` : null,
    groomingSession: apt.groomingSession
      ? {
          ...apt.groomingSession,
          completedAt: apt.groomingSession.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}

// ── Purchase History ─────────────────────────────────────────

export async function getMyPurchases() {
  const { owner, organizationId } = await getCurrentPortalUser();

  const sales = await prisma.sale.findMany({
    where: {
      organizationId,
      ownerId: owner.id,
      status: { in: ["COMPLETED", "PARTIAL"] },
    },
    select: {
      id: true,
      saleNumber: true,
      total: true,
      createdAt: true,
      status: true,
      _count: { select: { lines: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return sales.map((s) => ({
    id: s.id,
    saleNumber: s.saleNumber,
    total: Number(s.total),
    createdAt: s.createdAt.toISOString(),
    status: s.status,
    lineCount: s._count.lines,
  }));
}

export async function getSaleReceipt(saleId: string) {
  const { owner, organizationId } = await getCurrentPortalUser();

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId, ownerId: owner.id },
    select: {
      id: true,
      saleNumber: true,
      subtotal: true,
      itbms: true,
      discountAmount: true,
      total: true,
      createdAt: true,
      status: true,
      lines: {
        select: {
          description: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
      payments: {
        select: {
          paymentMethod: true,
          amount: true,
          paidAt: true,
        },
      },
    },
  });

  if (!sale) return null;

  return {
    ...sale,
    subtotal: Number(sale.subtotal),
    itbms: Number(sale.itbms),
    discountAmount: Number(sale.discountAmount),
    total: Number(sale.total),
    createdAt: sale.createdAt.toISOString(),
    lines: sale.lines.map((l) => ({
      ...l,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
    })),
    payments: sale.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      paidAt: p.paidAt.toISOString(),
    })),
  };
}

// ── Loyalty ──────────────────────────────────────────────────

export async function getMyLoyalty() {
  const { owner } = await getCurrentPortalUser();

  const [balance, transactions] = await Promise.all([
    prisma.loyaltyLedger.aggregate({
      where: { ownerId: owner.id },
      _sum: { amount: true },
    }),
    prisma.loyaltyLedger.findMany({
      where: { ownerId: owner.id },
      select: {
        id: true,
        type: true,
        amount: true,
        note: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    balance: Number(balance._sum?.amount ?? 0),
    transactions: transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      note: tx.note,
      createdAt: tx.createdAt.toISOString(),
    })),
  };
}

// ── Gift Cards ───────────────────────────────────────────────

export async function getMyGiftCards() {
  const { owner } = await getCurrentPortalUser();

  const cards = await prisma.giftCard.findMany({
    where: { purchasedById: owner.id },
    select: {
      id: true,
      code: true,
      balance: true,
      initialBalance: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return cards.map((c) => ({
    ...c,
    balance: Number(c.balance),
    initialBalance: Number(c.initialBalance),
    expiresAt: c.expiresAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
}

// ── Profile ──────────────────────────────────────────────────

export async function getMyProfile() {
  const { owner } = await getCurrentPortalUser();
  return owner;
}

export async function updateMyProfile(data: {
  firstName: string;
  lastName: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
}) {
  const { owner, slug } = await getCurrentPortalUser();

  await prisma.owner.update({
    where: { id: owner.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      whatsapp: data.whatsapp,
      address: data.address,
    },
  });

  return { success: true };
}
