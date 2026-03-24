"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

// ── Types ────────────────────────────────────────────────────

export type DateRange = { from: string; to: string };

export type SalesReportInput = {
  dateRange: DateRange;
  compareDateRange?: DateRange;
  categories?: ("CLINIC" | "GROOMING" | "PRODUCT")[];
  paymentMethods?: string[];
  viewMode: "summary" | "detailed";
};

export type CustomerReportInput = {
  dateRange: DateRange;
  view: "acquisition" | "retention" | "top";
};

export type ClinicReportInput = {
  dateRange: DateRange;
  view: "throughput" | "by-type" | "no-shows";
  vetId?: string;
};

export type GroomingReportInput = {
  dateRange: DateRange;
  view: "throughput" | "by-groomer" | "avg-time";
  groomerId?: string;
};

export type KennelReportInput = {
  dateRange: DateRange;
  view: "occupancy" | "turnover";
};

// ── Helpers ──────────────────────────────────────────────────

function dateWhere(range: DateRange) {
  return {
    gte: new Date(range.from),
    lte: new Date(range.to + "T23:59:59.999Z"),
  };
}

// ── Sales Report ─────────────────────────────────────────────

export async function getSalesReport(input: SalesReportInput) {
  const { organizationId } = await getCurrentUser();

  const baseWhere: Prisma.SaleWhereInput = {
    organizationId,
    createdAt: dateWhere(input.dateRange),
    status: { in: ["COMPLETED", "PARTIAL"] },
  };

  async function fetchPeriod(where: Prisma.SaleWhereInput) {
    const sales = await prisma.sale.findMany({
      where,
      select: {
        id: true,
        saleNumber: true,
        total: true,
        subtotal: true,
        itbms: true,
        discountAmount: true,
        createdAt: true,
        status: true,
        owner: { select: { firstName: true, lastName: true } },
        lines: {
          select: {
            description: true,
            quantity: true,
            lineTotal: true,
            unitPrice: true,
            isTaxExempt: true,
            productId: true,
            serviceId: true,
            service: { select: { type: true } },
          },
        },
        payments: {
          select: {
            paymentMethod: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate
    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let txCount = sales.length;
    const byPaymentMethod: Record<string, number> = {};
    const byCategory: Record<string, { count: number; revenue: number }> = {
      CLINIC: { count: 0, revenue: 0 },
      GROOMING: { count: 0, revenue: 0 },
      PRODUCT: { count: 0, revenue: 0 },
    };
    const dailyTotals: Record<string, { revenue: number; txCount: number }> = {};

    for (const sale of sales) {
      const total = Number(sale.total);
      const tax = Number(sale.itbms);
      const disc = Number(sale.discountAmount);
      totalRevenue += total;
      totalTax += tax;
      totalDiscount += disc;

      const day = sale.createdAt.toISOString().slice(0, 10);
      if (!dailyTotals[day]) dailyTotals[day] = { revenue: 0, txCount: 0 };
      dailyTotals[day].revenue += total;
      dailyTotals[day].txCount += 1;

      for (const p of sale.payments) {
        const method = p.paymentMethod;
        byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(p.amount);
      }

      for (const line of sale.lines) {
        const lineTotal = Number(line.lineTotal);
        if (line.productId) {
          byCategory.PRODUCT.count += Number(line.quantity);
          byCategory.PRODUCT.revenue += lineTotal;
        } else if (line.serviceId && line.service) {
          if (line.service.type === "GROOMING") {
            byCategory.GROOMING.count += Number(line.quantity);
            byCategory.GROOMING.revenue += lineTotal;
          } else {
            byCategory.CLINIC.count += Number(line.quantity);
            byCategory.CLINIC.revenue += lineTotal;
          }
        }
      }
    }

    return {
      totalRevenue,
      totalTax,
      totalDiscount,
      txCount,
      avgTicket: txCount > 0 ? totalRevenue / txCount : 0,
      byPaymentMethod,
      byCategory,
      dailyTotals,
      sales: sales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        total: Number(s.total),
        subtotal: Number(s.subtotal),
        itbms: Number(s.itbms),
        discount: Number(s.discountAmount),
        createdAt: s.createdAt.toISOString(),
        customer: s.owner
          ? `${s.owner.firstName} ${s.owner.lastName}`
          : null,
        lineCount: s.lines.length,
        payments: s.payments.map((p) => ({
          method: p.paymentMethod,
          amount: Number(p.amount),
        })),
      })),
    };
  }

  const periodA = await fetchPeriod(baseWhere);

  let periodB = null;
  if (input.compareDateRange) {
    periodB = await fetchPeriod({
      organizationId,
      createdAt: dateWhere(input.compareDateRange),
      status: { in: ["COMPLETED", "PARTIAL"] },
    });
  }

  return { periodA, periodB };
}

// ── Customer Report ──────────────────────────────────────────

export async function getCustomerReport(input: CustomerReportInput) {
  const { organizationId } = await getCurrentUser();
  const range = dateWhere(input.dateRange);

  if (input.view === "acquisition") {
    // New customers by firstVisitAt
    const newCustomers = await prisma.owner.findMany({
      where: {
        organizationId,
        firstVisitAt: range,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firstVisitAt: true,
        createdAt: true,
        _count: { select: { sales: true, appointments: true } },
      },
      orderBy: { firstVisitAt: "desc" },
    });

    // Group by day
    const dailyCounts: Record<string, number> = {};
    for (const c of newCustomers) {
      const day = (c.firstVisitAt ?? c.createdAt).toISOString().slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }

    return {
      totalNew: newCustomers.length,
      dailyCounts,
      customers: newCustomers.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        firstVisitAt: (c.firstVisitAt ?? c.createdAt).toISOString(),
        totalSales: c._count.sales,
        totalAppointments: c._count.appointments,
      })),
    };
  }

  if (input.view === "retention") {
    // Customers with repeat visits in range
    const owners = await prisma.owner.findMany({
      where: {
        organizationId,
        appointments: { some: { scheduledAt: range } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firstVisitAt: true,
        _count: {
          select: {
            appointments: { where: { scheduledAt: range } },
            sales: { where: { createdAt: range } },
          },
        },
      },
    });

    const returning = owners.filter((o) => o._count.appointments > 1);
    const oneTime = owners.filter((o) => o._count.appointments === 1);

    return {
      totalCustomers: owners.length,
      returningCount: returning.length,
      oneTimeCount: oneTime.length,
      retentionRate:
        owners.length > 0 ? (returning.length / owners.length) * 100 : 0,
      customers: owners.map((o) => ({
        id: o.id,
        name: `${o.firstName} ${o.lastName}`,
        visitCount: o._count.appointments,
        salesCount: o._count.sales,
        isReturning: o._count.appointments > 1,
      })),
    };
  }

  // top customers by revenue
  const sales = await prisma.sale.findMany({
    where: {
      organizationId,
      createdAt: range,
      status: { in: ["COMPLETED", "PARTIAL"] },
      ownerId: { not: null },
    },
    select: {
      ownerId: true,
      total: true,
      owner: { select: { firstName: true, lastName: true } },
    },
  });

  const byOwner: Record<
    string,
    { name: string; revenue: number; txCount: number }
  > = {};
  for (const s of sales) {
    if (!s.ownerId) continue;
    if (!byOwner[s.ownerId]) {
      byOwner[s.ownerId] = {
        name: s.owner ? `${s.owner.firstName} ${s.owner.lastName}` : "",
        revenue: 0,
        txCount: 0,
      };
    }
    byOwner[s.ownerId].revenue += Number(s.total);
    byOwner[s.ownerId].txCount += 1;
  }

  const ranked = Object.entries(byOwner)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 50);

  return {
    topCustomers: ranked,
    totalCustomers: Object.keys(byOwner).length,
  };
}

// ── Clinic Throughput ────────────────────────────────────────

export async function getClinicReport(input: ClinicReportInput) {
  const { organizationId } = await getCurrentUser();
  const range = dateWhere(input.dateRange);

  const where: Prisma.AppointmentWhereInput = {
    organizationId,
    scheduledAt: range,
    type: { not: "GROOMING" },
    ...(input.vetId ? { vetId: input.vetId } : {}),
  };

  const appointments = await prisma.appointment.findMany({
    where,
    select: {
      id: true,
      type: true,
      status: true,
      scheduledAt: true,
      durationMin: true,
      isWalkIn: true,
      vet: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
      pet: { select: { name: true, species: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Aggregate
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  const byVet: Record<string, { name: string; count: number }> = {};
  let totalDuration = 0;

  for (const apt of appointments) {
    byStatus[apt.status] = (byStatus[apt.status] || 0) + 1;
    byType[apt.type] = (byType[apt.type] || 0) + 1;

    const day = apt.scheduledAt.toISOString().slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;

    if (apt.vet) {
      const vetName = `${apt.vet.firstName} ${apt.vet.lastName}`;
      if (!byVet[vetName]) byVet[vetName] = { name: vetName, count: 0 };
      byVet[vetName].count += 1;
    }

    totalDuration += apt.durationMin ?? 0;
  }

  const completed = byStatus["COMPLETED"] || 0;
  const noShows = byStatus["NO_SHOW"] || 0;
  const cancelled = byStatus["CANCELLED"] || 0;
  const total = appointments.length;

  return {
    total,
    completed,
    noShows,
    cancelled,
    noShowRate: total > 0 ? (noShows / total) * 100 : 0,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    avgDuration: completed > 0 ? totalDuration / completed : 0,
    byStatus,
    byType,
    byVet: Object.values(byVet).sort((a, b) => b.count - a.count),
    dailyCounts,
    appointments: appointments.map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      scheduledAt: a.scheduledAt.toISOString(),
      duration: a.durationMin,
      vet: a.vet ? `${a.vet.firstName} ${a.vet.lastName}` : null,
      service: a.service?.name ?? null,
      pet: a.pet?.name ?? null,
      species: a.pet?.species ?? null,
      isWalkIn: a.isWalkIn,
    })),
  };
}

// ── Grooming Throughput ──────────────────────────────────────

export async function getGroomingReport(input: GroomingReportInput) {
  const { organizationId } = await getCurrentUser();
  const range = dateWhere(input.dateRange);

  const where: Prisma.GroomingSessionWhereInput = {
    organizationId,
    scheduledAt: range,
    ...(input.groomerId ? { groomerId: input.groomerId } : {}),
  };

  const sessions = await prisma.groomingSession.findMany({
    where,
    select: {
      id: true,
      status: true,
      petSize: true,
      scheduledAt: true,
      startedAt: true,
      completedAt: true,
      services: true,
      groomer: { select: { firstName: true, lastName: true } },
      pet: { select: { name: true, species: true, breed: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const byStatus: Record<string, number> = {};
  const byGroomer: Record<string, { name: string; count: number; totalMin: number }> = {};
  const bySize: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  let totalDuration = 0;
  let completedCount = 0;

  for (const s of sessions) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;

    if (s.petSize) {
      bySize[s.petSize] = (bySize[s.petSize] || 0) + 1;
    }

    const day = s.scheduledAt.toISOString().slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;

    if (s.groomer) {
      const name = `${s.groomer.firstName} ${s.groomer.lastName}`;
      if (!byGroomer[name]) byGroomer[name] = { name, count: 0, totalMin: 0 };
      byGroomer[name].count += 1;
    }

    if (s.status === "COMPLETED" && s.startedAt && s.completedAt) {
      const mins =
        (s.completedAt.getTime() - s.startedAt.getTime()) / 60000;
      totalDuration += mins;
      completedCount += 1;
      if (s.groomer) {
        const name = `${s.groomer.firstName} ${s.groomer.lastName}`;
        if (byGroomer[name]) byGroomer[name].totalMin += mins;
      }
    }
  }

  return {
    total: sessions.length,
    completed: completedCount,
    avgDurationMin: completedCount > 0 ? totalDuration / completedCount : 0,
    byStatus,
    bySize,
    byGroomer: Object.values(byGroomer)
      .map((g) => ({
        ...g,
        avgMin: g.count > 0 ? g.totalMin / g.count : 0,
      }))
      .sort((a, b) => b.count - a.count),
    dailyCounts,
    sessions: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      petSize: s.petSize,
      scheduledAt: s.scheduledAt.toISOString(),
      startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      groomer: s.groomer
        ? `${s.groomer.firstName} ${s.groomer.lastName}`
        : null,
      pet: s.pet?.name ?? null,
      species: s.pet?.species ?? null,
      breed: s.pet?.breed ?? null,
      services: s.services,
    })),
  };
}

// ── Kennel Efficiency ────────────────────────────────────────

export async function getKennelReport(input: KennelReportInput) {
  const { organizationId } = await getCurrentUser();
  const range = dateWhere(input.dateRange);

  const [kennels, stays] = await Promise.all([
    prisma.kennel.findMany({
      where: { organizationId },
      select: { id: true, name: true, size: true, species: true },
    }),
    prisma.kennelStay.findMany({
      where: {
        organizationId,
        admittedAt: { lte: new Date(input.dateRange.to + "T23:59:59.999Z") },
        OR: [
          { dischargedAt: null },
          { dischargedAt: { gte: new Date(input.dateRange.from) } },
        ],
      },
      select: {
        id: true,
        kennelId: true,
        admittedAt: true,
        dischargedAt: true,
        status: true,
        pet: { select: { name: true, species: true } },
        kennel: { select: { name: true } },
      },
      orderBy: { admittedAt: "desc" },
    }),
  ]);

  // Calculate days in range
  const fromDate = new Date(input.dateRange.from);
  const toDate = new Date(input.dateRange.to);
  const totalDays = Math.max(
    1,
    Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
  );
  const totalKennelDays = kennels.length * totalDays;

  // Calculate occupied days
  let occupiedDays = 0;
  const byKennel: Record<string, { name: string; stayCount: number; occupiedDays: number }> = {};

  for (const kennel of kennels) {
    byKennel[kennel.id] = { name: kennel.name, stayCount: 0, occupiedDays: 0 };
  }

  for (const stay of stays) {
    const start = new Date(Math.max(stay.admittedAt.getTime(), fromDate.getTime()));
    const end = stay.dischargedAt
      ? new Date(Math.min(stay.dischargedAt.getTime(), toDate.getTime()))
      : toDate;
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    occupiedDays += days;

    if (byKennel[stay.kennelId]) {
      byKennel[stay.kennelId].stayCount += 1;
      byKennel[stay.kennelId].occupiedDays += days;
    }
  }

  const occupancyRate =
    totalKennelDays > 0 ? (occupiedDays / totalKennelDays) * 100 : 0;

  return {
    totalKennels: kennels.length,
    totalStays: stays.length,
    occupancyRate,
    totalKennelDays,
    occupiedDays,
    avgStayDuration: stays.length > 0 ? occupiedDays / stays.length : 0,
    byKennel: Object.values(byKennel).sort((a, b) => b.occupiedDays - a.occupiedDays),
    stays: stays.map((s) => ({
      id: s.id,
      kennelName: s.kennel.name,
      petName: s.pet?.name ?? null,
      species: s.pet?.species ?? null,
      admittedAt: s.admittedAt.toISOString(),
      dischargedAt: s.dischargedAt?.toISOString() ?? null,
      status: s.status,
    })),
  };
}

// ── Vets & Groomers for filters ──────────────────────────────

export async function getReportFilters() {
  const { organizationId } = await getCurrentUser();

  const [vets, groomers] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { permissions: { some: { section: "APPOINTMENTS", canView: true } } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { permissions: { some: { section: "GROOMING", canView: true } } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return { vets, groomers };
}
