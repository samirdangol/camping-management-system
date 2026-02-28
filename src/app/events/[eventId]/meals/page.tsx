"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { createMeal, updateMeal, deleteMeal, addMealVolunteer, removeMealVolunteer, addFoodItem, removeFoodItem, generateMealsForEvent } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { UtensilsCrossed, Plus, Trash2, ChefHat, HandHelping, Leaf } from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import type { Family, MealWithDetails } from "@/types";

export default function MealsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { familyId } = useCurrentFamily();
  const isOrganizer = useIsOrganizer(eventId);
  const [families, setFamilies] = useState<Family[]>([]);
  const [meals, setMeals] = useState<MealWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [signups, mealsRes] = await Promise.all([
      fetch(`/api/events/${eventId}/signups`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/meals`).then((r) => r.json()),
    ]);
    setFamilies(signups.map((s: { family: Family }) => s.family));
    setMeals(mealsRes);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleGenerate() {
    await generateMealsForEvent(parseInt(eventId, 10));
    await fetchData();
  }

  async function handleAssignChef(mealId: number, chefFamilyId: string) {
    await updateMeal(mealId, parseInt(eventId, 10), {
      headChefFamilyId: chefFamilyId ? parseInt(chefFamilyId, 10) : null,
    });
    await fetchData();
  }

  async function handleVolunteer(mealId: number) {
    if (!familyId) return;
    await addMealVolunteer(mealId, parseInt(eventId, 10), familyId);
    await fetchData();
  }

  async function handleUnvolunteer(mealId: number) {
    if (!familyId) return;
    await removeMealVolunteer(mealId, parseInt(eventId, 10), familyId);
    await fetchData();
  }

  async function handleAddFood(mealId: number, name: string, isVegetarian: boolean) {
    await addFoodItem(mealId, parseInt(eventId, 10), {
      name,
      suggestedByFamilyId: familyId || undefined,
      isVegetarian,
    });
    await fetchData();
  }

  async function handleRemoveFood(foodItemId: number) {
    await removeFoodItem(foodItemId, parseInt(eventId, 10));
    await fetchData();
  }

  async function handleDeleteMeal(mealId: number) {
    await deleteMeal(mealId, parseInt(eventId, 10));
    await fetchData();
  }

  // Group meals by date
  const mealsByDate = meals.reduce<Record<string, MealWithDetails[]>>((acc, meal) => {
    const dateKey = format(new Date(meal.date), "yyyy-MM-dd");
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
          <Button onClick={handleGenerate} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Auto-Generate Meals
          </Button>
        )}
      </div>

      {meals.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No meals planned yet"
          description="Click 'Auto-Generate Meals' to create breakfast, lunch, and dinner for each day of the trip."
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
                  familyId={familyId}
                  isOrganizer={isOrganizer}
                  onAssignChef={handleAssignChef}
                  onVolunteer={handleVolunteer}
                  onUnvolunteer={handleUnvolunteer}
                  onAddFood={handleAddFood}
                  onRemoveFood={handleRemoveFood}
                  onDelete={handleDeleteMeal}
                />
              ))}
          </div>
        ))
      )}
    </div>
  );
}

function MealCard({
  meal,
  families,
  familyId,
  isOrganizer,
  onAssignChef,
  onVolunteer,
  onUnvolunteer,
  onAddFood,
  onRemoveFood,
  onDelete,
}: {
  meal: MealWithDetails;
  families: Family[];
  familyId: number | null;
  isOrganizer: boolean;
  onAssignChef: (mealId: number, chefFamilyId: string) => void;
  onVolunteer: (mealId: number) => void;
  onUnvolunteer: (mealId: number) => void;
  onAddFood: (mealId: number, name: string, isVegetarian: boolean) => void;
  onRemoveFood: (foodItemId: number) => void;
  onDelete: (mealId: number) => void;
}) {
  const [foodName, setFoodName] = useState("");
  const [isVeg, setIsVeg] = useState(false);
  const isVolunteered = meal.volunteers.some((v) => v.familyId === familyId);

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
          <div className="flex items-center gap-2">
            <Badge className={mealTypeColors[meal.mealType]} variant="secondary">
              {MEAL_TYPE_LABELS[meal.mealType as keyof typeof MEAL_TYPE_LABELS] || meal.mealType}
            </Badge>
            {meal.name && <span className="font-medium">{meal.name}</span>}
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
          <ChefHat className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">Head Chef:</Label>
          <Select
            value={meal.headChefFamilyId?.toString() || ""}
            onValueChange={(v) => onAssignChef(meal.id, v)}
          >
            <SelectTrigger className="h-8 w-[180px] text-sm">
              <SelectValue placeholder="Assign chef" />
            </SelectTrigger>
            <SelectContent>
              {families.map((f) => (
                <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Volunteers */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HandHelping className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Volunteers:</span>
            {isVolunteered ? (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onUnvolunteer(meal.id)}>
                Leave
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onVolunteer(meal.id)}>
                Volunteer
              </Button>
            )}
          </div>
          {meal.volunteers.length > 0 && (
            <div className="flex flex-wrap gap-1 ml-6">
              {meal.volunteers.map((v) => (
                <Badge key={v.id} variant="outline" className="text-xs">
                  {v.family.name}
                  {v.role && ` (${v.role})`}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Food Items */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Food Items:</span>
          {meal.foodItems.length > 0 && (
            <div className="space-y-1 ml-2">
              {meal.foodItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    {item.name}
                    {item.isVegetarian && <Leaf className="h-3 w-3 text-green-600" />}
                    {item.suggestedBy && (
                      <span className="text-xs text-muted-foreground">by {item.suggestedBy.name}</span>
                    )}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveFood(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
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
            <div className="flex items-center gap-1">
              <Checkbox id={`veg-${meal.id}`} checked={isVeg} onCheckedChange={(c) => setIsVeg(c === true)} />
              <Label htmlFor={`veg-${meal.id}`} className="text-xs">Veg</Label>
            </div>
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
