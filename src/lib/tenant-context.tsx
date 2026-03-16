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

/** Convert hex to RGB components */
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

/** Pre-compute all CSS custom properties from branding (memoized) */
function computeBrandingVars(branding: Branding): Record<string, string> {
  const sidebarBg = branding.sidebarColor || darkenHex(branding.primaryColor, 0.35);
  const fontFamily = branding.fontFamily || "Inter";

  return {
    // Primary
    "--brand-primary": branding.primaryColor,
    "--brand-primary-light": lightenHex(branding.primaryColor, 0.85),
    "--brand-primary-foreground": "#ffffff",
    "--primary": branding.primaryColor,
    "--primary-foreground": "#ffffff",
    "--ring": branding.primaryColor,
    "--accent": lightenHex(branding.primaryColor, 0.85),
    "--accent-foreground": darkenHex(branding.primaryColor, 0.3),
    // Secondary
    "--brand-secondary": branding.secondaryColor,
    "--brand-secondary-light": lightenHex(branding.secondaryColor, 0.85),
    "--secondary": branding.secondaryColor,
    "--secondary-foreground": "#ffffff",
    // Accent
    ...(branding.accentColor ? { "--brand-accent": branding.accentColor } : {}),
    // Sidebar
    "--brand-sidebar": sidebarBg,
    "--brand-sidebar-hover": lightenHex(sidebarBg, 0.1),
    "--brand-sidebar-active": lightenHex(sidebarBg, 0.15),
    "--brand-sidebar-border": lightenHex(sidebarBg, 0.08),
    // Font
    "--font-sans": `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`,
  };
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
    [value.user, value.organization, value.branding, value.permissions],
  );

  // Memoize all CSS variable computations — only recompute when branding changes
  const cssVars = useMemo(() => computeBrandingVars(value.branding), [value.branding]);

  // Apply branding as CSS custom properties on documentElement
  useEffect(() => {
    const root = document.documentElement;

    // Batch all CSS variable updates
    for (const [key, val] of Object.entries(cssVars)) {
      root.style.setProperty(key, val);
    }

    // Font on root element so portals (dialogs, popovers) inherit it
    const fontFamily = value.branding.fontFamily || "Inter";
    root.style.fontFamily = `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`;

    // Dark mode
    root.classList.toggle("dark", value.branding.darkMode);
  }, [cssVars, value.branding.fontFamily, value.branding.darkMode]);

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
