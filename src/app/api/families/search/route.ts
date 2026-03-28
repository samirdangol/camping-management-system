import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentGroup } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const { groupId } = await getCurrentGroup();

  if (q.length < 2) return NextResponse.json([]);

  const families = await prisma.family.findMany({
    where: {
      name: { contains: q },
      ...(groupId ? { groupId } : {}),
    },
    take: 10,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(families);
}
