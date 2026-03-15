"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Calendar,
  ChevronLeft,
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
import { Button } from "@/components/ui/button";
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
  const { user, organization, permissions, can } = useTenant();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const base = `/app/${slug}`;

  const navItems: NavItem[] = [
    { nameKey: "dashboard", href: `${base}/dashboard`, icon: LayoutDashboard, section: "DASHBOARD" },
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
      <div className="flex h-14 items-center justify-between px-4">
        <Link href={`${base}/dashboard`} className="flex items-center gap-2">
          {organization.logo ? (
            <img src={organization.logo} alt={organization.name} className="h-8 w-8 rounded" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white/15 text-white font-bold text-sm">
              {organization.name.charAt(0)}
            </div>
          )}
          {!collapsed && (
            <span className="text-white font-semibold text-sm truncate max-w-[140px]">
              {organization.name}
            </span>
          )}
        </Link>
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
        {/* Mobile close */}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/50 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.nameKey}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white/90"
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
      <div className="border-t border-white/10 p-3 space-y-2">
        <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white text-xs font-semibold shrink-0">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-white/90">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[10px] text-white/40">{user.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors w-full ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span>Cerrar sesión</span>}
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
        <span className="font-semibold text-sm truncate">{organization.name}</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="relative flex w-[260px] h-full flex-col bg-[oklch(0.35_0.08_175)]"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[oklch(0.35_0.08_175)] transition-all duration-200 ${
          collapsed ? "w-16" : "w-[240px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Spacer for mobile top bar */}
      <div className="h-14 lg:hidden" />
    </>
  );
}
