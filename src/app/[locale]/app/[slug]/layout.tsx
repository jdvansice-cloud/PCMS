import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { TenantProvider } from "@/lib/tenant-context";
import { AppSidebar } from "@/components/app-sidebar";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const auth = await getCurrentUser();

  // Verify user belongs to this org slug
  if (auth.slug !== slug) {
    notFound();
  }

  // Run org query and permissions query in parallel (both depend on auth, but not each other)
  const [org, permissions] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: auth.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        timezone: true,
        currency: true,
        locale: true,
        branding: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
            sidebarColor: true,
            fontFamily: true,
            darkMode: true,
          },
        },
      },
    }),
    getUserPermissions(auth.user.userType, auth.user.roleId),
  ]);

  if (!org) notFound();

  // Use the org's saved locale for translations, regardless of URL locale.
  // Static branches allow webpack to resolve both paths at build time.
  const orgLocale = (org.locale ?? "es") as "es" | "en";
  const messages =
    orgLocale === "en"
      ? (await import("../../../../../messages/en.json")).default
      : (await import("../../../../../messages/es.json")).default;

  const branding = org.branding ?? {
    primaryColor: "#14b8a6",
    secondaryColor: "#fb923c",
    accentColor: null,
    sidebarColor: null,
    fontFamily: "Geist",
    darkMode: false,
  };

  const tenantValue = {
    user: auth.user,
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      timezone: org.timezone,
      currency: org.currency,
      locale: org.locale,
    },
    branding,
    permissions,
  };

  // Load the branding font from Google Fonts
  const fontFamily = branding.fontFamily || "Inter";
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`;

  return (
    <NextIntlClientProvider locale={orgLocale} messages={messages}>
      <TenantProvider value={tenantValue}>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={googleFontUrl} />
        <div className="flex h-screen">
          <AppSidebar slug={slug} />
          <main className="flex-1 overflow-auto bg-background">
            <div className="p-5 sm:p-7 lg:p-10">{children}</div>
          </main>
        </div>
      </TenantProvider>
    </NextIntlClientProvider>
  );
}
