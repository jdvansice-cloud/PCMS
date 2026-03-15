"use client";

import { createContext, useContext, type ReactNode } from "react";
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

type TenantContextType = {
  user: AuthUser;
  organization: Organization;
  branding: Branding;
  permissions: PermissionMap;
  can: (action: PermAction, section: Section) => boolean;
};

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: TenantContextType;
}) {
  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}
