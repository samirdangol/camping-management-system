import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentGroup } from "@/lib/auth";

export async function GET() {
  const { groupId } = await getCurrentGroup();

  // Override global omit to access pin for hasPin computation
  const families = await prisma.family.findMany({
    where: groupId ? { groupId } : {},
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

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, name, contactName, contactName2, phone, email, pin, paypalMe } = body;

  if (!id) {
    return NextResponse.json({ error: "Family ID is required" }, { status: 400 });
  }

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

  const family = await prisma.family.update({
    where: { id: Number(id) },
    data: {
      name: name.trim(),
      contactName: contactName.trim(),
      contactName2: contactName2?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      paypalMe: paypalMe?.trim() || null,
      // Only update PIN if explicitly provided (empty string = remove PIN)
      ...(pin !== undefined ? { pin: pin || null } : {}),
    },
    omit: { pin: false },
  });

  const { pin: familyPin, ...safeFamily } = family;
  return NextResponse.json({
    ...safeFamily,
    hasPin: familyPin !== null && familyPin !== "",
  });
}

/**
 * Partial update — only fields present in the body are touched.
 * Used by the PayPal/Zelle inline dialogs so they don't have to echo every field.
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, name, contactName, contactName2, phone, email, pin, paypalMe } = body;

  if (!id) {
    return NextResponse.json({ error: "Family ID is required" }, { status: 400 });
  }

  if (pin !== undefined && pin !== null && pin !== "") {
    if (!/^\d{4}$/.test(String(pin))) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }
  }

  const data: Record<string, string | null> = {};
  if (name !== undefined) {
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name cannot be blank" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (contactName !== undefined) {
    if (!contactName?.trim()) {
      return NextResponse.json({ error: "Contact name cannot be blank" }, { status: 400 });
    }
    data.contactName = contactName.trim();
  }
  if (contactName2 !== undefined) data.contactName2 = contactName2?.trim() || null;
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (email !== undefined) data.email = email?.trim() || null;
  if (paypalMe !== undefined) data.paypalMe = paypalMe?.trim() || null;
  if (pin !== undefined) data.pin = pin || null;

  const family = await prisma.family.update({
    where: { id: Number(id) },
    data,
    omit: { pin: false },
  });

  const { pin: familyPin, ...safeFamily } = family;
  return NextResponse.json({
    ...safeFamily,
    hasPin: familyPin !== null && familyPin !== "",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, contactName, contactName2, pin } = body;
  const { groupId } = await getCurrentGroup();

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

  // Check for existing family within the same group
  const existing = await prisma.family.findFirst({
    where: {
      name: name.trim(),
      groupId: groupId ?? null,
    },
  });

  if (existing) {
    // Update existing family
    const family = await prisma.family.update({
      where: { id: existing.id },
      data: {
        contactName: contactName.trim(),
        contactName2: contactName2?.trim() || null,
      },
      omit: { pin: false },
    });
    const { pin: familyPin, ...safeFamily } = family;
    return NextResponse.json({
      ...safeFamily,
      hasPin: familyPin !== null && familyPin !== "",
    });
  }

  // Create new family
  const family = await prisma.family.create({
    data: {
      name: name.trim(),
      contactName: contactName.trim(),
      contactName2: contactName2?.trim() || null,
      pin: pin || null,
      groupId: groupId ?? null,
    },
    omit: { pin: false },
  });

  const { pin: familyPin, ...safeFamily } = family;
  return NextResponse.json({
    ...safeFamily,
    hasPin: familyPin !== null && familyPin !== "",
  });
}
