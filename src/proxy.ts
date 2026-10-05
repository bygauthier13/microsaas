import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth check only (cookie presence). Real session validation happens in
 * `requireOrg()` on every app page, server action and route handler.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("rc_session")?.value);

  if (pathname.startsWith("/app") && !hasSession) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/signup") && hasSession) {
    return NextResponse.redirect(new URL("/app", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
