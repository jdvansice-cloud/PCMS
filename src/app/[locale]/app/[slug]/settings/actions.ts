"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog, diffChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getCompanyInfo() {
  const { organizationId } = await getCurrentUser();
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      ruc: true,
      dv: true,
      phone: true,
      email: true,
      address: true,
      website: true,
      timezone: true,
      currency: true,
      locale: true,
    },
  });
}

export async function updateCompanyInfo(data: {
  name: string;
  ruc?: string;
  dv?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
}) {
  const { user, organizationId, slug } = await getCurrentUser();

  const current = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: data.name,
      ruc: data.ruc || null,
      dv: data.dv || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      website: data.website || null,
    },
  });

  if (current) {
    const changes = diffChanges(
      { name: current.name, ruc: current.ruc, dv: current.dv, phone: current.phone, email: current.email, address: current.address, website: current.website },
      { name: data.name, ruc: data.ruc, dv: data.dv, phone: data.phone, email: data.email, address: data.address, website: data.website },
    );
    if (changes) {
      await createAuditLog({
        organizationId,
        userId: user.id,
        action: "UPDATE",
        entityType: "Organization",
        entityId: organizationId,
        changes,
      });
    }
  }

  revalidatePath(`/app/${slug}/settings`);
  return { success: true };
}

export async function getBranding() {
  const { organizationId } = await getCurrentUser();
  return prisma.organizationBranding.findUnique({
    where: { organizationId },
  });
}

export async function updateBranding(data: {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  sidebarColor?: string;
  fontFamily: string;
  darkMode: boolean;
}) {
  const { user, organizationId, slug } = await getCurrentUser();

  await prisma.organizationBranding.upsert({
    where: { organizationId },
    update: {
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor || null,
      sidebarColor: data.sidebarColor || null,
      fontFamily: data.fontFamily,
      darkMode: data.darkMode,
    },
    create: {
      organizationId,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor || null,
      sidebarColor: data.sidebarColor || null,
      fontFamily: data.fontFamily,
      darkMode: data.darkMode,
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "OrganizationBranding",
    entityId: organizationId,
  });

  revalidatePath(`/app/${slug}/settings`);
  return { success: true };
}

export async function getUsers() {
  const { organizationId } = await getCurrentUser();
  return prisma.user.findMany({
    where: { organizationId },
    include: { role: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRoles() {
  const { organizationId } = await getCurrentUser();
  return prisma.role.findMany({
    where: { organizationId },
    include: {
      permissions: true,
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getBusinessHours() {
  const { organizationId } = await getCurrentUser();
  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    include: { businessHours: { orderBy: { dayOfWeek: "asc" } } },
  });
  return branch?.businessHours ?? [];
}

export async function updateBusinessHours(
  hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[]
) {
  const { user, organizationId, slug } = await getCurrentUser();
  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
  });
  if (!branch) throw new Error("No branch found");

  for (const h of hours) {
    await prisma.businessHours.upsert({
      where: { branchId_dayOfWeek: { branchId: branch.id, dayOfWeek: h.dayOfWeek } },
      update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
      create: { branchId: branch.id, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
    });
  }

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "BusinessHours",
    entityId: branch.id,
  });

  revalidatePath(`/app/${slug}/settings`);
  return { success: true };
}
