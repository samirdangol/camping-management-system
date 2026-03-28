import { NextResponse } from "next/server";
import { getCurrentGroup } from "@/lib/auth";

/** GET /api/auth/me — Get current auth context (groupId, groupName) */
export async function GET() {
  const { groupId, groupName } = await getCurrentGroup();
  return NextResponse.json({ groupId: groupId ?? null, groupName: groupName ?? null });
}
