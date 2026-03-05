export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const TARGET_GROUPS = ["all", "kids", "adults", "elderly"] as const;
export type TargetGroup = (typeof TARGET_GROUPS)[number];

export const TARGET_GROUP_LABELS: Record<TargetGroup, string> = {
  all: "All Ages",
  kids: "Kids",
  adults: "Adults",
  elderly: "Elderly",
};

export const GROCERY_CATEGORIES = [
  "breakfast",
  "lunch/dinner",
  "bbq",
  "drinks",
  "spices",
  "dessert",
  "snacks",
  "other",
] as const;

/** Suggested categories shown as autocomplete options — users can type anything */
export const GROCERY_CATEGORY_SUGGESTIONS = GROCERY_CATEGORIES;

export const EQUIPMENT_CATEGORIES = [
  "cookwares",
  "utensils",
  "bbq utensils",
  "campfire",
  "shelter",
  "lighting",
  "cleaning",
  "other",
] as const;

/** Suggested categories shown as autocomplete options — users can type anything */
export const EQUIPMENT_CATEGORY_SUGGESTIONS = EQUIPMENT_CATEGORIES;

export const EXPENSE_CATEGORIES = [
  "food",
  "fuel",
  "campsite",
  "supplies",
  "entertainment",
  "other",
] as const;

export const EVENT_STATUSES = [
  "upcoming",
  "active",
  "completed",
  "cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
