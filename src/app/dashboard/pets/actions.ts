"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { petSchema, type PetFormData } from "@/lib/validators/pet";

const PAGE_SIZE = 20;

export async function getPets(search?: string, page: number = 1) {
  const { organizationId } = await getCurrentUser();

  const where = {
    organizationId,
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { breed: { contains: search, mode: "insensitive" as const } },
            { microchipId: { contains: search, mode: "insensitive" as const } },
            {
              owner: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" as const } },
                  { lastName: { contains: search, mode: "insensitive" as const } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [pets, total] = await Promise.all([
    prisma.pet.findMany({
      where,
      include: {
        owner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.pet.count({ where }),
  ]);

  return {
    pets,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getPet(id: string) {
  const { organizationId } = await getCurrentUser();

  const pet = await prisma.pet.findFirst({
    where: { id, organizationId },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });

  return pet;
}

export async function getOwnersForSelect() {
  const { organizationId } = await getCurrentUser();

  return prisma.owner.findMany({
    where: { organizationId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export async function createPet(data: PetFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = petSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const pet = await prisma.pet.create({
    data: {
      organizationId,
      ownerId: parsed.data.ownerId,
      name: parsed.data.name,
      species: parsed.data.species,
      breed: parsed.data.breed || null,
      sex: parsed.data.sex,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      weight: parsed.data.weight ? parseFloat(parsed.data.weight) : null,
      color: parsed.data.color || null,
      microchipId: parsed.data.microchipId || null,
      allergies: parsed.data.allergies || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/pets");
  revalidatePath(`/dashboard/owners/${parsed.data.ownerId}`);
  redirect(`/dashboard/pets/${pet.id}`);
}

export async function updatePet(id: string, data: PetFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = petSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.pet.updateMany({
    where: { id, organizationId },
    data: {
      ownerId: parsed.data.ownerId,
      name: parsed.data.name,
      species: parsed.data.species,
      breed: parsed.data.breed || null,
      sex: parsed.data.sex,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      weight: parsed.data.weight ? parseFloat(parsed.data.weight) : null,
      color: parsed.data.color || null,
      microchipId: parsed.data.microchipId || null,
      allergies: parsed.data.allergies || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/pets");
  revalidatePath(`/dashboard/pets/${id}`);
  revalidatePath(`/dashboard/owners/${parsed.data.ownerId}`);
  return { success: true };
}

export async function deletePet(id: string) {
  const { organizationId } = await getCurrentUser();

  // Soft delete — mark as inactive
  await prisma.pet.updateMany({
    where: { id, organizationId },
    data: { isActive: false, updatedAt: new Date() },
  });

  revalidatePath("/dashboard/pets");
  redirect("/dashboard/pets");
}
