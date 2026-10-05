import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/** Clears an expired/invalid session cookie, then sends the user to sign in. */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?expired=1", req.nextUrl));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
