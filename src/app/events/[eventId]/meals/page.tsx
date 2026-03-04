"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, addDays } from "date-fns";
import { createMeal, updateMeal, deleteMeal, addFoodItem, removeFoodItem, addFoodItemVolunteer, removeFoodItemVolunteer } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { UtensilsCrossed, Plus, Trash2, ChefHat, Leaf, X, Hand, UserPlus } from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { familyEmoji } from "@/lib/utils";
import type { Family, MealWithDetails } from "@/types";

type EventInfo = {
  startDate: string;
  endDate: string;
};

/** Build list of person options from signed-up families */
function buildPersonOptions(families: Family[]): { families: string[]; people: string[] } {
  const familyNames = families.map((f) => f.name);
  const people: string[] = [];
  for (const f of families) {
    if (f.contactName) people.push(`${f.contactName} (${f.name})`);
    if (f.contactName2) people.push(`${f.contactName2} (${f.name})`);
  }
  return { families: familyNames, people };
}

/** Get camping days between start and end dates */
function getCampingDays(startDate: string, endDate: string): { value: string; label: string }[] {
  const days: { value: string; label: string }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  while (current <= end) {
    // Use UTC to avoid timezone shift
    const utc = new Date(current.getTime() + current.getTimezoneOffset() * 60000);
    days.push({
      value: current.toISOString(),
      label: format(utc, "EEE, MMM d"),
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export default function MealsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);
  const [families, setFamilies] = useState<Family[]>([]);
  const [meals, setMeals] = useState<MealWithDetails[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Add meal form
  const [newMealDay, setNewMealDay] = useState("");
  const [newMealType, setNewMealType] = useState("");
  const [newMealName, setNewMealName] = useState("");
  const [newMealChef, setNewMealChef] = useState("");
  const [showAddMeal, setShowAddMeal] = useState(false);

  const fetchData = useCallback(async () => {
    const [signups, mealsRes, eventRes] = await Promise.all([
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/meals`).then((r) => r.json()),
      fetch(`/api/events/${eventId}`).then((r) => r.json()),
    ]);
    setFamilies(signups.map((s: { family: Family }) => s.family));
    setMeals(mealsRes);
    setEventInfo({ startDate: eventRes.startDate, endDate: eventRes.endDate });
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const personOptions = buildPersonOptions(families);
  const campingDays = eventInfo ? getCampingDays(eventInfo.startDate, eventInfo.endDate) : [];

  async function handleAddMeal() {
    if (!newMealDay || !newMealType) return;
    await createMeal(parseInt(eventId, 10), {
      date: newMealDay,
      mealType: newMealType,
      name: newMealName || undefined,
      headChefName: newMealChef || undefined,
    });
    setNewMealDay("");
    setNewMealType("");
    setNewMealName("");
    setNewMealChef("");
    setShowAddMeal(false);
    await fetchData();
  }

  async function handleUpdateName(mealId: number, name: string) {
    await updateMeal(mealId, parseInt(eventId, 10), {
      name: name || "",
    });
    await fetchData();
  }

  async function handleUpdateChef(mealId: number, chefName: string) {
    await updateMeal(mealId, parseInt(eventId, 10), {
      headChefName: chefName || null,
    });
    await fetchData();
  }

  async function handleAddFood(mealId: number, name: string, isVegetarian: boolean) {
    await addFoodItem(mealId, parseInt(eventId, 10), { name, isVegetarian });
    await fetchData();
  }

  async function handleRemoveFood(foodItemId: number) {
    await removeFoodItem(foodItemId, parseInt(eventId, 10));
    await fetchData();
  }

  async function handleAddVolunteer(foodItemId: number, name: string) {
    await addFoodItemVolunteer(foodItemId, parseInt(eventId, 10), name);
    await fetchData();
  }

  async function handleRemoveVolunteer(volunteerId: number) {
    await removeFoodItemVolunteer(volunteerId, parseInt(eventId, 10));
    await fetchData();
  }

  async function handleDeleteMeal(mealId: number) {
    await deleteMeal(mealId, parseInt(eventId, 10));
    await fetchData();
  }

  // Group meals by date
  const mealsByDate = meals.reduce<Record<string, MealWithDetails[]>>((acc, meal) => {
    const d = new Date(meal.date);
    const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    const dateKey = format(utc, "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(meal);
    return acc;
  }, {});

  const sortedDates = Object.keys(mealsByDate).sort();
  const mealTypeOrder = ["breakfast", "lunch", "dinner", "snack"];

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Meal Planning</h2>
        {isOrganizer && (
          <Button onClick={() => setShowAddMeal(!showAddMeal)} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Meal
          </Button>
        )}
      </div>

      {/* Add Meal Form */}
      {showAddMeal && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Day</Label>
                <Select value={newMealDay} onValueChange={setNewMealDay}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pick a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {campingDays.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Meal Type</Label>
                <Select value={newMealType} onValueChange={setNewMealType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pick type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEAL_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Meal Name (optional)</Label>
              <Input
                className="h-9 text-sm"
                placeholder="e.g. Goat Biryani, Jhol Masu Bhat"
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Head Chef (optional)</Label>
              <PersonSelect
                value={newMealChef}
                onChange={setNewMealChef}
                options={personOptions}
                placeholder="Assign head chef"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!newMealDay || !newMealType} onClick={handleAddMeal}>
                Add Meal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddMeal(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {meals.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No meals planned yet"
          description="Click 'Add Meal' to plan breakfast, lunch, or dinner for a day of the trip."
        />
      ) : (
        sortedDates.map((dateKey) => (
          <div key={dateKey} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {format(new Date(dateKey + "T12:00:00"), "EEEE, MMM d")}
            </h3>
            {mealsByDate[dateKey]
              .sort((a, b) => mealTypeOrder.indexOf(a.mealType) - mealTypeOrder.indexOf(b.mealType))
              .map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  families={families}
                  currentFamilyId={familyId}
                  personOptions={personOptions}
                  isOrganizer={isOrganizer}
                  onUpdateName={handleUpdateName}
                  onUpdateChef={handleUpdateChef}
                  onAddFood={handleAddFood}
                  onRemoveFood={handleRemoveFood}
                  onAddVolunteer={handleAddVolunteer}
                  onRemoveVolunteer={handleRemoveVolunteer}
                  onDelete={handleDeleteMeal}
                />
              ))}
          </div>
        ))
      )}
    </div>
  );
}

/** Reusable person selector with families, individuals, and free text */
function PersonSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { families: string[]; people: string[] };
  placeholder: string;
}) {
  const [customMode, setCustomMode] = useState(false);

  if (customMode) {
    return (
      <div className="flex gap-1">
        <Input
          className="h-9 text-sm"
          placeholder="Type a name..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Escape") setCustomMode(false); }}
        />
        <Button variant="ghost" size="sm" className="h-9" onClick={() => { setCustomMode(false); onChange(""); }}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={(v) => { if (v === "__custom__") { setCustomMode(true); onChange(""); } else { onChange(v); } }}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.families.length > 0 && (
          <SelectGroup>
            <SelectLabel>Families</SelectLabel>
            {options.families.map((f) => (
              <SelectItem key={`f-${f}`} value={f}>{f}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {options.people.length > 0 && (
          <SelectGroup>
            <SelectLabel>People</SelectLabel>
            {options.people.map((p) => (
              <SelectItem key={`p-${p}`} value={p}>{p}</SelectItem>
            ))}
          </SelectGroup>
        )}
        <SelectGroup>
          <SelectItem value="__custom__">Type a name...</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Get emoji for a volunteer name by matching against families */
function volunteerEmoji(name: string, families: Family[]): string {
  const match = families.find(
    (f) => f.name === name || name.includes(`(${f.name})`)
  );
  return match ? familyEmoji(match.id) : "👤";
}

function MealCard({
  meal,
  families,
  currentFamilyId,
  personOptions,
  isOrganizer,
  onUpdateName,
  onUpdateChef,
  onAddFood,
  onRemoveFood,
  onAddVolunteer,
  onRemoveVolunteer,
  onDelete,
}: {
  meal: MealWithDetails;
  families: Family[];
  currentFamilyId: number | null;
  personOptions: { families: string[]; people: string[] };
  isOrganizer: boolean;
  onUpdateName: (mealId: number, name: string) => void;
  onUpdateChef: (mealId: number, chefName: string) => void;
  onAddFood: (mealId: number, name: string, isVegetarian: boolean) => void;
  onRemoveFood: (foodItemId: number) => void;
  onAddVolunteer: (foodItemId: number, name: string) => void;
  onRemoveVolunteer: (volunteerId: number) => void;
  onDelete: (mealId: number) => void;
}) {
  const [foodName, setFoodName] = useState("");
  const [isVeg, setIsVeg] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(meal.name || "");
  const foodInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.focus();
  }, []);

  const currentFamily = families.find((f) => f.id === currentFamilyId);

  const mealTypeColors: Record<string, string> = {
    breakfast: "bg-yellow-100 text-yellow-800",
    lunch: "bg-orange-100 text-orange-800",
    dinner: "bg-purple-100 text-purple-800",
    snack: "bg-blue-100 text-blue-800",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Badge className={mealTypeColors[meal.mealType]} variant="secondary">
              {MEAL_TYPE_LABELS[meal.mealType as keyof typeof MEAL_TYPE_LABELS] || meal.mealType}
            </Badge>
            {editingName ? (
              <Input
                className="h-7 text-sm font-medium max-w-[200px]"
                placeholder="e.g. Goat Biryani"
                value={nameValue}
                autoFocus
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={() => {
                  onUpdateName(meal.id, nameValue.trim());
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onUpdateName(meal.id, nameValue.trim()); setEditingName(false); }
                  if (e.key === "Escape") { setNameValue(meal.name || ""); setEditingName(false); }
                }}
              />
            ) : (
              <button
                onClick={() => isOrganizer && setEditingName(true)}
                className={`text-sm font-medium truncate ${isOrganizer ? "hover:underline cursor-pointer" : ""} ${meal.name ? "text-foreground" : "text-muted-foreground italic"}`}
              >
                {meal.name || (isOrganizer ? "Add name..." : "")}
              </button>
            )}
          </div>
          {isOrganizer && (
            <Button variant="ghost" size="icon" onClick={() => onDelete(meal.id)} className="h-8 w-8 text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Head Chef */}
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-muted-foreground shrink-0" />
          <Label className="text-sm shrink-0">Head Chef:</Label>
          {isOrganizer ? (
            <div className="w-[220px]">
              <PersonSelect
                value={meal.headChefName || ""}
                onChange={(v) => onUpdateChef(meal.id, v)}
                options={personOptions}
                placeholder="Assign chef"
              />
            </div>
          ) : (
            <span className="text-sm">{meal.headChefName || <span className="text-muted-foreground">Not assigned</span>}</span>
          )}
        </div>

        {/* Food Items as mini-cards */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Food Items:</span>
          {meal.foodItems.length > 0 && (
            <div className="grid gap-2">
              {meal.foodItems.map((item) => {
                const hasVolunteers = item.volunteers.length > 0;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-2.5 transition-colors ${
                      hasVolunteers
                        ? "bg-white border-border"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {item.isVegetarian && <Leaf className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                        {item.name}
                      </span>
                      {isOrganizer && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => onRemoveFood(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {/* Volunteers */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.volunteers.map((v) => (
                        <Badge
                          key={v.id}
                          variant="secondary"
                          className="text-xs gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        >
                          <span>{volunteerEmoji(v.name, families)}</span>
                          {v.name}
                          {isOrganizer && (
                            <button onClick={() => onRemoveVolunteer(v.id)} className="ml-0.5 hover:text-red-500">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </Badge>
                      ))}
                      {/* "I'll bring this!" button for signed-in family */}
                      {currentFamily && !item.volunteers.some((v) => v.name === currentFamily.name) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs gap-1 border-dashed text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => onAddVolunteer(item.id, currentFamily.name)}
                        >
                          <Hand className="h-3 w-3" />
                          I&apos;ll bring this!
                        </Button>
                      )}
                      {/* Assign volunteer (organizer) */}
                      {isOrganizer && (
                        <VolunteerAdder
                          foodItemId={item.id}
                          personOptions={personOptions}
                          families={families}
                          onAdd={onAddVolunteer}
                        />
                      )}
                      {/* No volunteers hint */}
                      {!hasVolunteers && !currentFamily && (
                        <span className="text-xs text-amber-600 italic">Needs a volunteer</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Add food item input */}
          <div className="flex gap-2 items-center mt-1">
            <Input
              placeholder="Add food item..."
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && foodName.trim()) {
                  e.preventDefault();
                  onAddFood(meal.id, foodName.trim(), isVeg);
                  setFoodName("");
                  setIsVeg(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setIsVeg(!isVeg)}
              className={`flex items-center gap-1 px-2 h-8 rounded-md border text-xs transition-colors shrink-0 ${
                isVeg
                  ? "bg-green-100 border-green-300 text-green-700"
                  : "bg-white border-border text-muted-foreground hover:bg-muted"
              }`}
              title="Toggle vegetarian"
            >
              <Leaf className="h-3 w-3" />
              Veg
            </button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!foodName.trim()}
              onClick={() => {
                onAddFood(meal.id, foodName.trim(), isVeg);
                setFoodName("");
                setIsVeg(false);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Inline volunteer adder for a food item (organizer only) */
function VolunteerAdder({
  foodItemId,
  personOptions,
  families,
  onAdd,
}: {
  foodItemId: number;
  personOptions: { families: string[]; people: string[] };
  families: Family[];
  onAdd: (foodItemId: number, name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  if (!adding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs gap-0.5 text-muted-foreground hover:text-blue-600"
        onClick={() => setAdding(true)}
      >
        <UserPlus className="h-3 w-3" /> assign
      </Button>
    );
  }

  return (
    <div className="flex gap-1 items-center">
      <div className="w-[180px]">
        <PersonSelect
          value={value}
          onChange={(v) => {
            if (v) {
              onAdd(foodItemId, v);
              setValue("");
              setAdding(false);
            }
          }}
          options={personOptions}
          placeholder="Pick person"
        />
      </div>
      <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => { setAdding(false); setValue(""); }}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
