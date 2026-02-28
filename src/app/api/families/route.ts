import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const families = await prisma.family.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(families);
}
