import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, auth API, and public join routes
  if (
    pathname === "/login" ||
    pathname === "/api/auth" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/api/join/")
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
