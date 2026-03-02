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
    headChefMeals,
    mealVolunteers,
    ledActivities,
    activityVolunteers,
    assignedGroceries,
    groceryVolunteers,
    ownedEquipment,
    equipmentVolunteers,
    expenses,
  ] = await Promise.all([
    prisma.eventSignup.count({ where: { familyId: id } }),
    prisma.campingEvent.count({ where: { organizerFamilyId: id } }),
    prisma.meal.count({ where: { headChefFamilyId: id } }),
    prisma.mealVolunteer.count({ where: { familyId: id } }),
    prisma.activity.count({ where: { leaderFamilyId: id } }),
    prisma.activityVolunteer.count({ where: { familyId: id } }),
    prisma.groceryItem.count({ where: { assignedFamilyId: id } }),
    prisma.groceryVolunteer.count({ where: { familyId: id } }),
    prisma.equipment.count({ where: { ownerFamilyId: id } }),
    prisma.equipmentVolunteer.count({ where: { familyId: id } }),
    prisma.expense.count({ where: { paidByFamilyId: id } }),
  ]);

  const reasons: string[] = [];
  if (signups > 0) reasons.push(`Signed up for ${signups} event(s)`);
  if (organizedEvents > 0) reasons.push(`Organizer of ${organizedEvents} event(s)`);
  if (headChefMeals > 0) reasons.push(`Head chef for ${headChefMeals} meal(s)`);
  if (mealVolunteers > 0) reasons.push(`Volunteered for ${mealVolunteers} meal(s)`);
  if (ledActivities > 0) reasons.push(`Leading ${ledActivities} activity(ies)`);
  if (activityVolunteers > 0) reasons.push(`Volunteered for ${activityVolunteers} activity(ies)`);
  if (assignedGroceries > 0) reasons.push(`Assigned to ${assignedGroceries} grocery item(s)`);
  if (groceryVolunteers > 0) reasons.push(`Volunteered for ${groceryVolunteers} grocery item(s)`);
  if (ownedEquipment > 0) reasons.push(`Owns ${ownedEquipment} equipment item(s)`);
  if (equipmentVolunteers > 0) reasons.push(`Volunteered for ${equipmentVolunteers} equipment item(s)`);
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
