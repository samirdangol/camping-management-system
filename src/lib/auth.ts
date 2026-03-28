import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "cms-auth";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

interface AuthPayload {
  authenticated: true;
  groupId?: number;
  groupName?: string;
}

export async function createAuthToken(groupId: number, groupName: string): Promise<string> {
  const payload: AuthPayload = { authenticated: true, groupId, groupName };

  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

/** Extract groupId from the JWT token (returns undefined if no group) */
export async function getGroupFromToken(token: string): Promise<{ groupId?: number; groupName?: string }> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      groupId: payload.groupId as number | undefined,
      groupName: payload.groupName as string | undefined,
    };
  } catch {
    return {};
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Get the current group context from the auth cookie */
export async function getCurrentGroup(): Promise<{ groupId?: number; groupName?: string }> {
  const token = await getAuthCookie();
  if (!token) return {};
  return getGroupFromToken(token);
}
