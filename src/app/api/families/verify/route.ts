import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { familyId, pin } = body;

  if (!familyId || !pin) {
    return NextResponse.json(
      { error: "Family ID and PIN are required" },
      { status: 400 }
    );
  }

  if (!/^\d{4}$/.test(String(pin))) {
    return NextResponse.json(
      { error: "PIN must be exactly 4 digits" },
      { status: 400 }
    );
  }

  // Use select to bypass global omit and get only what we need
  const family = await prisma.family.findUnique({
    where: { id: Number(familyId) },
    select: { id: true, pin: true },
  });

  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  // Families without a PIN are always accessible
  if (family.pin === null) {
    return NextResponse.json({ verified: true });
  }

  if (family.pin !== String(pin)) {
    return NextResponse.json(
      { error: "Incorrect PIN", verified: false },
      { status: 401 }
    );
  }

  return NextResponse.json({ verified: true });
}
