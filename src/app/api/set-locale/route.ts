import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") || "es";
  const redirectPath = request.nextUrl.searchParams.get("redirect") || "/";

  // Build the redirect URL with the correct locale prefix
  const prefix = locale === "es" ? "" : `/${locale}`;
  const url = new URL(`${prefix}${redirectPath}`, request.url);

  const response = NextResponse.redirect(url);
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
