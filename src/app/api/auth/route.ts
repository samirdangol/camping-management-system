import { NextResponse } from "next/server";
import { createAuthToken, setAuthCookie, removeAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const body = await request.json();
  const { groupName, password } = body;

  if (!groupName?.trim() || !password) {
    return NextResponse.json({ error: "Group name and password are required" }, { status: 400 });
  }

  const group = await prisma.familyGroup.findUnique({
    where: { name: groupName.trim() },
  });
  if (!group || !await bcrypt.compare(password, group.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid group name or password" },
      { status: 401 }
    );
  }

  const token = await createAuthToken(group.id, group.name);
  await setAuthCookie(token);
  return NextResponse.json({ success: true, groupId: group.id, groupName: group.name });
}

export async function DELETE() {
  await removeAuthCookie();
  return NextResponse.json({ success: true });
}
