"use server";

import { prisma } from "@/lib/prisma";
import { getAvailableDates } from "@/lib/grooming";
import { sendTemplatedEmail, seedGroomingTemplates } from "@/lib/email";
import { bookingSchema, type BookingInput } from "@/lib/validators/booking";
import { localDateTimeToUTC } from "@/lib/format-date";
import type { KennelSize } from "@/generated/prisma/client";

export async function getPublicOrgData(slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      branding: true,
      branches: {
        where: { isMain: true },
        include: { businessHours: true },
        take: 1,
      },
      services: {
        where: {
          type: "GROOMING",
          isBookable: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      },
      groomingConfig: true,
    },
  });

  if (!org || !org.isActive) return null;

  // Seed grooming email templates if they don't exist yet
  await seedGroomingTemplates(org.id);

  const mainBranch = org.branches[0] ?? null;
  const config = org.groomingConfig;

  return {
    orgId: org.id,
    orgName: org.name,
    logo: org.logo,
    branding: org.branding,
    mainBranch,
    services: org.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: Number(s.price),
      durationMin: s.durationMin,
      isBathService: s.isBathService,
      petSizes: s.petSizes,
    })),
    config: config
      ? {
          isOnlineBookingEnabled: config.isOnlineBookingEnabled,
          maxAdvanceDays: config.maxAdvanceDays,
        }
      : null,
  };
}

export type PublicOrgData = NonNullable<
  Awaited<ReturnType<typeof getPublicOrgData>>
>;

export async function getAvailableDatesAction(
  slug: string,
  petSize: "SMALL" | "MEDIUM" | "LARGE",
) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      branches: { where: { isMain: true }, take: 1 },
      groomingConfig: true,
    },
  });

  if (!org) return [];

  const mainBranch = org.branches[0];
  if (!mainBranch) return [];

  const maxDays = org.groomingConfig?.maxAdvanceDays ?? 7;
  return getAvailableDates(
    mainBranch.id,
    org.id,
    petSize as KennelSize,
    maxDays,
  );
}

export async function createPublicBooking(slug: string, data: BookingInput) {
  // 1. Validate input
  const parsed = bookingSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }
  const input = parsed.data;

  // 2. Lookup org + main branch
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      branches: { where: { isMain: true }, take: 1 },
      services: {
        where: { id: { in: input.serviceIds } },
      },
    },
  });

  if (!org || !org.isActive) {
    return { success: false as const, error: "Organization not found" };
  }

  const mainBranch = org.branches[0];
  if (!mainBranch) {
    return { success: false as const, error: "Branch not found" };
  }

  // 3. Find or create Owner
  let owner = await prisma.owner.findFirst({
    where: {
      email: input.email,
      organizationId: org.id,
    },
  });

  if (!owner) {
    owner = await prisma.owner.create({
      data: {
        organizationId: org.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
      },
    });
  }

  // 4. Find or create Pet
  let pet = await prisma.pet.findFirst({
    where: {
      name: input.petName,
      ownerId: owner.id,
      organizationId: org.id,
    },
  });

  if (!pet) {
    pet = await prisma.pet.create({
      data: {
        organizationId: org.id,
        ownerId: owner.id,
        name: input.petName,
        species: input.species,
        breed: input.breed || null,
      },
    });
  }

  // 5. Build scheduled date (in org timezone)
  const orgTimezone = org.timezone || "America/Panama";
  const scheduledAt = localDateTimeToUTC(input.date, "00:00", orgTimezone);

  const serviceNames = org.services.map((s) => s.name);
  const reason = serviceNames.join(", ");

  // 6. Create Appointment
  const appointment = await prisma.appointment.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      ownerId: owner.id,
      petId: pet.id,
      type: "GROOMING",
      status: "SCHEDULED",
      scheduledAt,
      reason,
      isPublicBooking: true,
    },
  });

  // 7. Create GroomingSession
  await prisma.groomingSession.create({
    data: {
      organizationId: org.id,
      branchId: mainBranch.id,
      petId: pet.id,
      scheduledAt,
      status: "PENDING",
      services: serviceNames,
      petSize: input.petSize as KennelSize,
      appointmentId: appointment.id,
    },
  });

  // 8. Create GroomingPickup if needed
  if (input.needsPickup && input.pickupAddress) {
    await prisma.groomingPickup.create({
      data: {
        organizationId: org.id,
        branchId: mainBranch.id,
        appointmentId: appointment.id,
        address: input.pickupAddress,
        latitude: input.pickupLatitude ?? null,
        longitude: input.pickupLongitude ?? null,
        status: "REQUESTED",
        pickupDate: scheduledAt,
      },
    });
  }

  // 9. Send confirmation email
  const dateFormatted = new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(scheduledAt);

  await sendTemplatedEmail({
    organizationId: org.id,
    templateSlug: "grooming-booking-confirmation",
    recipientEmail: input.email,
    variables: {
      ownerName: `${input.firstName} ${input.lastName}`,
      petName: input.petName,
      services: reason,
      date: dateFormatted,
      branchName: mainBranch.name,
      branchAddress: mainBranch.address || "",
      pickupTime: "",
    },
  });

  return { success: true as const, appointmentId: appointment.id };
}
