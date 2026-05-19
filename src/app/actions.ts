"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentGroup } from "@/lib/auth";

// ============ FAMILY + SIGNUP ACTIONS ============

export async function signupFamily(
  eventId: number,
  familyData: { name: string; contactName: string; contactName2?: string; phone?: string; email?: string; pin?: string; paypalMe?: string; familyId?: number },
  headcount: { adults: number; kids: number; elderly: number; vegetarians: number; notes?: string }
) {
  if (familyData.pin && !/^\d{4}$/.test(familyData.pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }

  const { groupId } = await getCurrentGroup();

  const result = await prisma.$transaction(async (tx) => {
    // When editing, look up by ID so renames work correctly
    let family = familyData.familyId
      ? await tx.family.findUnique({ where: { id: familyData.familyId } })
      : await tx.family.findFirst({ where: { name: familyData.name, groupId: groupId ?? null } });

    if (family) {
      family = await tx.family.update({
        where: { id: family.id },
        data: {
          name: familyData.name,
          contactName: familyData.contactName,
          contactName2: familyData.contactName2 || null,
          phone: familyData.phone || null,
          email: familyData.email || null,
          paypalMe: familyData.paypalMe || null,
        },
      });
    } else {
      family = await tx.family.create({
        data: {
          name: familyData.name,
          contactName: familyData.contactName,
          contactName2: familyData.contactName2 || null,
          phone: familyData.phone || null,
          email: familyData.email || null,
          paypalMe: familyData.paypalMe || null,
          pin: familyData.pin || null,
          groupId: groupId ?? null,
        },
      });
    }

    const signup = await tx.eventSignup.upsert({
      where: { eventId_familyId: { eventId, familyId: family.id } },
      update: headcount,
      create: { eventId, familyId: family.id, ...headcount },
    });

    return { family, signup };
  });

  revalidatePath(`/events/${eventId}`);
  return result;
}

export async function signupExistingFamily(
  eventId: number,
  familyId: number,
  headcount: { adults: number; kids: number; elderly: number; vegetarians: number; notes?: string }
) {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found");

  await prisma.eventSignup.upsert({
    where: { eventId_familyId: { eventId, familyId } },
    update: headcount,
    create: { eventId, familyId, ...headcount },
  });

  revalidatePath(`/events/${eventId}`);
  return { family };
}

// ============ EVENT ACTIONS ============

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const location = formData.get("location") as string;
  const locationUrl = (formData.get("locationUrl") as string) || null;
  const description = (formData.get("description") as string) || null;
  const startDate = new Date(formData.get("startDate") as string);
  const endDate = new Date(formData.get("endDate") as string);
  const signupDeadlineRaw = formData.get("signupDeadline") as string | null;
  const signupDeadline = signupDeadlineRaw ? new Date(signupDeadlineRaw) : null;
  const familyId = parseInt(formData.get("familyId") as string, 10);
  const reservationNo = (formData.get("reservationNo") as string) || null;
  const checkIn = (formData.get("checkIn") as string) || null;
  const checkOut = (formData.get("checkOut") as string) || null;
  const campsiteUrl = (formData.get("campsiteUrl") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || null;

  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found");

  const { groupId } = await getCurrentGroup();

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.campingEvent.create({
      data: {
        title, location, locationUrl, description, startDate, endDate, signupDeadline,
        organizerFamilyId: familyId,
        groupId: groupId ?? null,
        reservationNo,
        checkIn,
        checkOut,
        campsiteUrl,
        imageUrl,
      },
    });

    await tx.eventSignup.create({
      data: { eventId: event.id, familyId, adults: 1, kids: 0, elderly: 0, vegetarians: 0 },
    });

    return event;
  });

  revalidatePath("/events");
  return result.id;
}

export async function updateEvent(eventId: number, formData: FormData) {
  const title = formData.get("title") as string;
  const location = formData.get("location") as string;
  const locationUrl = (formData.get("locationUrl") as string) || null;
  const description = (formData.get("description") as string) || null;
  const startDate = new Date(formData.get("startDate") as string);
  const endDate = new Date(formData.get("endDate") as string);
  const signupDeadlineRaw = formData.get("signupDeadline") as string | null;
  const signupDeadline = signupDeadlineRaw ? new Date(signupDeadlineRaw) : null;
  const reservationNo = (formData.get("reservationNo") as string) || null;
  const checkIn = (formData.get("checkIn") as string) || null;
  const checkOut = (formData.get("checkOut") as string) || null;
  const campsiteUrl = (formData.get("campsiteUrl") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || null;
  const organizerFamilyIdStr = formData.get("organizerFamilyId") as string;

  await prisma.campingEvent.update({
    where: { id: eventId },
    data: {
      title, location, locationUrl, description, startDate, endDate, signupDeadline,
      reservationNo,
      checkIn,
      checkOut,
      campsiteUrl,
      imageUrl,
      ...(organizerFamilyIdStr ? { organizerFamilyId: parseInt(organizerFamilyIdStr, 10) } : {}),
    },
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}

export async function deleteEvent(eventId: number) {
  await prisma.campingEvent.delete({ where: { id: eventId } });
  revalidatePath("/events");
}

export async function cancelEvent(eventId: number) {
  await prisma.campingEvent.update({
    where: { id: eventId },
    data: { status: "cancelled" },
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}

export async function restoreEvent(eventId: number) {
  await prisma.campingEvent.update({
    where: { id: eventId },
    data: { status: "upcoming" },
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}

// ============ SIGNUP ACTIONS ============

export async function createOrUpdateSignup(
  eventId: number,
  familyId: number,
  data: { adults: number; kids: number; elderly: number; vegetarians: number; notes?: string }
) {
  await prisma.eventSignup.upsert({
    where: { eventId_familyId: { eventId, familyId } },
    update: data,
    create: { eventId, familyId, ...data },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeSignup(eventId: number, familyId: number) {
  await prisma.eventSignup.delete({
    where: { eventId_familyId: { eventId, familyId } },
  });
  revalidatePath(`/events/${eventId}`);
}

// ============ MEAL ACTIONS ============

export async function createMeal(
  eventId: number,
  data: { date: string; mealType: string; name?: string; headChefName?: string; notes?: string }
) {
  await prisma.meal.create({
    data: {
      eventId,
      date: new Date(data.date),
      mealType: data.mealType,
      name: data.name || null,
      headChefName: data.headChefName || null,
      notes: data.notes || null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateMeal(
  mealId: number,
  eventId: number,
  data: { name?: string; headChefName?: string | null; notes?: string }
) {
  await prisma.meal.update({
    where: { id: mealId },
    data: {
      name: data.name !== undefined ? (data.name || null) : undefined,
      headChefName: data.headChefName !== undefined ? (data.headChefName || null) : undefined,
      notes: data.notes !== undefined ? (data.notes || null) : undefined,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteMeal(mealId: number, eventId: number) {
  await prisma.meal.delete({ where: { id: mealId } });
  revalidatePath(`/events/${eventId}`);
}

export async function addMealVolunteer(mealId: number, eventId: number, familyId: number, role?: string) {
  await prisma.mealVolunteer.create({
    data: { mealId, familyId, role: role || null },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeMealVolunteer(mealId: number, eventId: number, familyId: number) {
  await prisma.mealVolunteer.delete({
    where: { mealId_familyId: { mealId, familyId } },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function addFoodItem(
  mealId: number,
  eventId: number,
  data: { name: string; isVegetarian?: boolean }
) {
  await prisma.foodItem.create({
    data: {
      mealId,
      name: data.name,
      isVegetarian: data.isVegetarian || false,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateFoodItem(
  foodItemId: number,
  eventId: number,
  data: { name: string; isVegetarian?: boolean }
) {
  await prisma.foodItem.update({
    where: { id: foodItemId },
    data: { name: data.name, isVegetarian: data.isVegetarian ?? false },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeFoodItem(foodItemId: number, eventId: number) {
  await prisma.foodItem.delete({ where: { id: foodItemId } });
  revalidatePath(`/events/${eventId}`);
}

export async function addFoodItemVolunteer(foodItemId: number, eventId: number, name: string) {
  await prisma.foodItemVolunteer.create({
    data: { foodItemId, name },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeFoodItemVolunteer(volunteerId: number, eventId: number) {
  await prisma.foodItemVolunteer.delete({ where: { id: volunteerId } });
  revalidatePath(`/events/${eventId}`);
}

// ============ ACTIVITY ACTIONS ============

export async function createActivity(
  eventId: number,
  data: { name: string; description?: string; targetGroup?: string; date?: string; leaderFamilyId?: number; leaderLabel?: string }
) {
  await prisma.activity.create({
    data: {
      eventId,
      name: data.name,
      description: data.description || null,
      targetGroup: data.targetGroup || "all",
      date: data.date ? new Date(data.date) : null,
      leaderFamilyId: data.leaderFamilyId || null,
      leaderLabel: data.leaderLabel || null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateActivity(
  activityId: number,
  eventId: number,
  data: { name: string; description?: string; targetGroup?: string; date?: string; leaderFamilyId?: number | null; leaderLabel?: string | null }
) {
  await prisma.activity.update({
    where: { id: activityId },
    data: {
      name: data.name,
      description: data.description || null,
      targetGroup: data.targetGroup || "all",
      date: data.date ? new Date(data.date) : null,
      leaderFamilyId: data.leaderFamilyId ?? null,
      leaderLabel: data.leaderLabel ?? null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteActivity(activityId: number, eventId: number) {
  await prisma.activity.delete({ where: { id: activityId } });
  revalidatePath(`/events/${eventId}`);
}

export async function bulkCreateActivities(
  eventId: number,
  items: Array<{ name: string; targetGroup?: string; leaderFamilyId?: number; leaderLabel?: string }>
) {
  await prisma.activity.createMany({
    data: items.map((item) => ({
      eventId,
      name: item.name,
      targetGroup: item.targetGroup || "all",
      leaderFamilyId: item.leaderFamilyId || null,
      leaderLabel: item.leaderLabel || null,
    })),
  });
  revalidatePath(`/events/${eventId}`);
}

export async function addActivityVolunteer(activityId: number, eventId: number, familyId: number, role?: string) {
  await prisma.activityVolunteer.create({
    data: { activityId, familyId, role: role || null },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeActivityVolunteer(activityId: number, eventId: number, familyId: number) {
  await prisma.activityVolunteer.delete({
    where: { activityId_familyId: { activityId, familyId } },
  });
  revalidatePath(`/events/${eventId}`);
}

// ============ SUPPLY ACTIONS ============

export async function createSupply(
  eventId: number,
  data: { name: string; category?: string; assignedFamilyId?: number; notes?: string }
) {
  const maxSort = await prisma.supply.aggregate({ where: { eventId }, _max: { sortOrder: true } });
  const nextSort = (maxSort._max.sortOrder ?? 0) + 10;

  await prisma.supply.create({
    data: {
      eventId,
      name: data.name,
      category: data.category || null,
      assignedFamilyId: data.assignedFamilyId || null,
      sortOrder: nextSort,
      notes: data.notes || null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateSupply(
  itemId: number,
  eventId: number,
  data: { name?: string; category?: string; assignedFamilyId?: number | null; notes?: string | null }
) {
  await prisma.supply.update({
    where: { id: itemId },
    data,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteSupply(itemId: number, eventId: number) {
  await prisma.supply.delete({ where: { id: itemId } });
  revalidatePath(`/events/${eventId}`);
}

export async function claimSupply(itemId: number, eventId: number, familyId: number | null, label?: string) {
  await prisma.supply.update({
    where: { id: itemId },
    data: {
      assignedFamilyId: familyId,
      assignedLabel: familyId ? null : (label || null),
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function unclaimSupply(itemId: number, eventId: number) {
  await prisma.supply.update({
    where: { id: itemId },
    data: { assignedFamilyId: null, assignedLabel: null },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function bulkCreateSupplies(
  eventId: number,
  items: Array<{ name: string; category?: string; notes?: string }>
) {
  const maxSort = await prisma.supply.aggregate({ where: { eventId }, _max: { sortOrder: true } });
  let nextSort = (maxSort._max.sortOrder ?? 0) + 10;

  await prisma.supply.createMany({
    data: items.map((item) => {
      const sortOrder = nextSort;
      nextSort += 10;
      return {
        eventId,
        name: item.name,
        category: item.category || null,
        notes: item.notes || null,
        sortOrder,
      };
    }),
  });
  revalidatePath(`/events/${eventId}`);
}

export async function renameSupplyCategory(eventId: number, oldName: string, newName: string) {
  await prisma.supply.updateMany({
    where: { eventId, category: oldName },
    data: { category: newName },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function clearSupplyCategory(eventId: number, categoryName: string) {
  await prisma.supply.updateMany({
    where: { eventId, category: categoryName },
    data: { category: null },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteAllSupplies(eventId: number) {
  await prisma.supply.deleteMany({ where: { eventId } });
  revalidatePath(`/events/${eventId}`);
}

export async function restoreSupplyCategory(
  eventId: number,
  supplyIds: number[],
  categoryName: string
) {
  if (supplyIds.length === 0) return;
  await prisma.supply.updateMany({
    where: { eventId, id: { in: supplyIds } },
    data: { category: categoryName },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function addSupplyVolunteer(supplyId: number, eventId: number, familyId: number) {
  await prisma.supplyVolunteer.create({
    data: { supplyId, familyId },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeSupplyVolunteer(supplyId: number, eventId: number, familyId: number) {
  await prisma.supplyVolunteer.delete({
    where: { supplyId_familyId: { supplyId, familyId } },
  });
  revalidatePath(`/events/${eventId}`);
}

export type SortOrderUpdate = { id: number; category: string | null; sortOrder: number };

export async function setSupplyOrder(eventId: number, updates: SortOrderUpdate[]) {
  if (updates.length === 0) return;
  await prisma.$transaction(
    updates.map((u) =>
      prisma.supply.update({
        where: { id: u.id },
        data: { category: u.category, sortOrder: u.sortOrder },
      })
    )
  );
  revalidatePath(`/events/${eventId}`);
}

// ============ EXPENSE ACTIONS ============

export async function createExpense(
  eventId: number,
  data: { description: string; amount: number; paidByFamilyId: number; category?: string; date?: string; receiptNote?: string }
) {
  await prisma.expense.create({
    data: {
      eventId,
      description: data.description,
      amount: data.amount,
      paidByFamilyId: data.paidByFamilyId,
      category: data.category || null,
      date: data.date ? new Date(data.date) : new Date(),
      receiptNote: data.receiptNote || null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateExpense(
  expenseId: number,
  eventId: number,
  data: { description?: string; amount?: number; paidByFamilyId?: number; category?: string; date?: string; receiptNote?: string }
) {
  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteExpense(expenseId: number, eventId: number) {
  await prisma.expense.delete({ where: { id: expenseId } });
  revalidatePath(`/events/${eventId}`);
}

export async function bulkCreateExpenses(
  eventId: number,
  items: Array<{ description: string; amount: number; paidByFamilyId: number; category?: string }>
) {
  await prisma.expense.createMany({
    data: items.map((item) => ({
      eventId,
      description: item.description,
      amount: item.amount,
      paidByFamilyId: item.paidByFamilyId,
      category: item.category || null,
      date: new Date(),
    })),
  });
  revalidatePath(`/events/${eventId}`);
}

export async function confirmNoExpenses(eventId: number, familyId: number, noExpenses: boolean) {
  await prisma.eventSignup.updateMany({
    where: { eventId, familyId },
    data: { noExpenses },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function markSettlementPaid(eventId: number, fromFamilyId: number, toFamilyId: number, amount: number) {
  await prisma.settlementPayment.upsert({
    where: { eventId_fromFamilyId_toFamilyId: { eventId, fromFamilyId, toFamilyId } },
    create: { eventId, fromFamilyId, toFamilyId, amount },
    update: { amount, settledAt: new Date() },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function unmarkSettlementPaid(eventId: number, fromFamilyId: number, toFamilyId: number) {
  await prisma.settlementPayment.deleteMany({
    where: { eventId, fromFamilyId, toFamilyId },
  });
  revalidatePath(`/events/${eventId}`);
}
