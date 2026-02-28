import type {
  Family,
  CampingEvent,
  EventSignup,
  Meal,
  MealVolunteer,
  FoodItem,
  Activity,
  ActivityVolunteer,
  GroceryItem,
  GroceryVolunteer,
  Equipment,
  EquipmentVolunteer,
  Expense,
} from "@prisma/client";

// Family as returned by the public API (pin excluded, hasPin flag added)
export type FamilyPublic = Omit<Family, "pin"> & {
  hasPin: boolean;
};

// Event with organizer info
export type EventWithOrganizer = CampingEvent & {
  organizer: Family;
  _count?: {
    signups: number;
    meals: number;
    expenses: number;
  };
};

// Signup with family info
export type SignupWithFamily = EventSignup & {
  family: Family;
};

// Meal with related data
export type MealWithDetails = Meal & {
  headChef: Family | null;
  volunteers: (MealVolunteer & { family: Family })[];
  foodItems: (FoodItem & { suggestedBy: Family | null })[];
};

// Activity with related data
export type ActivityWithDetails = Activity & {
  leader: Family | null;
  volunteers: (ActivityVolunteer & { family: Family })[];
};

// Grocery with assigned family and volunteers
export type GroceryWithFamily = GroceryItem & {
  assignedTo: Family | null;
  volunteers: (GroceryVolunteer & { family: Family })[];
};

// Equipment with owner and volunteers
export type EquipmentWithOwner = Equipment & {
  owner: Family | null;
  volunteers: (EquipmentVolunteer & { family: Family })[];
};

// Expense with payer
export type ExpenseWithFamily = Expense & {
  paidBy: Family;
};

// Expense summary types
export type FamilyBalance = {
  family: Family;
  totalPaid: number;
  fairShare: number;
  balance: number;
};

export type SettlementTransaction = {
  from: Family;
  to: Family;
  amount: number;
};

export type ExpenseSummary = {
  totalExpenses: number;
  familyCount: number;
  perFamilyShare: number;
  balances: FamilyBalance[];
  settlements: SettlementTransaction[];
};

// Headcount aggregation
export type HeadcountSummary = {
  totalFamilies: number;
  totalAdults: number;
  totalKids: number;
  totalElderly: number;
  totalVegetarians: number;
  grandTotal: number;
};

// Re-export Prisma types for convenience
export type {
  Family,
  CampingEvent,
  EventSignup,
  Meal,
  MealVolunteer,
  FoodItem,
  Activity,
  ActivityVolunteer,
  GroceryItem,
  GroceryVolunteer,
  Equipment,
  EquipmentVolunteer,
  Expense,
};
