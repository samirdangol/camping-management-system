import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const { familyId } = await params;

  const family = await prisma.family.findUnique({
    where: { id: parseInt(familyId, 10) },
    omit: { pin: false },
  });

  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  const { pin, ...rest } = family;
  return NextResponse.json({
    ...rest,
    hasPin: pin !== null && pin !== "",
  });
}
