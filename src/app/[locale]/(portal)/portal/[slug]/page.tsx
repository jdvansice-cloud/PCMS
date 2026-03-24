import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PortalOtpLogin } from "./portal-otp-login";

export default async function PortalLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      branding: {
        select: {
          primaryColor: true,
          secondaryColor: true,
          sidebarColor: true,
          fontFamily: true,
        },
      },
    },
  });

  if (!org || !org.slug) return notFound();

  return (
    <PortalOtpLogin
      org={{
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        primaryColor: org.branding?.primaryColor ?? "#14b8a6",
        sidebarColor: org.branding?.sidebarColor ?? null,
        fontFamily: org.branding?.fontFamily ?? "Geist",
      }}
    />
  );
}
