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

/** Suggested supply categories — food + gear merged, deduped. Users can type anything. */
export const SUPPLY_CATEGORY_SUGGESTIONS = [
  // food
  "breakfast",
  "lunch/dinner",
  "bbq",
  "drinks",
  "spices",
  "dessert",
  "snacks",
  // gear
  "cookwares",
  "utensils",
  "bbq utensils",
  "campfire",
  "shelter",
  "lighting",
  "cleaning",
  // shared
  "other",
] as const;

export const EXPENSE_CATEGORIES = [
  "food",
  "fuel",
  "campsite",
  "supplies",
  "entertainment",
  "other",
] as const;

// Event lifecycle is now derived from dates via `getEventPhase()` in lib/event-phase.ts.
// The `status` column on CampingEvent is only used to flag "cancelled" — everything else flows from dates.
