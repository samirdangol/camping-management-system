import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentGroup } from "@/lib/auth";

/** POST /api/feedback — Submit feedback */
export async function POST(request: Request) {
  const { message, page, familyId, familyName } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const { groupId } = await getCurrentGroup();

  const feedback = await prisma.feedback.create({
    data: {
      message: message.trim(),
      page: page || null,
      familyId: familyId || null,
      familyName: familyName || null,
      groupId: groupId || null,
    },
  });

  return NextResponse.json({ success: true, id: feedback.id });
}

/** GET /api/feedback — List all feedback (for admin viewing) */
export async function GET() {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: { family: { select: { name: true } }, group: { select: { name: true } } },
  });

  return NextResponse.json(feedback);
}

/** DELETE /api/feedback — Delete a feedback item by id */
export async function DELETE(request: Request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.feedback.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
