import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Section, UserType } from "@/generated/prisma/client";

export type Permission = {
  section: Section;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type PermissionMap = Record<Section, Permission>;

export type PermAction = "view" | "create" | "edit" | "delete";

const ALL_SECTIONS: Section[] = [
  "DASHBOARD",
  "CLIENTS",
  "PETS",
  "APPOINTMENTS",
  "MEDICAL_RECORDS",
  "GROOMING",
  "POS",
  "INVENTORY",
  "SERVICES",
  "REPORTS",
  "SETTINGS",
  "USERS",
  "AUDIT_LOG",
];

function fullAccess(): PermissionMap {
  const map = {} as PermissionMap;
  for (const section of ALL_SECTIONS) {
    map[section] = { section, canView: true, canCreate: true, canEdit: true, canDelete: true };
  }
  return map;
}

export const getUserPermissions = cache(async function getUserPermissions(
  userType: UserType,
  roleId: string | null,
): Promise<PermissionMap> {
  // Owner and Admin get full access
  if (userType === "OWNER" || userType === "ADMIN") {
    return fullAccess();
  }

  // Staff users: load from their role
  if (!roleId) {
    // No role assigned = no access
    const map = {} as PermissionMap;
    for (const section of ALL_SECTIONS) {
      map[section] = { section, canView: false, canCreate: false, canEdit: false, canDelete: false };
    }
    return map;
  }

  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId },
  });

  const map = {} as PermissionMap;
  for (const section of ALL_SECTIONS) {
    const perm = rolePerms.find((p) => p.section === section);
    map[section] = {
      section,
      canView: perm?.canView ?? false,
      canCreate: perm?.canCreate ?? false,
      canEdit: perm?.canEdit ?? false,
      canDelete: perm?.canDelete ?? false,
    };
  }

  return map;
});

export function can(
  permissions: PermissionMap,
  action: PermAction,
  section: Section,
): boolean {
  const perm = permissions[section];
  if (!perm) return false;
  switch (action) {
    case "view":
      return perm.canView;
    case "create":
      return perm.canCreate;
    case "edit":
      return perm.canEdit;
    case "delete":
      return perm.canDelete;
    default:
      return false;
  }
}

export { ALL_SECTIONS };
