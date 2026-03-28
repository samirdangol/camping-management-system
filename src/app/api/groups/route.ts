import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** GET /api/groups — List all group names (public) */
export async function GET() {
  const groups = await prisma.familyGroup.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(groups);
}

/** POST /api/groups — Create a new family group */
export async function POST(request: Request) {
  const { name, password } = await request.json();

  if (!name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
  }

  const existing = await prisma.familyGroup.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "A group with this name already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const group = await prisma.familyGroup.create({
    data: { name: name.trim(), passwordHash },
  });

  return NextResponse.json({ id: group.id, name: group.name });
}
