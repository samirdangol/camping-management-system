import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const families = await prisma.family.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(families);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, contactName } = body;

  if (!name?.trim() || !contactName?.trim()) {
    return NextResponse.json(
      { error: "Name and contact name are required" },
      { status: 400 }
    );
  }

  const family = await prisma.family.upsert({
    where: { name: name.trim() },
    update: { contactName: contactName.trim() },
    create: { name: name.trim(), contactName: contactName.trim() },
  });

  return NextResponse.json(family);
}
