"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog, diffChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ALL_SECTIONS } from "@/lib/permissions";
import type { Section, UserType, GiftCardStatus, PromotionType, DiscountUnit, LoyaltyTxType } from "@/generated/prisma/client";

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

  await prisma.$transaction(
    hours.map((h) =>
      prisma.businessHours.upsert({
        where: { branchId_dayOfWeek: { branchId: branch.id, dayOfWeek: h.dayOfWeek } },
        update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
        create: { branchId: branch.id, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
      }),
    ),
  );

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

  // Validate all users in a single query instead of per-user
  const validUsers = await prisma.user.findMany({
    where: { id: { in: assignments.map((a) => a.userId) }, organizationId },
    select: { id: true, branchId: true },
  });
  const validUserMap = new Map(validUsers.map((u) => [u.id, u]));

  // Phase 1: Batch upserts and deletes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txOps: any[] = [];

  for (const a of assignments) {
    if (!validUserMap.has(a.userId)) continue;

    if (a.isAssigned) {
      txOps.push(
        prisma.userBranch.upsert({
          where: { userId_branchId: { userId: a.userId, branchId } },
          update: { isDefault: a.isDefault },
          create: { userId: a.userId, branchId, isDefault: a.isDefault },
        }),
      );
      if (a.isDefault) {
        txOps.push(
          prisma.userBranch.updateMany({
            where: { userId: a.userId, branchId: { not: branchId } },
            data: { isDefault: false },
          }),
        );
        txOps.push(
          prisma.user.update({
            where: { id: a.userId },
            data: { branchId },
          }),
        );
      }
    } else {
      txOps.push(
        prisma.userBranch.deleteMany({
          where: { userId: a.userId, branchId },
        }),
      );
    }
  }

  if (txOps.length > 0) {
    await prisma.$transaction(txOps);
  }

  // Phase 2: Fix branchId for removed users whose active branch was this one
  const removedUsers = assignments
    .filter((a) => !a.isAssigned && validUserMap.get(a.userId)?.branchId === branchId)
    .map((a) => a.userId);

  if (removedUsers.length > 0) {
    const fallbacks = await prisma.userBranch.findMany({
      where: { userId: { in: removedUsers }, isDefault: true },
      select: { userId: true, branchId: true },
    });
    const fallbackMap = new Map(fallbacks.map((f) => [f.userId, f.branchId]));

    const fixOps = removedUsers.map((uid) =>
      prisma.user.update({
        where: { id: uid },
        data: { branchId: fallbackMap.get(uid) ?? null },
      }),
    );
    await prisma.$transaction(fixOps);
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

// ─── Loyalty Program ─────────────────────────────────────────────────────────

export async function getLoyaltyConfig() {
  const { organizationId } = await getCurrentUser();
  const config = await prisma.loyaltyConfig.findUnique({
    where: { organizationId },
  });
  if (!config) {
    return {
      isEnabled: false,
      dollarRate: 0.05,
      expirationDays: 365,
      minRedemption: 1.0,
    };
  }
  return {
    isEnabled: config.isEnabled,
    dollarRate: Number(config.dollarRate),
    expirationDays: config.expirationDays ?? 0,
    minRedemption: Number(config.minRedemption),
  };
}

export async function updateLoyaltyConfig(input: {
  isEnabled: boolean;
  dollarRate: number;
  expirationDays: number;
  minRedemption: number;
}) {
  const { user, organizationId, slug } = await getCurrentUser();

  await prisma.loyaltyConfig.upsert({
    where: { organizationId },
    update: {
      isEnabled: input.isEnabled,
      dollarRate: input.dollarRate,
      expirationDays: input.expirationDays || null,
      minRedemption: input.minRedemption,
    },
    create: {
      organizationId,
      isEnabled: input.isEnabled,
      dollarRate: input.dollarRate,
      expirationDays: input.expirationDays || null,
      minRedemption: input.minRedemption,
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "LoyaltyConfig",
    entityId: organizationId,
    metadata: input,
  });

  revalidatePath(`/app/${slug}/settings/loyalty`);
  return { success: true };
}

export async function getTopLoyaltyHolders() {
  const { organizationId } = await getCurrentUser();

  const holders = await prisma.loyaltyLedger.groupBy({
    by: ["ownerId"],
    where: { organizationId },
    _max: { createdAt: true },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 20,
  });

  if (holders.length === 0) return [];

  const ownerIds = holders.map((h) => h.ownerId);
  const owners = await prisma.owner.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  // Get the latest ledger entry per owner for the actual balance
  const latestEntries = await prisma.loyaltyLedger.findMany({
    where: { organizationId, ownerId: { in: ownerIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["ownerId"],
    select: { ownerId: true, balanceAfter: true, createdAt: true },
  });
  const balanceMap = new Map(
    latestEntries.map((e) => [e.ownerId, { balance: Number(e.balanceAfter), lastActivity: e.createdAt }]),
  );

  return holders
    .map((h) => {
      const owner = ownerMap.get(h.ownerId);
      const info = balanceMap.get(h.ownerId);
      if (!owner || !info || info.balance <= 0) return null;
      return {
        ownerId: h.ownerId,
        firstName: owner.firstName,
        lastName: owner.lastName,
        balance: info.balance,
        lastActivity: info.lastActivity,
      };
    })
    .filter(Boolean) as {
      ownerId: string;
      firstName: string;
      lastName: string;
      balance: number;
      lastActivity: Date;
    }[];
}

// ─── Gift Cards ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for readability
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GC-${segment()}-${segment()}`;
}

export async function getGiftCards(search?: string, page = 1) {
  const { organizationId } = await getCurrentUser();

  const where = {
    organizationId,
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" as const } },
            { purchasedBy: { firstName: { contains: search, mode: "insensitive" as const } } },
            { purchasedBy: { lastName: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.giftCard.findMany({
      where,
      include: {
        purchasedBy: { select: { firstName: true, lastName: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.giftCard.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getGiftCard(id: string) {
  const { organizationId } = await getCurrentUser();

  return prisma.giftCard.findFirst({
    where: { id, organizationId },
    include: {
      purchasedBy: { select: { firstName: true, lastName: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

export async function cancelGiftCard(id: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  const giftCard = await prisma.giftCard.findFirst({
    where: { id, organizationId },
  });
  if (!giftCard) throw new Error("Gift card not found");

  await prisma.giftCard.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GiftCard",
    entityId: id,
    metadata: { code: giftCard.code, previousStatus: giftCard.status, newStatus: "CANCELLED" },
  });

  revalidatePath(`/app/${slug}/settings`);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GIFT CARD PRODUCTS (Denominations)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getGiftCardProducts() {
  const { organizationId } = await getCurrentUser();
  return prisma.giftCardProduct.findMany({
    where: { organizationId },
    orderBy: { amount: "asc" },
  });
}

export async function createGiftCardProduct(input: {
  name: string;
  amount: number;
  expirationDays?: number;
}) {
  const { user, organizationId } = await getCurrentUser();
  const product = await prisma.giftCardProduct.create({
    data: {
      organizationId,
      name: input.name,
      amount: input.amount,
      expirationDays: input.expirationDays ?? null,
    },
  });
  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "GiftCardProduct",
    entityId: product.id,
    metadata: { name: input.name, amount: input.amount },
  });
  revalidatePath(`/app`);
  return product;
}

export async function updateGiftCardProduct(
  id: string,
  input: { name: string; amount: number; expirationDays?: number; isActive: boolean },
) {
  const { user, organizationId } = await getCurrentUser();
  const product = await prisma.giftCardProduct.update({
    where: { id },
    data: {
      name: input.name,
      amount: input.amount,
      expirationDays: input.expirationDays ?? null,
      isActive: input.isActive,
    },
  });
  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GiftCardProduct",
    entityId: id,
    metadata: { name: input.name, amount: input.amount, isActive: input.isActive },
  });
  revalidatePath(`/app`);
  return product;
}

export async function toggleGiftCardProduct(id: string) {
  const { user, organizationId } = await getCurrentUser();
  const existing = await prisma.giftCardProduct.findUnique({ where: { id } });
  if (!existing) throw new Error("Gift card product not found");
  const updated = await prisma.giftCardProduct.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GiftCardProduct",
    entityId: id,
    metadata: { isActive: updated.isActive },
  });
  revalidatePath(`/app`);
  return updated;
}

// ─── Promotions ──────────────────────────────────────────────────────────────

export async function getPromotions(search?: string, page = 1) {
  const { organizationId } = await getCurrentUser();

  const where = {
    organizationId,
    ...(search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.promotion.findMany({
      where,
      include: {
        _count: { select: { includedProducts: true, includedServices: true, sales: true, volumeTiers: true } },
        triggerProduct: { select: { id: true, name: true } },
        triggerService: { select: { id: true, name: true } },
        rewardProduct: { select: { id: true, name: true } },
        rewardService: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.promotion.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getPromotion(id: string) {
  const { organizationId } = await getCurrentUser();

  return prisma.promotion.findFirst({
    where: { id, organizationId },
    include: {
      includedProducts: {
        include: { product: { select: { id: true, name: true, price: true } } },
      },
      includedServices: {
        include: { service: { select: { id: true, name: true, price: true } } },
      },
      volumeTiers: { orderBy: { tierOrder: "asc" } },
      triggerProduct: { select: { id: true, name: true, price: true } },
      triggerService: { select: { id: true, name: true, price: true } },
      rewardProduct: { select: { id: true, name: true, price: true } },
      rewardService: { select: { id: true, name: true, price: true } },
    },
  });
}

export async function createPromotion(input: {
  name: string;
  type: PromotionType;
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  appliesToAll: boolean;
  productIds?: string[];
  serviceIds?: string[];
  // Buy X Get Y
  triggerProductId?: string;
  triggerServiceId?: string;
  rewardProductId?: string;
  rewardServiceId?: string;
  rewardDiscount?: number;
  rewardDiscountUnit?: DiscountUnit;
  // Bundle
  bundlePrice?: number;
  // Volume tiers
  volumeTiers?: { tierOrder: number; minQty: number; maxQty?: number; discount: number; discountUnit: DiscountUnit }[];
}) {
  const { user, organizationId, slug } = await getCurrentUser();

  const promotion = await prisma.promotion.create({
    data: {
      organizationId,
      name: input.name,
      type: input.type,
      value: input.value,
      minPurchase: input.minPurchase ?? null,
      maxDiscount: input.maxDiscount ?? null,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      isActive: input.isActive,
      appliesToAll: input.appliesToAll,
      // Buy X Get Y fields
      triggerProductId: input.triggerProductId ?? null,
      triggerServiceId: input.triggerServiceId ?? null,
      rewardProductId: input.rewardProductId ?? null,
      rewardServiceId: input.rewardServiceId ?? null,
      rewardDiscount: input.rewardDiscount ?? null,
      rewardDiscountUnit: input.rewardDiscountUnit ?? null,
      // Bundle price
      bundlePrice: input.bundlePrice ?? null,
      // Included items
      ...((!input.appliesToAll && input.productIds?.length)
        ? {
            includedProducts: {
              create: input.productIds.map((productId) => ({ productId })),
            },
          }
        : {}),
      ...((!input.appliesToAll && input.serviceIds?.length)
        ? {
            includedServices: {
              create: input.serviceIds.map((serviceId) => ({ serviceId })),
            },
          }
        : {}),
      // Volume tiers
      ...(input.volumeTiers?.length
        ? {
            volumeTiers: {
              create: input.volumeTiers.map((t) => ({
                tierOrder: t.tierOrder,
                minQty: t.minQty,
                maxQty: t.maxQty ?? null,
                discount: t.discount,
                discountUnit: t.discountUnit,
              })),
            },
          }
        : {}),
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Promotion",
    entityId: promotion.id,
    metadata: { name: input.name, type: input.type },
  });

  revalidatePath(`/app/${slug}/settings`);
  return { success: true, promotion };
}

export async function updatePromotion(
  id: string,
  input: {
    name: string;
    type: PromotionType;
    value: number;
    minPurchase?: number;
    maxDiscount?: number;
    usageLimit?: number;
    perCustomerLimit?: number;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    appliesToAll: boolean;
    productIds?: string[];
    serviceIds?: string[];
    triggerProductId?: string;
    triggerServiceId?: string;
    rewardProductId?: string;
    rewardServiceId?: string;
    rewardDiscount?: number;
    rewardDiscountUnit?: DiscountUnit;
    bundlePrice?: number;
    volumeTiers?: { tierOrder: number; minQty: number; maxQty?: number; discount: number; discountUnit: DiscountUnit }[];
  },
) {
  const { user, organizationId, slug } = await getCurrentUser();

  const existing = await prisma.promotion.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new Error("Promotion not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [
    prisma.promotionProduct.deleteMany({ where: { promotionId: id } }),
    prisma.promotionService.deleteMany({ where: { promotionId: id } }),
    prisma.promotionVolumeTier.deleteMany({ where: { promotionId: id } }),
    prisma.promotion.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        value: input.value,
        minPurchase: input.minPurchase ?? null,
        maxDiscount: input.maxDiscount ?? null,
        usageLimit: input.usageLimit ?? null,
        perCustomerLimit: input.perCustomerLimit ?? null,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        isActive: input.isActive,
        appliesToAll: input.appliesToAll,
        triggerProductId: input.triggerProductId ?? null,
        triggerServiceId: input.triggerServiceId ?? null,
        rewardProductId: input.rewardProductId ?? null,
        rewardServiceId: input.rewardServiceId ?? null,
        rewardDiscount: input.rewardDiscount ?? null,
        rewardDiscountUnit: input.rewardDiscountUnit ?? null,
        bundlePrice: input.bundlePrice ?? null,
      },
    }),
  ];

  if (!input.appliesToAll && input.productIds?.length) {
    ops.push(prisma.promotionProduct.createMany({
      data: input.productIds.map((productId) => ({ promotionId: id, productId })),
    }));
  }
  if (!input.appliesToAll && input.serviceIds?.length) {
    ops.push(prisma.promotionService.createMany({
      data: input.serviceIds.map((serviceId) => ({ promotionId: id, serviceId })),
    }));
  }
  if (input.volumeTiers?.length) {
    ops.push(prisma.promotionVolumeTier.createMany({
      data: input.volumeTiers.map((t) => ({
        promotionId: id,
        tierOrder: t.tierOrder,
        minQty: t.minQty,
        maxQty: t.maxQty ?? null,
        discount: t.discount,
        discountUnit: t.discountUnit,
      })),
    }));
  }

  await prisma.$transaction(ops);

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "Promotion",
    entityId: id,
    metadata: { name: input.name },
  });

  revalidatePath(`/app/${slug}/settings`);
  return { success: true };
}

export async function togglePromotion(id: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  const promotion = await prisma.promotion.findFirst({
    where: { id, organizationId },
  });
  if (!promotion) throw new Error("Promotion not found");

  const newState = !promotion.isActive;
  await prisma.promotion.update({
    where: { id },
    data: { isActive: newState },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "Promotion",
    entityId: id,
    metadata: { name: promotion.name, isActive: newState },
  });

  revalidatePath(`/app/${slug}/settings`);
  return { success: true };
}
