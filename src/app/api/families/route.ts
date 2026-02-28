import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Override global omit to access pin for hasPin computation
  const families = await prisma.family.findMany({
    orderBy: { name: "asc" },
    omit: { pin: false },
  });

  // Strip actual pin, return hasPin boolean instead
  const result = families.map(({ pin, ...rest }) => ({
    ...rest,
    hasPin: pin !== null && pin !== "",
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, contactName, contactName2, pin } = body;

  if (!name?.trim() || !contactName?.trim()) {
    return NextResponse.json(
      { error: "Name and contact name are required" },
      { status: 400 }
    );
  }

  if (pin !== undefined && pin !== null && pin !== "") {
    if (!/^\d{4}$/.test(String(pin))) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }
  }

  const family = await prisma.family.upsert({
    where: { name: name.trim() },
    update: { contactName: contactName.trim(), contactName2: contactName2?.trim() || null },
    create: {
      name: name.trim(),
      contactName: contactName.trim(),
      contactName2: contactName2?.trim() || null,
      pin: pin || null,
    },
    omit: { pin: false },
  });

  const { pin: familyPin, ...safeFamily } = family;
  return NextResponse.json({
    ...safeFamily,
    hasPin: familyPin !== null && familyPin !== "",
  });
}
