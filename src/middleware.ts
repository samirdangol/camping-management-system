import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, auth API, public join routes, groups creation, and family lookup/verify for join flow
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

  const token = request.cookies.get("cms-auth")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
