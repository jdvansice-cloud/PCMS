"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { PortalOwner } from "@/lib/portal-auth";

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

type PortalTenantData = {
  owner: PortalOwner;
  organization: Organization;
  branding: Branding;
};

const PortalTenantContext = createContext<PortalTenantData | null>(null);

export function PortalTenantProvider({
  data,
  children,
}: {
  data: PortalTenantData;
  children: ReactNode;
}) {
  // Apply branding CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const b = data.branding;
    const fontFamily = b.fontFamily || "Inter";

    root.style.setProperty("--color-primary", b.primaryColor);
    root.style.setProperty("--color-secondary", b.secondaryColor);
    root.style.setProperty("--primary", b.primaryColor);
    root.style.setProperty("--primary-foreground", "#ffffff");
    root.style.setProperty("--font-sans", `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`);
    if (b.accentColor) root.style.setProperty("--color-accent", b.accentColor);
  }, [data.branding]);

  return (
    <PortalTenantContext.Provider value={data}>
      {children}
    </PortalTenantContext.Provider>
  );
}

export function usePortalTenant() {
  const ctx = useContext(PortalTenantContext);
  if (!ctx) throw new Error("usePortalTenant must be used within PortalTenantProvider");
  return ctx;
}
