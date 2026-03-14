"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serviceSchema, type ServiceFormData } from "@/lib/validators/service";

const PAGE_SIZE = 20;

export async function getServices(search?: string, page: number = 1) {
  const { organizationId } = await getCurrentUser();

  const where = {
    organizationId,
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.service.count({ where }),
  ]);

  return { services, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getService(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.service.findFirst({ where: { id, organizationId } });
}

export async function createService(data: ServiceFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const service = await prisma.service.create({
    data: {
      organizationId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parseFloat(parsed.data.price),
      isTaxExempt: parsed.data.isTaxExempt ?? false,
      type: parsed.data.type,
      durationMin: parseInt(parsed.data.durationMin),
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/services");
  redirect(`/dashboard/services/${service.id}`);
}

export async function updateService(id: string, data: ServiceFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.service.updateMany({
    where: { id, organizationId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parseFloat(parsed.data.price),
      isTaxExempt: parsed.data.isTaxExempt ?? false,
      type: parsed.data.type,
      durationMin: parseInt(parsed.data.durationMin),
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/services");
  revalidatePath(`/dashboard/services/${id}`);
  return { success: true };
}

export async function deleteService(id: string) {
  const { organizationId } = await getCurrentUser();
  await prisma.service.updateMany({
    where: { id, organizationId },
    data: { isActive: false, updatedAt: new Date() },
  });
  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}
