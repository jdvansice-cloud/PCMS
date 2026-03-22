import { prisma } from "@/lib/prisma";
import type { KennelSize } from "@/generated/prisma/client";

/**
 * Check cage availability for a given branch, date, and size.
 */
export async function checkCageAvailability(
  branchId: string,
  date: Date,
  size: KennelSize,
) {
  const totalKennels = await prisma.kennel.count({
    where: { branchId, size, isAvailable: true },
  });

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Count sessions that need a cage of this size on this day
  const bookedCount = await prisma.groomingSession.count({
    where: {
      branchId,
      scheduledAt: { gte: startOfDay, lt: endOfDay },
      status: { not: "CANCELLED" },
      petSize: size,
    },
  });

  const available = totalKennels - bookedCount;
  return { totalKennels, bookedCount, available: Math.max(0, available) };
}

/**
 * Get available dates for the next N days for a branch and cage size.
 */
export async function getAvailableDates(
  branchId: string,
  organizationId: string,
  size: KennelSize,
  maxDays: number,
) {
  const businessHours = await prisma.businessHours.findMany({
    where: { branch: { id: branchId } },
  });

  const bhMap = new Map(businessHours.map((bh) => [bh.dayOfWeek, bh]));
  const dates: { date: string; available: boolean; remaining: number; closed: boolean }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= maxDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);

    const dayOfWeek = d.getDay();
    const bh = bhMap.get(dayOfWeek);
    const isClosed = !bh || bh.isClosed;

    if (isClosed) {
      dates.push({
        date: d.toISOString().split("T")[0],
        available: false,
        remaining: 0,
        closed: true,
      });
      continue;
    }

    const { available, totalKennels } = await checkCageAvailability(branchId, d, size);
    dates.push({
      date: d.toISOString().split("T")[0],
      available: available > 0,
      remaining: available,
      closed: false,
    });
  }

  return dates;
}

/**
 * Find the next available date after a given date.
 */
export async function findNextAvailableDate(
  branchId: string,
  organizationId: string,
  size: KennelSize,
  afterDate: Date,
  maxLookahead: number = 30,
): Promise<string | null> {
  const businessHours = await prisma.businessHours.findMany({
    where: { branch: { id: branchId } },
  });

  const bhMap = new Map(businessHours.map((bh) => [bh.dayOfWeek, bh]));

  for (let i = 1; i <= maxLookahead; i++) {
    const d = new Date(afterDate);
    d.setDate(d.getDate() + i);

    const dayOfWeek = d.getDay();
    const bh = bhMap.get(dayOfWeek);
    if (!bh || bh.isClosed) continue;

    const { available } = await checkCageAvailability(branchId, d, size);
    if (available > 0) {
      return d.toISOString().split("T")[0];
    }
  }

  return null;
}

/**
 * Check if an owner is eligible for a free bath.
 */
export async function checkFreeBathEligibility(
  organizationId: string,
  ownerId: string,
) {
  const config = await prisma.groomingConfig.findUnique({
    where: { organizationId },
  });

  if (!config?.freeBathEnabled) return { eligible: false, bathsUntilNext: 0, totalBaths: 0 };

  const tally = await prisma.groomingBathTally.findUnique({
    where: { organizationId_ownerId: { organizationId, ownerId } },
  });

  const totalBaths = tally?.totalBaths ?? 0;
  const redeemedBaths = tally?.redeemedBaths ?? 0;
  const totalFreeEarned = Math.floor(totalBaths / config.freeBathThreshold);
  const unredeemed = totalFreeEarned - redeemedBaths;
  const bathsUntilNext = config.freeBathThreshold - (totalBaths % config.freeBathThreshold);

  return {
    eligible: unredeemed > 0,
    bathsUntilNext,
    totalBaths,
    unredeemed,
  };
}

/**
 * Increment the bath tally for an owner after a grooming sale.
 */
export async function incrementBathTally(
  organizationId: string,
  ownerId: string,
) {
  return prisma.groomingBathTally.upsert({
    where: { organizationId_ownerId: { organizationId, ownerId } },
    create: { organizationId, ownerId, totalBaths: 1, redeemedBaths: 0 },
    update: { totalBaths: { increment: 1 } },
  });
}

/**
 * Redeem a free bath for an owner.
 */
export async function redeemFreeBath(
  organizationId: string,
  ownerId: string,
) {
  return prisma.groomingBathTally.update({
    where: { organizationId_ownerId: { organizationId, ownerId } },
    data: { redeemedBaths: { increment: 1 } },
  });
}

/**
 * Nearest-neighbor route optimization using haversine distance.
 * Returns ordered pickup IDs starting from branch location.
 */
export function optimizePickupRoute(
  branchLat: number,
  branchLng: number,
  pickups: Array<{ id: string; latitude: number; longitude: number }>,
): string[] {
  if (pickups.length <= 1) return pickups.map((p) => p.id);

  const ordered: string[] = [];
  const remaining = [...pickups];
  let current = { lat: branchLat, lng: branchLng };

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(
        current.lat,
        current.lng,
        remaining[i].latitude,
        remaining[i].longitude,
      );
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next.id);
    current = { lat: next.latitude, lng: next.longitude };
  }

  return ordered;
}

/**
 * Haversine distance between two lat/lng points in km.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
