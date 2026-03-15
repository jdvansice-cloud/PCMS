import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find user's org and redirect
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: { organization: { select: { slug: true } } },
  });

  if (dbUser) {
    redirect(`/app/${dbUser.organization.slug}/dashboard`);
  }

  // No org yet, send to register
  redirect("/register");
}
