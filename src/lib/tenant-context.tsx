"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
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

/** Convert hex to an oklch-ish CSS color (just use hex directly for dynamic branding) */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) };
}

/** Darken a hex color by a factor (0-1) */
function darkenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r * (1 - factor));
  const g = Math.round(rgb.g * (1 - factor));
  const b = Math.round(rgb.b * (1 - factor));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Lighten a hex color by mixing with white */
function lightenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
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

  // Apply branding as CSS custom properties
  useEffect(() => {
    const { branding } = value;
    const root = document.documentElement;

    // Primary color and variants
    root.style.setProperty("--brand-primary", branding.primaryColor);
    root.style.setProperty("--brand-primary-light", lightenHex(branding.primaryColor, 0.85));
    root.style.setProperty("--brand-primary-foreground", "#ffffff");

    // Override shadcn CSS variables so buttons/badges pick up branding
    root.style.setProperty("--primary", branding.primaryColor);
    root.style.setProperty("--primary-foreground", "#ffffff");
    root.style.setProperty("--ring", branding.primaryColor);
    root.style.setProperty("--accent", lightenHex(branding.primaryColor, 0.85));
    root.style.setProperty("--accent-foreground", darkenHex(branding.primaryColor, 0.3));

    // Secondary color
    root.style.setProperty("--brand-secondary", branding.secondaryColor);
    root.style.setProperty("--brand-secondary-light", lightenHex(branding.secondaryColor, 0.85));
    root.style.setProperty("--secondary", branding.secondaryColor);
    root.style.setProperty("--secondary-foreground", "#ffffff");

    // Accent
    if (branding.accentColor) {
      root.style.setProperty("--brand-accent", branding.accentColor);
    }

    // Sidebar
    const sidebarBg = branding.sidebarColor || darkenHex(branding.primaryColor, 0.35);
    root.style.setProperty("--brand-sidebar", sidebarBg);
    root.style.setProperty("--brand-sidebar-hover", lightenHex(sidebarBg, 0.1));
    root.style.setProperty("--brand-sidebar-active", lightenHex(sidebarBg, 0.15));
    root.style.setProperty("--brand-sidebar-border", lightenHex(sidebarBg, 0.08));

    // Font — set on documentElement so portals (dialogs, popovers) inherit it
    const fontFamily = branding.fontFamily || "Inter";
    root.style.setProperty("--font-sans", `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`);
    root.style.fontFamily = `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`;

    // Dark mode
    if (branding.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [value]);

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
