import { NextResponse } from "next/server";
import { verifyPasscode, createAuthToken, setAuthCookie, removeAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { passcode } = body;

  if (!verifyPasscode(passcode)) {
    return NextResponse.json(
      { error: "Invalid passcode" },
      { status: 401 }
    );
  }

  const token = await createAuthToken();
  await setAuthCookie(token);

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await removeAuthCookie();
  return NextResponse.json({ success: true });
}
