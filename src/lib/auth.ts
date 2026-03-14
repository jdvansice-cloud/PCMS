import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Look up the Prisma User by Supabase Auth ID
  let dbUser = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  // Auto-provision: create Organization + User on first login
  if (!dbUser) {
    const org = await prisma.organization.create({
      data: {
        name: "Mi Clínica",
        updatedAt: new Date(),
      },
    });

    dbUser = await prisma.user.create({
      data: {
        authId: authUser.id,
        organizationId: org.id,
        email: authUser.email ?? "",
        firstName: authUser.email?.split("@")[0] ?? "Admin",
        lastName: "",
        role: "ADMIN",
        updatedAt: new Date(),
      },
    });
  }

  return {
    user: dbUser,
    organizationId: dbUser.organizationId,
  };
}
