import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const meals = await prisma.meal.findMany({
    where: { eventId: parseInt(eventId, 10) },
    include: {
      volunteers: { include: { family: true } },
      foodItems: { include: { volunteers: true } },
    },
    orderBy: [{ date: "asc" }, { mealType: "asc" }],
  });
  return NextResponse.json(meals);
}
