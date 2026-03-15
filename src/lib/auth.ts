import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { UserType } from "@/generated/prisma/client";

export type AuthUser = {
  id: string;
  authId: string;
  organizationId: string;
  branchId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  roleId: string | null;
  isActive: boolean;
};

export type AuthContext = {
  user: AuthUser;
  organizationId: string;
  slug: string;
};

export async function getCurrentUser(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { authId: authUser.id },
    select: {
      id: true,
      authId: true,
      organizationId: true,
      branchId: true,
      email: true,
      firstName: true,
      lastName: true,
      userType: true,
      roleId: true,
      isActive: true,
      organization: { select: { slug: true, isActive: true } },
    },
  });

  if (!dbUser || !dbUser.isActive || !dbUser.organization.isActive) {
    redirect("/login");
  }

  return {
    user: {
      id: dbUser.id,
      authId: dbUser.authId,
      organizationId: dbUser.organizationId,
      branchId: dbUser.branchId,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      userType: dbUser.userType,
      roleId: dbUser.roleId,
      isActive: dbUser.isActive,
    },
    organizationId: dbUser.organizationId,
    slug: dbUser.organization.slug,
  };
}

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return false;

  const admin = await prisma.platformAdmin.findUnique({
    where: { authId: authUser.id },
  });

  return !!admin;
}
