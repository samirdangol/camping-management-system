"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ============ FAMILY + SIGNUP ACTIONS ============

export async function signupFamily(
  eventId: number,
  familyData: { name: string; contactName: string; contactName2?: string; phone?: string; email?: string; pin?: string },
  headcount: { adults: number; kids: number; elderly: number; vegetarians: number; notes?: string }
) {
  if (familyData.pin && !/^\d{4}$/.test(familyData.pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }

  const result = await prisma.$transaction(async (tx) => {
    const family = await tx.family.upsert({
      where: { name: familyData.name },
      update: {
        contactName: familyData.contactName,
        contactName2: familyData.contactName2 || null,
        phone: familyData.phone || null,
        email: familyData.email || null,
      },
      create: {
        name: familyData.name,
        contactName: familyData.contactName,
        contactName2: familyData.contactName2 || null,
        phone: familyData.phone || null,
        email: familyData.email || null,
        pin: familyData.pin || null,
      },
    });

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
  const familyId = parseInt(formData.get("familyId") as string, 10);
  const reservationNo = (formData.get("reservationNo") as string) || null;
  const checkIn = (formData.get("checkIn") as string) || null;
  const checkOut = (formData.get("checkOut") as string) || null;
  const campsiteUrl = (formData.get("campsiteUrl") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || null;

  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found");

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.campingEvent.create({
      data: {
        title, location, locationUrl, description, startDate, endDate,
        organizerFamilyId: familyId,
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
  const reservationNo = (formData.get("reservationNo") as string) || null;
  const checkIn = (formData.get("checkIn") as string) || null;
  const checkOut = (formData.get("checkOut") as string) || null;
  const campsiteUrl = (formData.get("campsiteUrl") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || null;
  const organizerFamilyIdStr = formData.get("organizerFamilyId") as string;

  await prisma.campingEvent.update({
    where: { id: eventId },
    data: {
      title, location, locationUrl, description, startDate, endDate,
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

export async function updateEventStatus(eventId: number, status: string) {
  await prisma.campingEvent.update({
    where: { id: eventId },
    data: { status },
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
  data: { name: string; description?: string; targetGroup?: string; date?: string; leaderFamilyId?: number }
) {
  await prisma.activity.create({
    data: {
      eventId,
      name: data.name,
      description: data.description || null,
      targetGroup: data.targetGroup || "all",
      date: data.date ? new Date(data.date) : null,
      leaderFamilyId: data.leaderFamilyId || null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateActivity(
  activityId: number,
  eventId: number,
  data: { name: string; description?: string; targetGroup?: string; date?: string; leaderFamilyId?: number | null }
) {
  await prisma.activity.update({
    where: { id: activityId },
    data: {
      name: data.name,
      description: data.description || null,
      targetGroup: data.targetGroup || "all",
      date: data.date ? new Date(data.date) : null,
      leaderFamilyId: data.leaderFamilyId ?? null,
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
  items: Array<{ name: string; targetGroup?: string; leaderFamilyId?: number }>
) {
  await prisma.activity.createMany({
    data: items.map((item) => ({
      eventId,
      name: item.name,
      targetGroup: item.targetGroup || "all",
      leaderFamilyId: item.leaderFamilyId || null,
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

// ============ GROCERY ACTIONS ============

export async function createGroceryItem(
  eventId: number,
  data: { name: string; category?: string; quantity?: string; estimatedCost?: number; assignedFamilyId?: number; mealTag?: string; notes?: string }
) {
  // Auto-assign sortOrder at the end
  const maxSort = await prisma.groceryItem.aggregate({ where: { eventId }, _max: { sortOrder: true } });
  const nextSort = (maxSort._max.sortOrder ?? 0) + 10;

  await prisma.groceryItem.create({
    data: {
      eventId,
      name: data.name,
      category: data.category || null,
      quantity: data.quantity || null,
      estimatedCost: data.estimatedCost || null,
      assignedFamilyId: data.assignedFamilyId || null,
      mealTag: data.mealTag || null,
      sortOrder: nextSort,
      notes: data.notes || null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateGroceryItem(
  itemId: number,
  eventId: number,
  data: { name?: string; category?: string; quantity?: string; estimatedCost?: number | null; assignedFamilyId?: number | null; isPurchased?: boolean; mealTag?: string | null; notes?: string }
) {
  await prisma.groceryItem.update({
    where: { id: itemId },
    data,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteGroceryItem(itemId: number, eventId: number) {
  await prisma.groceryItem.delete({ where: { id: itemId } });
  revalidatePath(`/events/${eventId}`);
}

export async function claimGroceryItem(itemId: number, eventId: number, familyId: number) {
  await prisma.groceryItem.update({
    where: { id: itemId },
    data: { assignedFamilyId: familyId },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function unclaimGroceryItem(itemId: number, eventId: number) {
  await prisma.groceryItem.update({
    where: { id: itemId },
    data: { assignedFamilyId: null },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function toggleGroceryPurchased(itemId: number, eventId: number, isPurchased: boolean) {
  await prisma.groceryItem.update({
    where: { id: itemId },
    data: { isPurchased },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function bulkCreateGroceryItems(
  eventId: number,
  items: Array<{ name: string; category?: string; quantity?: string; estimatedCost?: number; mealTag?: string }>
) {
  const maxSort = await prisma.groceryItem.aggregate({ where: { eventId }, _max: { sortOrder: true } });
  let nextSort = (maxSort._max.sortOrder ?? 0) + 10;

  await prisma.groceryItem.createMany({
    data: items.map((item) => {
      const sortOrder = nextSort;
      nextSort += 10;
      return {
        eventId,
        name: item.name,
        category: item.category || null,
        quantity: item.quantity || null,
        estimatedCost: item.estimatedCost || null,
        mealTag: item.mealTag || null,
        sortOrder,
      };
    }),
  });
  revalidatePath(`/events/${eventId}`);
}

// ============ EQUIPMENT ACTIONS ============

export async function createEquipment(
  eventId: number,
  data: { name: string; category?: string; quantity?: number; ownerFamilyId?: number; notes?: string }
) {
  const maxSort = await prisma.equipment.aggregate({ where: { eventId }, _max: { sortOrder: true } });
  const nextSort = (maxSort._max.sortOrder ?? 0) + 10;

  await prisma.equipment.create({
    data: {
      eventId,
      name: data.name,
      category: data.category || null,
      quantity: data.quantity || 1,
      ownerFamilyId: data.ownerFamilyId || null,
      sortOrder: nextSort,
      notes: data.notes || null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateEquipment(
  itemId: number,
  eventId: number,
  data: { name?: string; category?: string; quantity?: number; ownerFamilyId?: number | null; notes?: string }
) {
  await prisma.equipment.update({
    where: { id: itemId },
    data,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteEquipment(itemId: number, eventId: number) {
  await prisma.equipment.delete({ where: { id: itemId } });
  revalidatePath(`/events/${eventId}`);
}

export async function bulkCreateEquipment(
  eventId: number,
  items: Array<{ name: string; category?: string; quantity?: number; notes?: string }>
) {
  const maxSort = await prisma.equipment.aggregate({ where: { eventId }, _max: { sortOrder: true } });
  let nextSort = (maxSort._max.sortOrder ?? 0) + 10;

  await prisma.equipment.createMany({
    data: items.map((item) => {
      const sortOrder = nextSort;
      nextSort += 10;
      return {
        eventId,
        name: item.name,
        category: item.category || null,
        quantity: item.quantity || 1,
        notes: item.notes || null,
        sortOrder,
      };
    }),
  });
  revalidatePath(`/events/${eventId}`);
}

export async function claimEquipment(itemId: number, eventId: number, familyId: number) {
  await prisma.equipment.update({
    where: { id: itemId },
    data: { ownerFamilyId: familyId },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function unclaimEquipment(itemId: number, eventId: number) {
  await prisma.equipment.update({
    where: { id: itemId },
    data: { ownerFamilyId: null },
  });
  revalidatePath(`/events/${eventId}`);
}

// ============ CATEGORY MANAGEMENT ACTIONS ============

export async function renameGroceryCategory(eventId: number, oldName: string, newName: string) {
  await prisma.groceryItem.updateMany({
    where: { eventId, category: oldName },
    data: { category: newName },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function clearGroceryCategory(eventId: number, categoryName: string) {
  await prisma.groceryItem.updateMany({
    where: { eventId, category: categoryName },
    data: { category: null },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function renameEquipmentCategory(eventId: number, oldName: string, newName: string) {
  await prisma.equipment.updateMany({
    where: { eventId, category: oldName },
    data: { category: newName },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function clearEquipmentCategory(eventId: number, categoryName: string) {
  await prisma.equipment.updateMany({
    where: { eventId, category: categoryName },
    data: { category: null },
  });
  revalidatePath(`/events/${eventId}`);
}

// ============ GROCERY VOLUNTEER ACTIONS ============

export async function addGroceryVolunteer(groceryItemId: number, eventId: number, familyId: number) {
  await prisma.groceryVolunteer.create({
    data: { groceryItemId, familyId },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeGroceryVolunteer(groceryItemId: number, eventId: number, familyId: number) {
  await prisma.groceryVolunteer.delete({
    where: { groceryItemId_familyId: { groceryItemId, familyId } },
  });
  revalidatePath(`/events/${eventId}`);
}

// ============ EQUIPMENT VOLUNTEER ACTIONS ============

export async function addEquipmentVolunteer(equipmentId: number, eventId: number, familyId: number) {
  await prisma.equipmentVolunteer.create({
    data: { equipmentId, familyId },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeEquipmentVolunteer(equipmentId: number, eventId: number, familyId: number) {
  await prisma.equipmentVolunteer.delete({
    where: { equipmentId_familyId: { equipmentId, familyId } },
  });
  revalidatePath(`/events/${eventId}`);
}

// ============ REORDER ACTIONS ============

export async function reorderGroceryItem(itemId: number, eventId: number, direction: "up" | "down") {
  const items = await prisma.groceryItem.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return;

  // Swap sortOrder values
  await prisma.$transaction([
    prisma.groceryItem.update({ where: { id: items[idx].id }, data: { sortOrder: items[swapIdx].sortOrder } }),
    prisma.groceryItem.update({ where: { id: items[swapIdx].id }, data: { sortOrder: items[idx].sortOrder } }),
  ]);
  revalidatePath(`/events/${eventId}`);
}

export async function reorderEquipment(itemId: number, eventId: number, direction: "up" | "down") {
  const items = await prisma.equipment.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return;

  await prisma.$transaction([
    prisma.equipment.update({ where: { id: items[idx].id }, data: { sortOrder: items[swapIdx].sortOrder } }),
    prisma.equipment.update({ where: { id: items[swapIdx].id }, data: { sortOrder: items[idx].sortOrder } }),
  ]);
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

