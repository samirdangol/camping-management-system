import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentGroup, removeAuthCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

/** GET /api/groups/:groupId — Get group info */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId: gid } = await params;
  const groupId = parseInt(gid, 10);
  const { groupId: currentGroupId } = await getCurrentGroup();

  if (currentGroupId !== groupId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const group = await prisma.familyGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, createdAt: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(group);
}

/** PUT /api/groups/:groupId — Update group name or password */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId: gid } = await params;
  const groupId = parseInt(gid, 10);
  const { groupId: currentGroupId } = await getCurrentGroup();

  if (currentGroupId !== groupId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, currentPassword, newPassword } = await request.json();

  const group = await prisma.familyGroup.findUnique({ where: { id: groupId } });
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify current password before allowing changes
  if (!currentPassword || !await bcrypt.compare(currentPassword, group.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const data: { name?: string; passwordHash?: string } = {};
  if (name?.trim() && name.trim() !== group.name) {
    const exists = await prisma.familyGroup.findUnique({ where: { name: name.trim() } });
    if (exists) {
      return NextResponse.json({ error: "A group with this name already exists" }, { status: 409 });
    }
    data.name = name.trim();
  }
  if (newPassword?.trim()) {
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(group);
  }

  const updated = await prisma.familyGroup.update({
    where: { id: groupId },
    data,
    select: { id: true, name: true },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/groups/:groupId — Delete group and all associated data */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId: gid } = await params;
  const groupId = parseInt(gid, 10);
  const { groupId: currentGroupId } = await getCurrentGroup();

  if (currentGroupId !== groupId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { password } = await request.json();
  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const group = await prisma.familyGroup.findUnique({ where: { id: groupId } });
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!await bcrypt.compare(password, group.passwordHash)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  await prisma.familyGroup.delete({ where: { id: groupId } });
  await removeAuthCookie();

  return NextResponse.json({ success: true });
}
