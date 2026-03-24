import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type PortalOwner = {
  id: string;
  authId: string;
  organizationId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
};

export type PortalAuthContext = {
  owner: PortalOwner;
  organizationId: string;
  slug: string;
};

export const getCurrentPortalUser = cache(async function getCurrentPortalUser(): Promise<PortalAuthContext> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const owner = await prisma.owner.findUnique({
    where: { authId: authUser.id },
    select: {
      id: true,
      authId: true,
      organizationId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      whatsapp: true,
      address: true,
      organization: { select: { slug: true, isActive: true } },
    },
  });

  if (!owner || !owner.authId || !owner.organization.isActive) {
    redirect("/login");
  }

  return {
    owner: {
      id: owner.id,
      authId: owner.authId,
      organizationId: owner.organizationId,
      email: owner.email,
      firstName: owner.firstName,
      lastName: owner.lastName,
      phone: owner.phone,
      whatsapp: owner.whatsapp,
      address: owner.address,
    },
    organizationId: owner.organizationId,
    slug: owner.organization.slug,
  };
});
