import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { prisma } from "@/lib/prisma";
import { getCurrentPortalUser } from "@/lib/portal-auth";
import { PortalTenantProvider } from "@/lib/portal-tenant-context";
import { PortalNav } from "@/components/portal-nav";

export default async function PortalProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const auth = await getCurrentPortalUser();

  if (auth.slug !== slug) {
    notFound();
  }

  const org = await prisma.organization.findUnique({
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
  });

  if (!org) notFound();

  const orgLocale = (org.locale ?? "es") as "es" | "en";
  const messages =
    orgLocale === "en"
      ? (await import("../../../../../../../messages/en.json")).default
      : (await import("../../../../../../../messages/es.json")).default;

  const branding = org.branding ?? {
    primaryColor: "#14b8a6",
    secondaryColor: "#fb923c",
    accentColor: null,
    sidebarColor: null,
    fontFamily: "Geist",
    darkMode: false,
  };

  const portalData = {
    owner: auth.owner,
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
  };

  const fontFamily = branding.fontFamily || "Inter";
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700&display=swap`;

  return (
    <NextIntlClientProvider locale={orgLocale} messages={messages}>
      <PortalTenantProvider data={portalData}>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={googleFontUrl} />
        <div className="min-h-screen bg-background">
          <PortalNav slug={slug} />
          <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            {children}
          </main>
        </div>
      </PortalTenantProvider>
    </NextIntlClientProvider>
  );
}
