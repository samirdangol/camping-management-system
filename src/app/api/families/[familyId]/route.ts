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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const { familyId } = await params;
  const id = parseInt(familyId, 10);

  const family = await prisma.family.findUnique({ where: { id } });
  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  // Check all relationships
  const [
    signups,
    organizedEvents,
    mealVolunteers,
    ledActivities,
    activityVolunteers,
    assignedSupplies,
    supplyVolunteers,
    expenses,
  ] = await Promise.all([
    prisma.eventSignup.count({ where: { familyId: id } }),
    prisma.campingEvent.count({ where: { organizerFamilyId: id } }),
    prisma.mealVolunteer.count({ where: { familyId: id } }),
    prisma.activity.count({ where: { leaderFamilyId: id } }),
    prisma.activityVolunteer.count({ where: { familyId: id } }),
    prisma.supply.count({ where: { assignedFamilyId: id } }),
    prisma.supplyVolunteer.count({ where: { familyId: id } }),
    prisma.expense.count({ where: { paidByFamilyId: id } }),
  ]);

  const reasons: string[] = [];
  if (signups > 0) reasons.push(`Signed up for ${signups} event(s)`);
  if (organizedEvents > 0) reasons.push(`Organizer of ${organizedEvents} event(s)`);
  if (mealVolunteers > 0) reasons.push(`Volunteered for ${mealVolunteers} meal(s)`);
  if (ledActivities > 0) reasons.push(`Leading ${ledActivities} activity(ies)`);
  if (activityVolunteers > 0) reasons.push(`Volunteered for ${activityVolunteers} activity(ies)`);
  if (assignedSupplies > 0) reasons.push(`Assigned to ${assignedSupplies} supply item(s)`);
  if (supplyVolunteers > 0) reasons.push(`Volunteered for ${supplyVolunteers} supply item(s)`);
  if (expenses > 0) reasons.push(`Has ${expenses} expense record(s)`);

  if (reasons.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete family with existing activity", reasons },
      { status: 409 }
    );
  }

  await prisma.family.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
