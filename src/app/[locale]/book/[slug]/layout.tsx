import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function BookingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: { branding: true },
  });
  if (!org || !org.isActive) return notFound();

  const messages = await getMessages();
  const branding = org.branding;
  const primaryColor = branding?.primaryColor || "#14b8a6";

  return (
    <NextIntlClientProvider messages={messages}>
      <div style={{ "--brand-primary": primaryColor } as React.CSSProperties}>
        {/* Simple header with logo */}
        <header className="border-b bg-white px-4 py-3 flex items-center gap-3">
          {org.logo ? (
            <img
              src={org.logo}
              alt={org.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              {org.name.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-lg">{org.name}</span>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
