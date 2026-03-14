"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ownerSchema, type OwnerFormData } from "@/lib/validators/owner";

const PAGE_SIZE = 20;

export async function getOwners(search?: string, page: number = 1) {
  const { organizationId } = await getCurrentUser();

  const where = {
    organizationId,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { cedula: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [owners, total] = await Promise.all([
    prisma.owner.findMany({
      where,
      include: {
        _count: { select: { pets: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.owner.count({ where }),
  ]);

  return {
    owners,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getOwner(id: string) {
  const { organizationId } = await getCurrentUser();

  const owner = await prisma.owner.findFirst({
    where: { id, organizationId },
    include: {
      pets: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });

  return owner;
}

export async function createOwner(data: OwnerFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = ownerSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const owner = await prisma.owner.create({
    data: {
      organizationId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      cedula: parsed.data.cedula || null,
      ruc: parsed.data.ruc || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/owners");
  redirect(`/dashboard/owners/${owner.id}`);
}

export async function updateOwner(id: string, data: OwnerFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = ownerSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.owner.updateMany({
    where: { id, organizationId },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      cedula: parsed.data.cedula || null,
      ruc: parsed.data.ruc || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/owners");
  revalidatePath(`/dashboard/owners/${id}`);
  return { success: true };
}

export async function deleteOwner(id: string) {
  const { organizationId } = await getCurrentUser();

  await prisma.owner.deleteMany({
    where: { id, organizationId },
  });

  revalidatePath("/dashboard/owners");
  redirect("/dashboard/owners");
}
