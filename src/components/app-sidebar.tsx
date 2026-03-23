"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Calendar,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Dog,
  LayoutDashboard,
  Menu,
  Package,
  Scissors,
  Settings,
  ShoppingCart,
  Users,
  BarChart3,
  X,
  LogOut,
} from "lucide-react";
import { useTenant } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  nameKey: string;
  href: string;
  icon: React.ElementType;
  section?: string;
};

export function AppSidebar({ slug }: { slug: string }) {
  const t = useTranslations("nav");
  const ta = useTranslations("auth");
  const { user, organization, permissions, can } = useTenant();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const base = `/app/${slug}`;

  const navItems: NavItem[] = [
    { nameKey: "dashboard", href: `${base}/dashboard`, icon: LayoutDashboard, section: "DASHBOARD" },
    { nameKey: "reception", href: `${base}/reception`, icon: ClipboardCheck, section: "APPOINTMENTS" },
    { nameKey: "clients", href: `${base}/clients`, icon: Users, section: "CLIENTS" },
    { nameKey: "pets", href: `${base}/pets`, icon: Dog, section: "PETS" },
    { nameKey: "appointments", href: `${base}/appointments`, icon: Calendar, section: "APPOINTMENTS" },
    { nameKey: "grooming", href: `${base}/grooming`, icon: Scissors, section: "GROOMING" },
    { nameKey: "pos", href: `${base}/pos`, icon: ShoppingCart, section: "POS" },
    { nameKey: "inventory", href: `${base}/inventory`, icon: Package, section: "INVENTORY" },
    { nameKey: "services", href: `${base}/services`, icon: ClipboardList, section: "SERVICES" },
    { nameKey: "reports", href: `${base}/reports`, icon: BarChart3, section: "REPORTS" },
    { nameKey: "settings", href: `${base}/settings`, icon: Settings, section: "SETTINGS" },
  ];

  // Filter nav by permissions
  const visibleItems = navItems.filter((item) => {
    if (!item.section) return true;
    return can("view", item.section as Parameters<typeof can>[1]);
  });

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        <Link href={`${base}/dashboard`} className="flex items-center gap-2.5">
          {organization.logo ? (
            <img src={organization.logo} alt={organization.name} className="h-9 w-9 rounded-lg" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 text-white font-bold text-sm">
              {organization.name.charAt(0)}
            </div>
          )}
          {!collapsed && (
            <span className="text-white font-semibold text-[0.9375rem] truncate max-w-[140px]">
              {organization.name}
            </span>
          )}
        </Link>
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
        {/* Mobile close */}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/40 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.nameKey}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium transition-all duration-150 ${
                active ? "sidebar-nav-item-active" : "sidebar-nav-item"
              }`}
              title={collapsed ? t(item.nameKey) : undefined}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{t(item.nameKey)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4 space-y-2.5">
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 text-white text-xs font-semibold shrink-0">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white/90">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-white/40">{user.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/40 hover:text-white hover:bg-white/10 transition-colors w-full ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span>{ta("logout")}</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 bg-background px-4 border-b lg:hidden">
        <button onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-base truncate">{organization.name}</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="relative flex w-[260px] h-full flex-col"
            style={{ backgroundColor: "var(--brand-sidebar, oklch(0.25 0.06 250))" }}
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-200 ${
          collapsed ? "w-16" : "w-[240px]"
        }`}
        style={{ backgroundColor: "var(--brand-sidebar, oklch(0.25 0.06 250))" }}
      >
        {sidebarContent}
      </aside>

      {/* Spacer for mobile top bar */}
      <div className="h-14 lg:hidden" />
    </>
  );
}
