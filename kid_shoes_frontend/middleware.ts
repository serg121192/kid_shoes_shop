import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Єдина канонічна версія — без www (tak-i-tak.com). */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    return NextResponse.redirect(url, 308);
  }

  // Уникнути дублікатів /products/ vs /products для Google (API лишаємо зі слешем).
  if (
    pathname.length > 1 &&
    pathname.endsWith("/") &&
    !pathname.startsWith("/api")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
};
