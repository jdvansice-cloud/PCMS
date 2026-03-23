"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { petSchema } from "@/lib/validators/pet";
import { createAuditLog, diffChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

export async function getPets(search?: string, page = 1) {
  const { organizationId } = await getCurrentUser();
  const where: any = { organizationId, isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { breed: { contains: search, mode: "insensitive" } },
      { microchipId: { contains: search, mode: "insensitive" } },
      { owner: { firstName: { contains: search, mode: "insensitive" } } },
      { owner: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [pets, total] = await Promise.all([
    prisma.pet.findMany({
      where,
      include: { owner: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.pet.count({ where }),
  ]);

  return { pets, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getPet(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.pet.findFirst({
    where: { id, organizationId },
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function createPet(formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  const parsed = petSchema.parse(raw);

  const pet = await prisma.pet.create({
    data: {
      organizationId,
      ownerId: parsed.ownerId,
      name: parsed.name,
      species: parsed.species,
      breed: parsed.breed || null,
      sex: parsed.sex,
      dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : null,
      weight: parsed.weight ? parseFloat(parsed.weight) : null,
      color: parsed.color || null,
      size: parsed.size || null,
      microchipId: parsed.microchipId || null,
      allergies: parsed.allergies || null,
      notes: parsed.notes || null,
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Pet",
    entityId: pet.id,
  });

  revalidatePath(`/app/${slug}/pets`);
  redirect(`/app/${slug}/pets`);
}

export async function updatePet(id: string, formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  const parsed = petSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const current = await prisma.pet.findFirst({ where: { id, organizationId } });
  if (!current) return { error: { _form: ["No encontrado"] } };

  const updateData = {
    ownerId: parsed.data.ownerId,
    name: parsed.data.name,
    species: parsed.data.species,
    breed: parsed.data.breed || null,
    sex: parsed.data.sex,
    size: parsed.data.size || null,
    dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
    weight: parsed.data.weight ? parseFloat(parsed.data.weight) : null,
    color: parsed.data.color || null,
    microchipId: parsed.data.microchipId || null,
    allergies: parsed.data.allergies || null,
    notes: parsed.data.notes || null,
  };

  await prisma.pet.update({ where: { id }, data: updateData });

  const changes = diffChanges(
    current as unknown as Record<string, unknown>,
    updateData as unknown as Record<string, unknown>,
  );
  if (changes) {
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Pet",
      entityId: id,
      changes,
    });
  }

  revalidatePath(`/app/${slug}/pets`);
  return { success: true };
}

export async function deletePet(id: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  await prisma.pet.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "SOFT_DELETE",
    entityType: "Pet",
    entityId: id,
  });

  revalidatePath(`/app/${slug}/pets`);
  redirect(`/app/${slug}/pets`);
}

export async function getOwnersForSelect() {
  const { organizationId } = await getCurrentUser();
  return prisma.owner.findMany({
    where: { organizationId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });
}
