import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

const COOKIE_NAME = "cms-auth";
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days
// Re-issue the cookie when its remaining lifetime is below this threshold,
// so an active user is never logged out mid-session.
const REFRESH_WHEN_REMAINING_S = 60 * 60 * 24 * 7; // 7 days

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes: login, auth API, join flow, group create + password reset, family lookup/verify.
  if (
    pathname === "/login" ||
    pathname === "/api/auth" ||
    pathname === "/api/groups" ||
    pathname === "/api/groups/reset-password" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/api/join/") ||
    (pathname === "/api/families" && request.method === "GET") ||
    pathname === "/api/families/verify"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    const response = NextResponse.next();
    const exp = typeof payload.exp === "number" ? payload.exp : 0;
    const nowS = Math.floor(Date.now() / 1000);
    const remaining = exp - nowS;

    // Sliding refresh: when the token is nearing expiry, issue a fresh one
    // (preserving groupId/groupName) so an active user stays signed in.
    if (remaining > 0 && remaining < REFRESH_WHEN_REMAINING_S) {
      const refreshed = await new SignJWT({
        authenticated: true,
        groupId: payload.groupId,
        groupName: payload.groupName,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);

      response.cookies.set(COOKIE_NAME, refreshed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE_S,
        path: "/",
      });
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
