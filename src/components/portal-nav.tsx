"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  PawPrint,
  CalendarDays,
  Receipt,
  Star,
  Gift,
  User,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export function PortalNav({ slug }: { slug: string }) {
  const t = useTranslations("portal.nav");
  const { owner, organization, branding } = usePortalTenant();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = `/portal/${slug}`;

  const links = [
    { href: `${base}/dashboard`, label: t("dashboard"), icon: LayoutDashboard },
    { href: `${base}/pets`, label: t("pets"), icon: PawPrint },
    { href: `${base}/appointments`, label: t("appointments"), icon: CalendarDays },
    { href: `${base}/history`, label: t("history"), icon: Receipt },
    { href: `${base}/loyalty`, label: t("loyalty"), icon: Star },
    { href: `${base}/gift-cards`, label: t("giftCards"), icon: Gift },
    { href: `${base}/profile`, label: t("profile"), icon: User },
  ];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/portal/${slug}`;
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className="border-b bg-white sticky top-0 z-50"
      style={{ borderColor: `${branding.primaryColor}20` }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo + org name */}
          <Link href={`${base}/dashboard`} className="flex items-center gap-2">
            {organization.logo ? (
              <img
                src={organization.logo}
                alt={organization.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {organization.name.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-sm hidden sm:block">
              {organization.name}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive(link.href)
                    ? "font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={
                  isActive(link.href)
                    ? { color: branding.primaryColor, backgroundColor: `${branding.primaryColor}10` }
                    : undefined
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="ml-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  isActive(link.href)
                    ? "font-medium"
                    : "text-muted-foreground"
                }`}
                style={
                  isActive(link.href)
                    ? { color: branding.primaryColor, backgroundColor: `${branding.primaryColor}10` }
                    : undefined
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground w-full"
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
