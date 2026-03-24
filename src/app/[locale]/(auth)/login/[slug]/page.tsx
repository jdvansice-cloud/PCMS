import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BrandedOtpLogin } from "./otp-login";

export default async function BrandedLoginPage({
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
          darkMode: true,
          customLoginBg: true,
        },
      },
    },
  });

  if (!org || !org.slug) return notFound();

  return (
    <BrandedOtpLogin
      org={{
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        primaryColor: org.branding?.primaryColor ?? "#14b8a6",
        secondaryColor: org.branding?.secondaryColor ?? "#fb923c",
        sidebarColor: org.branding?.sidebarColor ?? null,
        fontFamily: org.branding?.fontFamily ?? "Geist",
        darkMode: org.branding?.darkMode ?? false,
        customLoginBg: org.branding?.customLoginBg ?? null,
      }}
    />
  );
}
