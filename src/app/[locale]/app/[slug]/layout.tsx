import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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

  // Load org data + branding in one query
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

  // If org locale doesn't match URL locale, set the NEXT_LOCALE cookie and redirect.
  // next-intl middleware reads this cookie to determine locale on subsequent requests.
  const orgLocale = org.locale ?? "es";
  if (locale !== orgLocale) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("NEXT_LOCALE", orgLocale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    const prefix = orgLocale === "es" ? "" : `/${orgLocale}`;
    redirect(`${prefix}/app/${slug}`);
  }

  const permissions = await getUserPermissions(auth.user.userType, auth.user.roleId);

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

  return (
    <TenantProvider value={tenantValue}>
      <div className="flex h-screen">
        <AppSidebar slug={slug} />
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </TenantProvider>
  );
}
