import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** POST /api/groups/reset-password — Reset a group's password using admin secret */
export async function POST(request: Request) {
  const { groupName, newPassword, adminSecret } = await request.json();

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Invalid admin secret" }, { status: 401 });
  }

  if (!groupName?.trim() || !newPassword?.trim()) {
    return NextResponse.json({ error: "Group name and new password are required" }, { status: 400 });
  }

  const group = await prisma.familyGroup.findUnique({ where: { name: groupName.trim() } });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.familyGroup.update({
    where: { id: group.id },
    data: { passwordHash },
  });

  return NextResponse.json({ success: true, message: `Password reset for "${group.name}"` });
}
