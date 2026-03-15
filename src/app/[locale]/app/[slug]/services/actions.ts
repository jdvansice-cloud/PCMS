"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serviceSchema } from "@/lib/validators/service";
import { createAuditLog, diffChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

export async function getServices(search?: string, page = 1) {
  const { organizationId } = await getCurrentUser();
  const where: any = { organizationId, isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.service.count({ where }),
  ]);

  return { services, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getService(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.service.findFirst({ where: { id, organizationId } });
}

export async function createService(formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  // Handle checkbox booleans
  const data = {
    ...raw,
    isTaxExempt: raw.isTaxExempt === "on",
    isBookable: raw.isBookable === "on" || !raw.isBookable,
  };
  const parsed = serviceSchema.parse(data);

  const service = await prisma.service.create({
    data: {
      organizationId,
      name: parsed.name,
      description: parsed.description || null,
      price: parseFloat(parsed.price),
      type: parsed.type,
      durationMin: parseInt(parsed.durationMin),
      isTaxExempt: parsed.isTaxExempt,
      isBookable: parsed.isBookable,
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Service",
    entityId: service.id,
  });

  revalidatePath(`/app/${slug}/services`);
  redirect(`/app/${slug}/services`);
}

export async function updateService(id: string, formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  const data = {
    ...raw,
    isTaxExempt: raw.isTaxExempt === "on",
    isBookable: raw.isBookable === "on",
  };
  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const current = await prisma.service.findFirst({ where: { id, organizationId } });
  if (!current) return { error: { _form: ["No encontrado"] } };

  const updateData = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    price: parseFloat(parsed.data.price),
    type: parsed.data.type,
    durationMin: parseInt(parsed.data.durationMin),
    isTaxExempt: parsed.data.isTaxExempt,
    isBookable: parsed.data.isBookable,
  };

  await prisma.service.update({ where: { id }, data: updateData });

  const changes = diffChanges(
    current as unknown as Record<string, unknown>,
    updateData as unknown as Record<string, unknown>,
  );
  if (changes) {
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Service",
      entityId: id,
      changes,
    });
  }

  revalidatePath(`/app/${slug}/services`);
  return { success: true };
}

export async function deleteService(id: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  await prisma.service.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "SOFT_DELETE",
    entityType: "Service",
    entityId: id,
  });

  revalidatePath(`/app/${slug}/services`);
  redirect(`/app/${slug}/services`);
}
