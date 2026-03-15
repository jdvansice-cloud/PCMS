"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ownerSchema } from "@/lib/validators/owner";
import { createAuditLog, diffChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

export async function getOwners(search?: string, page = 1) {
  const { organizationId } = await getCurrentUser();
  const where: any = { organizationId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { cedula: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [owners, total] = await Promise.all([
    prisma.owner.findMany({
      where,
      include: { _count: { select: { pets: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.owner.count({ where }),
  ]);

  return { owners, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getOwner(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.owner.findFirst({
    where: { id, organizationId },
    include: {
      pets: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  });
}

export async function createOwner(formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  const parsed = ownerSchema.parse(raw);

  const owner = await prisma.owner.create({
    data: { organizationId, ...parsed },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Owner",
    entityId: owner.id,
  });

  revalidatePath(`/app/${slug}/clients`);
  redirect(`/app/${slug}/clients`);
}

export async function updateOwner(id: string, formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  const parsed = ownerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const current = await prisma.owner.findFirst({
    where: { id, organizationId },
  });
  if (!current) return { error: { _form: ["No encontrado"] } };

  const updated = await prisma.owner.update({
    where: { id },
    data: parsed.data,
  });

  const changes = diffChanges(
    current as unknown as Record<string, unknown>,
    parsed.data as unknown as Record<string, unknown>,
  );
  if (changes) {
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Owner",
      entityId: id,
      changes,
    });
  }

  revalidatePath(`/app/${slug}/clients`);
  return { success: true };
}

export async function deleteOwner(id: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  await prisma.owner.delete({
    where: { id },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "DELETE",
    entityType: "Owner",
    entityId: id,
  });

  revalidatePath(`/app/${slug}/clients`);
  redirect(`/app/${slug}/clients`);
}

export async function getOwnersForSelect() {
  const { organizationId } = await getCurrentUser();
  return prisma.owner.findMany({
    where: { organizationId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });
}
