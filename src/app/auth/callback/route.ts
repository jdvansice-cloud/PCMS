import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createOrganization } from "@/lib/tenant";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  // Check if user already exists in our DB
  const dbUser = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { organization: { select: { slug: true } } },
  });

  // New user: create org from signup metadata
  if (!dbUser) {
    const metadata = authUser.user_metadata;
    const result = await createOrganization({
      name: metadata?.clinic_name || "Mi Clínica",
      authId: authUser.id,
      email: authUser.email ?? "",
      firstName: metadata?.first_name || authUser.email?.split("@")[0] || "Admin",
      lastName: metadata?.last_name || "",
    });

    return NextResponse.redirect(
      new URL(`/app/${result.organization.slug}/dashboard`, requestUrl.origin),
    );
  }

  // Existing user: redirect to their org dashboard
  return NextResponse.redirect(
    new URL(`/app/${dbUser.organization.slug}/dashboard`, requestUrl.origin),
  );
}
