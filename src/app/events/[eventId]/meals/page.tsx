"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, addDays } from "date-fns";
import { createMeal, updateMeal, deleteMeal, addFoodItem, updateFoodItem, removeFoodItem, addFoodItemVolunteer, removeFoodItemVolunteer } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { UtensilsCrossed, Plus, Trash2, ChefHat, Leaf, X, Hand, UserPlus, ChevronRight, ChevronDown, Check, AlertTriangle, MoreVertical, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { FamilyAvatar } from "@/components/shared/family-avatar";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import type { Family, MealWithDetails } from "@/types";

type EventInfo = {
  startDate: string;
  endDate: string;
};

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

  const [pendingDelete, setPendingDelete] = useState<{ type: "meal" | "food"; id: number } | null>(null);
  const [pendingUnvolunteerId, setPendingUnvolunteerId] = useState<number | null>(null);

  // Add meal form
  const [newMealDay, setNewMealDay] = useState("");
  const [newMealType, setNewMealType] = useState("");
  const [newMealName, setNewMealName] = useState("");
  const [newMealChef, setNewMealChef] = useState("");
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showNewMealChefDialog, setShowNewMealChefDialog] = useState(false);

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

  async function handleUpdateFood(foodItemId: number, name: string, isVegetarian: boolean) {
    await updateFoodItem(foodItemId, parseInt(eventId, 10), { name, isVegetarian });
    await fetchData();
  }

  function handleRemoveFood(foodItemId: number) {
    setPendingDelete({ type: "food", id: foodItemId });
  }

  async function handleAddVolunteer(foodItemId: number, name: string) {
    await addFoodItemVolunteer(foodItemId, parseInt(eventId, 10), name);
    await fetchData();
  }

  function handleRemoveVolunteer(volunteerId: number) {
    setPendingUnvolunteerId(volunteerId);
  }

  async function confirmUnvolunteer() {
    if (pendingUnvolunteerId === null) return;
    await removeFoodItemVolunteer(pendingUnvolunteerId, parseInt(eventId, 10));
    setPendingUnvolunteerId(null);
    await fetchData();
  }

  function handleDeleteMeal(mealId: number) {
    setPendingDelete({ type: "meal", id: mealId });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setPendingDelete(null);
    if (type === "meal") {
      await deleteMeal(id, parseInt(eventId, 10));
    } else {
      await removeFoodItem(id, parseInt(eventId, 10));
    }
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
              <div className="flex items-center gap-2 flex-wrap">
                {newMealChef ? (
                  <Badge variant="secondary" className="text-xs gap-1 bg-emerald-900/40 text-emerald-300 border-emerald-800/50">
                    {newMealChef}
                    <button onClick={() => setNewMealChef("")} className="ml-0.5 hover:text-red-500">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowNewMealChefDialog(true)}
                >
                  <UserPlus className="h-3 w-3" /> {newMealChef ? "Change" : "Pick chef"}
                </Button>
                <Dialog open={showNewMealChefDialog} onOpenChange={setShowNewMealChefDialog}>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Pick Head Chef</DialogTitle>
                    </DialogHeader>
                    <AssignPanelContent
                      families={families}
                      onAssign={(name) => {
                        setNewMealChef(name);
                        setShowNewMealChefDialog(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
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
                  isOrganizer={isOrganizer}
                  onUpdateName={handleUpdateName}
                  onUpdateChef={handleUpdateChef}
                  onAddFood={handleAddFood}
                  onUpdateFood={handleUpdateFood}
                  onRemoveFood={handleRemoveFood}
                  onAddVolunteer={handleAddVolunteer}
                  onRemoveVolunteer={handleRemoveVolunteer}
                  onDelete={handleDeleteMeal}
                />
              ))}
          </div>
        ))
      )}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        title={pendingDelete?.type === "meal" ? "Delete meal?" : "Remove food item?"}
        description={
          pendingDelete?.type === "meal"
            ? "This will permanently remove the meal, all food items, and volunteer assignments."
            : "This will permanently remove the food item and its volunteer assignments."
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDeleteDialog
        open={pendingUnvolunteerId !== null}
        title="Remove volunteer?"
        description="This will remove this person as a volunteer for the food item."
        confirmLabel="Remove"
        onConfirm={confirmUnvolunteer}
        onCancel={() => setPendingUnvolunteerId(null)}
      />
    </div>
  );
}

/** Avatar for a volunteer name by matching against families */
function VolunteerAvatar({ name, families }: { name: string; families: Family[] }) {
  const match = families.find(
    (f) => f.name === name || name.includes(`(${f.name})`)
  );
  return <FamilyAvatar familyId={match?.id ?? null} className="w-4 h-4 text-[10px] mr-0.5" />;
}

function MealCard({
  meal,
  families,
  currentFamilyId,
  isOrganizer,
  onUpdateName,
  onUpdateChef,
  onAddFood,
  onUpdateFood,
  onRemoveFood,
  onAddVolunteer,
  onRemoveVolunteer,
  onDelete,
}: {
  meal: MealWithDetails;
  families: Family[];
  currentFamilyId: number | null;
  isOrganizer: boolean;
  onUpdateName: (mealId: number, name: string) => void;
  onUpdateChef: (mealId: number, chefName: string) => void;
  onAddFood: (mealId: number, name: string, isVegetarian: boolean) => void;
  onUpdateFood: (foodItemId: number, name: string, isVegetarian: boolean) => void;
  onRemoveFood: (foodItemId: number) => void;
  onAddVolunteer: (foodItemId: number, name: string) => void;
  onRemoveVolunteer: (volunteerId: number) => void;
  onDelete: (mealId: number) => void;
}) {
  const [foodName, setFoodName] = useState("");
  const [isVeg, setIsVeg] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(meal.name || "");
  const [editingFoodId, setEditingFoodId] = useState<number | null>(null);
  const [editFoodName, setEditFoodName] = useState("");
  const [editFoodIsVeg, setEditFoodIsVeg] = useState(false);
  const [assignDialogFor, setAssignDialogFor] = useState<number | null>(null);
  const [chefDialogOpen, setChefDialogOpen] = useState(false);
  const foodInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.focus();
  }, []);

  const currentFamily = families.find((f) => f.id === currentFamilyId);

  const mealTypeColors: Record<string, string> = {
    breakfast: "bg-yellow-900/40 text-yellow-300",
    lunch: "bg-orange-900/40 text-orange-300",
    dinner: "bg-purple-900/40 text-purple-300",
    snack: "bg-blue-900/40 text-blue-300",
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
        <div className="flex items-center gap-2 flex-wrap">
          <ChefHat className="h-4 w-4 text-muted-foreground shrink-0" />
          <Label className="text-sm shrink-0">Head Chef:</Label>
          {meal.headChefName ? (
            <Badge variant="secondary" className="text-xs gap-1 bg-emerald-900/40 text-emerald-300 border-emerald-800/50">
              <VolunteerAvatar name={meal.headChefName} families={families} />
              {meal.headChefName}
              {isOrganizer && (
                <button onClick={() => onUpdateChef(meal.id, "")} className="ml-0.5 hover:text-red-500">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ) : (
            !isOrganizer && <span className="text-sm text-muted-foreground">Not assigned</span>
          )}
          {isOrganizer && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-0.5 text-muted-foreground hover:text-blue-400"
                onClick={() => setChefDialogOpen(true)}
              >
                <UserPlus className="h-3 w-3" /> {meal.headChefName ? "Reassign" : "Assign"}
              </Button>
              <Dialog open={chefDialogOpen} onOpenChange={setChefDialogOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Assign Head Chef</DialogTitle>
                  </DialogHeader>
                  <AssignPanelContent
                    families={families}
                    onAssign={(name) => {
                      onUpdateChef(meal.id, name);
                      setChefDialogOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        {/* Food Items as mini-cards */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Food Items:</span>
          {meal.foodItems.length > 0 && (
            <div className="grid gap-2">
              {meal.foodItems.map((item) => {
                const hasVolunteers = item.volunteers.length > 0;
                const isEditingThis = editingFoodId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-2 transition-colors ${
                      isEditingThis
                        ? "bg-blue-950/30 border-blue-800/50"
                        : hasVolunteers
                          ? "bg-card border-border"
                          : "bg-sky-950/30 border-sky-800/50"
                    }`}
                  >
                    {isEditingThis ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditFoodIsVeg((v) => !v)}
                          className={`shrink-0 flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${
                            editFoodIsVeg
                              ? "bg-emerald-900/40 border-emerald-700/50 text-emerald-400"
                              : "bg-muted border-border text-muted-foreground hover:bg-accent"
                          }`}
                          title="Toggle vegetarian"
                        >
                          <Leaf className="h-3.5 w-3.5" />
                        </button>
                        <Input
                          className="h-7 text-sm flex-1"
                          value={editFoodName}
                          autoFocus
                          onChange={(e) => setEditFoodName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editFoodName.trim()) {
                              onUpdateFood(item.id, editFoodName.trim(), editFoodIsVeg);
                              setEditingFoodId(null);
                            }
                            if (e.key === "Escape") setEditingFoodId(null);
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 shrink-0"
                          disabled={!editFoodName.trim()}
                          onClick={() => { onUpdateFood(item.id, editFoodName.trim(), editFoodIsVeg); setEditingFoodId(null); }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                          onClick={() => setEditingFoodId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Left: name only */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {item.isVegetarian && <Leaf className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                          {item.name}
                        </span>
                      </div>
                      {/* Right: family chips OR Volunteer button (same slot) + ⋮ for organizer */}
                      <div className="flex items-center gap-1 shrink-0">
                        {hasVolunteers ? (
                          item.volunteers.map((v) => (
                            <Badge
                              key={v.id}
                              variant="secondary"
                              className="text-xs gap-1 bg-emerald-900/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50"
                            >
                              <VolunteerAvatar name={v.name} families={families} />
                              {v.name}
                              {(isOrganizer || v.name === currentFamily?.name) && (
                                <button onClick={() => onRemoveVolunteer(v.id)} className="ml-0.5 hover:text-red-500">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </Badge>
                          ))
                        ) : currentFamily ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-0.5 border-emerald-700/50 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
                            onClick={() => setAssignDialogFor(item.id)}
                          >
                            <Hand className="h-3 w-3" />
                            Volunteer
                          </Button>
                        ) : (
                          <span className="text-amber-400" title="Needs a volunteer">
                            <AlertTriangle className="h-3 w-3" />
                          </span>
                        )}
                        {isOrganizer && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => setAssignDialogFor(item.id)}>
                                <UserPlus className="h-4 w-4" />
                                Assign
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setEditFoodName(item.name); setEditFoodIsVeg(item.isVegetarian); setEditingFoodId(item.id); }}>
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onRemoveFood(item.id)} variant="destructive">
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Volunteer assign dialog — single instance covers all food items */}
          <Dialog open={assignDialogFor !== null} onOpenChange={(open) => { if (!open) setAssignDialogFor(null); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Assign Volunteer</DialogTitle>
              </DialogHeader>
              <AssignPanelContent
                families={families}
                onAssign={(name) => {
                  if (assignDialogFor !== null) onAddVolunteer(assignDialogFor, name);
                  setAssignDialogFor(null);
                }}
              />
            </DialogContent>
          </Dialog>
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
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-muted border-border text-muted-foreground hover:bg-accent"
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

/* ════════════════════════════════════════════════════════
   Assign Panel Content — rendered inside a Dialog
   ════════════════════════════════════════════════════════ */

function AssignPanelContent({
  families,
  onAssign,
}: {
  families: Family[];
  onAssign: (name: string) => void;
}) {
  const [expandedFamilyId, setExpandedFamilyId] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");

  return (
    <div className="space-y-2">
      {/* Family grid */}
      <div className="grid grid-cols-2 gap-1">
        {families.map((f) => (
          <div key={f.id}>
            <div className="flex items-center">
              <button
                onClick={() => onAssign(f.name)}
                className="flex-1 text-left text-xs px-2.5 py-2 rounded bg-muted hover:bg-muted/80 truncate"
                title={`Assign to ${f.name} family`}
              >
                <span className="inline-flex items-center"><FamilyAvatar familyId={f.id} className="w-5 h-5 mr-1" />{f.name}</span>
              </button>
              {(f.contactName || f.contactName2) && (
                <button
                  onClick={() => setExpandedFamilyId((prev) => prev === f.id ? null : f.id)}
                  className="px-1 py-1.5 text-muted-foreground hover:text-foreground"
                  title="Show individual contacts"
                >
                  {expandedFamilyId === f.id ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
            {expandedFamilyId === f.id && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {f.contactName && (
                  <button
                    onClick={() => onAssign(`${f.contactName} (${f.name})`)}
                    className="block w-full text-left text-[10px] px-2 py-1 rounded hover:bg-blue-900/30 text-blue-400"
                  >
                    → {f.contactName}
                  </button>
                )}
                {f.contactName2 && (
                  <button
                    onClick={() => onAssign(`${f.contactName2} (${f.name})`)}
                    className="block w-full text-left text-[10px] px-2 py-1 rounded hover:bg-blue-900/30 text-blue-400"
                  >
                    → {f.contactName2}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Free text input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (customText.trim()) onAssign(customText.trim());
        }}
        className="flex items-center gap-1 border-t pt-2"
      >
        <Input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Custom name..."
          className="h-7 text-xs flex-1"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-blue-400"
          disabled={!customText.trim()}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
