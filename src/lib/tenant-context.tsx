"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PermissionMap, PermAction } from "@/lib/permissions";
import type { Section } from "@/generated/prisma/client";
import type { AuthUser } from "@/lib/auth";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  timezone: string;
  currency: string;
  locale: string;
};

type Branding = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  sidebarColor: string | null;
  fontFamily: string;
  darkMode: boolean;
};

/** Serializable data passed from the server layout */
type TenantData = {
  user: AuthUser;
  organization: Organization;
  branding: Branding;
  permissions: PermissionMap;
};

/** Full context including the client-built `can` function */
type TenantContextType = TenantData & {
  can: (action: PermAction, section: Section) => boolean;
};

const TenantContext = createContext<TenantContextType | null>(null);

/** Build `can` on the client from serializable permissions */
function canCheck(permissions: PermissionMap, action: PermAction, section: Section): boolean {
  const perm = permissions[section];
  if (!perm) return false;
  switch (action) {
    case "view": return perm.canView;
    case "create": return perm.canCreate;
    case "edit": return perm.canEdit;
    case "delete": return perm.canDelete;
    default: return false;
  }
}

export function TenantProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: TenantData;
}) {
  const contextValue = useMemo<TenantContextType>(
    () => ({
      ...value,
      can: (action: PermAction, section: Section) =>
        canCheck(value.permissions, action, section),
    }),
    [value]
  );

  return (
    <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}
