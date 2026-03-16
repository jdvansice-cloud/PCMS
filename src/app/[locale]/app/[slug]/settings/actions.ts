"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog, diffChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ALL_SECTIONS } from "@/lib/permissions";
import type { Section, UserType } from "@/generated/prisma/client";

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
  locale?: string;
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
      locale: data.locale || "es",
    },
  });

  if (current) {
    const changes = diffChanges(
      { name: current.name, ruc: current.ruc, dv: current.dv, phone: current.phone, email: current.email, address: current.address, website: current.website, locale: current.locale },
      { name: data.name, ruc: data.ruc, dv: data.dv, phone: data.phone, email: data.email, address: data.address, website: data.website, locale: data.locale },
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

  // Set NEXT_LOCALE cookie so next-intl middleware uses the org's locale
  const newLocale = data.locale || "es";
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", newLocale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

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
    include: {
      role: { select: { name: true } },
      userBranches: {
        include: { branch: { select: { id: true, name: true, isMain: true } } },
        orderBy: { isDefault: "desc" },
      },
    },
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

// ─── Roles & Permissions ────────────────────────────────────────────────────

export async function createRole(formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name?.trim()) throw new Error("Role name is required");

  const role = await prisma.role.create({
    data: {
      organizationId,
      name: name.trim(),
      description,
      permissions: {
        create: ALL_SECTIONS.map((section) => ({
          section,
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        })),
      },
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Role",
    entityId: role.id,
  });

  revalidatePath(`/app/${slug}/settings/roles`);
  return { success: true, roleId: role.id };
}

export async function updateRolePermissions(
  roleId: string,
  permissions: Array<{
    section: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>,
) {
  const { user, organizationId, slug } = await getCurrentUser();

  // Verify role belongs to this organization
  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId },
  });
  if (!role) throw new Error("Role not found");

  // Delete existing permissions and create new ones in a transaction
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId,
        section: p.section as Section,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      })),
    }),
  ]);

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "Role",
    entityId: roleId,
  });

  revalidatePath(`/app/${slug}/settings/roles`);
  return { success: true };
}

export async function deleteRole(roleId: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId },
    include: { _count: { select: { users: true } } },
  });

  if (!role) throw new Error("Role not found");
  if (role.isSystem) throw new Error("System roles cannot be deleted");
  if (role._count.users > 0) throw new Error("Cannot delete a role with assigned users");

  await prisma.role.delete({ where: { id: roleId } });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "DELETE",
    entityType: "Role",
    entityId: roleId,
  });

  revalidatePath(`/app/${slug}/settings/roles`);
  return { success: true };
}

// ─── User Management ────────────────────────────────────────────────────────

export async function inviteUser(formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const email = formData.get("email") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const userType = formData.get("userType") as UserType;
  const roleId = formData.get("roleId") as string | null;

  if (!email || !firstName || !lastName || !userType) {
    return { success: false, error: "Missing required fields" };
  }

  // Get the first branch for this organization
  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
  });
  if (!branch) {
    return { success: false, error: "No branch found" };
  }

  const newUser = await prisma.user.create({
    data: {
      authId: crypto.randomUUID(),
      organizationId,
      branchId: branch.id,
      email,
      firstName,
      lastName,
      userType,
      roleId: userType === "STAFF" && roleId ? roleId : null,
      userBranches: {
        create: { branchId: branch.id, isDefault: true },
      },
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "User",
    entityId: newUser.id,
    metadata: { email, firstName, lastName, userType },
  });

  revalidatePath(`/app/${slug}/settings/users`);
  return { success: true };
}

export async function updateUserRole(userId: string, roleId: string | null) {
  const { user, organizationId, slug } = await getCurrentUser();

  // Ensure the target user belongs to the same organization
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!targetUser) {
    return { success: false, error: "User not found" };
  }

  const oldRoleId = targetUser.roleId;

  await prisma.user.update({
    where: { id: userId },
    data: { roleId: roleId || null },
  });

  const changes = diffChanges(
    { roleId: oldRoleId },
    { roleId: roleId || null },
  );
  if (changes) {
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "User",
      entityId: userId,
      changes,
    });
  }

  revalidatePath(`/app/${slug}/settings/users`);
  return { success: true };
}

export async function deactivateUser(userId: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  // Ensure the target user belongs to the same organization
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!targetUser) {
    return { success: false, error: "User not found" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "SOFT_DELETE",
    entityType: "User",
    entityId: userId,
    metadata: { email: targetUser.email },
  });

  revalidatePath(`/app/${slug}/settings/users`);
  return { success: true };
}

// ─── Branch Management ──────────────────────────────────────────────────────

export async function getBranches() {
  const { organizationId } = await getCurrentUser();
  return prisma.branch.findMany({
    where: { organizationId },
    include: {
      _count: { select: { userBranches: true } },
    },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });
}

export async function createBranch(formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();
  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const address = (formData.get("address") as string) || null;

  if (!name?.trim()) throw new Error("Branch name is required");

  const branch = await prisma.branch.create({
    data: {
      organizationId,
      name: name.trim(),
      phone,
      email,
      address,
      isMain: false,
      updatedAt: new Date(),
      businessHours: {
        create: [
          { dayOfWeek: 0, openTime: "08:00", closeTime: "13:00", isClosed: true },
          { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 6, openTime: "08:00", closeTime: "13:00", isClosed: false },
        ],
      },
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Branch",
    entityId: branch.id,
    metadata: { name, phone, email, address },
  });

  revalidatePath(`/app/${slug}/settings/branches`);
  return { success: true, branchId: branch.id };
}

export async function updateBranch(branchId: string, data: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  const { user, organizationId, slug } = await getCurrentUser();
  const current = await prisma.branch.findFirst({
    where: { id: branchId, organizationId },
  });
  if (!current) throw new Error("Branch not found");

  await prisma.branch.update({
    where: { id: branchId },
    data: {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
    },
  });

  const changes = diffChanges(
    { name: current.name, phone: current.phone, email: current.email, address: current.address },
    { name: data.name, phone: data.phone, email: data.email, address: data.address },
  );
  if (changes) {
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Branch",
      entityId: branchId,
      changes,
    });
  }

  revalidatePath(`/app/${slug}/settings/branches`);
  return { success: true };
}

export async function toggleBranchActive(branchId: string) {
  const { user, organizationId, slug } = await getCurrentUser();
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId },
  });
  if (!branch) throw new Error("Branch not found");
  if (branch.isMain && branch.isActive) throw new Error("Cannot deactivate the main branch");

  const newState = !branch.isActive;
  await prisma.branch.update({
    where: { id: branchId },
    data: { isActive: newState },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: newState ? "RESTORE" : "SOFT_DELETE",
    entityType: "Branch",
    entityId: branchId,
    metadata: { name: branch.name },
  });

  revalidatePath(`/app/${slug}/settings/branches`);
  return { success: true };
}

export async function getBranchUsers(branchId: string) {
  const { organizationId } = await getCurrentUser();
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userType: true,
      isActive: true,
      userBranches: {
        where: { branchId },
        select: { isDefault: true },
      },
    },
    orderBy: { firstName: "asc" },
  });
  return users.map((u) => ({
    ...u,
    isAssigned: u.userBranches.length > 0,
    isDefault: u.userBranches[0]?.isDefault ?? false,
  }));
}

export async function assignUserBranches(
  userId: string,
  branchIds: string[],
  defaultBranchId: string,
) {
  const { user, organizationId, slug } = await getCurrentUser();

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!targetUser) throw new Error("User not found");

  if (branchIds.length > 0 && !branchIds.includes(defaultBranchId)) {
    throw new Error("Default branch must be in the assigned branches list");
  }

  await prisma.$transaction([
    prisma.userBranch.deleteMany({ where: { userId } }),
    ...(branchIds.length > 0
      ? [
          prisma.userBranch.createMany({
            data: branchIds.map((bid) => ({
              userId,
              branchId: bid,
              isDefault: bid === defaultBranchId,
            })),
          }),
          prisma.user.update({
            where: { id: userId },
            data: { branchId: defaultBranchId },
          }),
        ]
      : [
          prisma.user.update({
            where: { id: userId },
            data: { branchId: null },
          }),
        ]),
  ]);

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "UserBranch",
    entityId: userId,
    metadata: { branchIds, defaultBranchId },
  });

  revalidatePath(`/app/${slug}/settings/branches`);
  revalidatePath(`/app/${slug}/settings/users`);
  return { success: true };
}

export async function updateBranchAssignments(
  branchId: string,
  assignments: { userId: string; isAssigned: boolean; isDefault: boolean }[],
) {
  const { user, organizationId, slug } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId },
  });
  if (!branch) throw new Error("Branch not found");

  for (const a of assignments) {
    const targetUser = await prisma.user.findFirst({
      where: { id: a.userId, organizationId },
    });
    if (!targetUser) continue;

    if (a.isAssigned) {
      // Upsert the assignment
      await prisma.userBranch.upsert({
        where: { userId_branchId: { userId: a.userId, branchId } },
        update: { isDefault: a.isDefault },
        create: { userId: a.userId, branchId, isDefault: a.isDefault },
      });

      // If this is set as default, clear default from other branches for this user
      if (a.isDefault) {
        await prisma.userBranch.updateMany({
          where: { userId: a.userId, branchId: { not: branchId } },
          data: { isDefault: false },
        });
        // Sync User.branchId
        await prisma.user.update({
          where: { id: a.userId },
          data: { branchId },
        });
      }
    } else {
      // Remove the assignment
      await prisma.userBranch.deleteMany({
        where: { userId: a.userId, branchId },
      });

      // If user's active branch was this one, set to their remaining default
      if (targetUser.branchId === branchId) {
        const remaining = await prisma.userBranch.findFirst({
          where: { userId: a.userId, isDefault: true },
        });
        await prisma.user.update({
          where: { id: a.userId },
          data: { branchId: remaining?.branchId ?? null },
        });
      }
    }
  }

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "BranchAssignment",
    entityId: branchId,
    metadata: {
      assigned: assignments.filter((a) => a.isAssigned).map((a) => a.userId),
      removed: assignments.filter((a) => !a.isAssigned).map((a) => a.userId),
    },
  });

  revalidatePath(`/app/${slug}/settings/branches`);
  revalidatePath(`/app/${slug}/settings/users`);
  return { success: true };
}
