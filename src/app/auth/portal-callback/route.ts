import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  // Read the portal slug from cookie
  const cookieStore = await cookies();
  const slug = cookieStore.get("portal_slug")?.value;
  const orgId = cookieStore.get("portal_org_id")?.value;

  if (!slug || !orgId) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  // Verify the organization exists
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, slug: true, isActive: true },
  });

  if (!org || !org.isActive || org.slug !== slug) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  // 1. Try to find Owner by authId
  let owner = await prisma.owner.findUnique({
    where: { authId: authUser.id },
  });

  if (!owner) {
    // 2. Try to find Owner by email + organizationId
    if (authUser.email) {
      owner = await prisma.owner.findFirst({
        where: { organizationId: orgId, email: authUser.email },
      });

      if (owner) {
        // Link the existing owner to this auth user
        await prisma.owner.update({
          where: { id: owner.id },
          data: { authId: authUser.id },
        });
      }
    }

    // 3. No owner found — create a new one
    if (!owner) {
      const metadata = authUser.user_metadata;
      owner = await prisma.owner.create({
        data: {
          organizationId: orgId,
          authId: authUser.id,
          email: authUser.email ?? null,
          firstName: metadata?.firstName || authUser.email?.split("@")[0] || "",
          lastName: metadata?.lastName || "",
        },
      });
    }
  }

  // Clear portal cookies
  const response = NextResponse.redirect(
    new URL(`/portal/${slug}/dashboard`, requestUrl.origin)
  );
  response.cookies.delete("portal_slug");
  response.cookies.delete("portal_org_id");

  return response;
}
