import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, familyEmoji } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarDays, DollarSign, UtensilsCrossed, TreePine, Star } from "lucide-react";

export default async function EventReportPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: eid } = await params;
  const eventId = parseInt(eid, 10);

  const [event, meals, activities, supplies, expenses] = await Promise.all([
    prisma.campingEvent.findUnique({
      where: { id: eventId },
      include: { signups: { include: { family: true } } },
    }),
    prisma.meal.findMany({
      where: { eventId },
      include: {
        volunteers: { include: { family: true } },
        foodItems: true,
      },
    }),
    prisma.activity.findMany({
      where: { eventId },
      include: { volunteers: { include: { family: true } } },
    }),
    prisma.supply.findMany({
      where: { eventId },
      include: {
        assignedTo: true,
        volunteers: { include: { family: true } },
      },
    }),
    prisma.expense.findMany({
      where: { eventId },
      include: { paidBy: true },
      orderBy: { amount: "desc" },
    }),
  ]);

  if (!event) notFound();

  const totalKids = event.signups.reduce((s, r) => s + r.kids, 0);
  const totalAdults = event.signups.reduce((s, r) => s + r.adults, 0);
  const totalElderly = event.signups.reduce((s, r) => s + r.elderly, 0);
  const totalPeople = totalAdults + totalKids + totalElderly;
  const tripNights = Math.round(
    (event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const perFamily = event.signups.length > 0 ? totalExpenses / event.signups.length : 0;

  // ── Derived facts ──────────────────────────────────────────────────

  // Who paid the most
  const paidTotals = new Map<number, { name: string; id: number; total: number }>();
  for (const e of expenses) {
    const prev = paidTotals.get(e.paidByFamilyId) ?? { name: e.paidBy.name, id: e.paidByFamilyId, total: 0 };
    paidTotals.set(e.paidByFamilyId, { ...prev, total: prev.total + e.amount });
  }
  const topPayer = [...paidTotals.values()].sort((a, b) => b.total - a.total)[0];

  // Most active meal volunteer
  const mealVolCounts = new Map<number, { name: string; id: number; count: number }>();
  for (const meal of meals) {
    for (const v of meal.volunteers) {
      const prev = mealVolCounts.get(v.familyId) ?? { name: v.family.name, id: v.familyId, count: 0 };
      mealVolCounts.set(v.familyId, { ...prev, count: prev.count + 1 });
    }
  }
  const topChef = [...mealVolCounts.values()].sort((a, b) => b.count - a.count)[0];

  // Most active activity (most volunteers)
  const topActivity = [...activities].sort((a, b) => b.volunteers.length - a.volunteers.length)[0];

  // Biggest family by headcount
  const biggestFamilySignup = [...event.signups].sort(
    (a, b) => (b.adults + b.kids + b.elderly) - (a.adults + a.kids + a.elderly)
  )[0];
  const biggestFamilyCount = biggestFamilySignup
    ? biggestFamilySignup.adults + biggestFamilySignup.kids + biggestFamilySignup.elderly
    : 0;

  // Family that brought the most supplies
  const supplyByFamily = new Map<number, { name: string; id: number; count: number }>();
  for (const s of supplies) {
    if (!s.assignedFamilyId || !s.assignedTo) continue;
    const prev = supplyByFamily.get(s.assignedFamilyId) ?? { name: s.assignedTo.name, id: s.assignedFamilyId, count: 0 };
    supplyByFamily.set(s.assignedFamilyId, { ...prev, count: prev.count + 1 });
  }
  const topSupplyFamily = [...supplyByFamily.values()].sort((a, b) => b.count - a.count)[0];

  // Top expense category
  const catTotals = new Map<string, number>();
  for (const e of expenses) {
    const cat = e.category ?? "other";
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + e.amount);
  }
  const topCategory = [...catTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  // Cost per person per night
  const costPerPersonPerNight =
    totalExpenses > 0 && totalPeople > 0 && tripNights > 0
      ? totalExpenses / totalPeople / tripNights
      : 0;

  // Total food items across all meals
  const totalFoodItems = meals.reduce((s, m) => s + m.foodItems.length, 0);

  // Head chef: count how many meals each named head chef ran
  const headChefCounts = new Map<string, number>();
  for (const meal of meals) {
    if (meal.headChefName?.trim()) {
      const name = meal.headChefName.trim();
      headChefCounts.set(name, (headChefCounts.get(name) ?? 0) + 1);
    }
  }
  const topHeadChef = [...headChefCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  // Unique head chefs (for "X different families ran a kitchen" fact)
  const uniqueHeadChefs = headChefCounts.size;

  // Most hardworking overall volunteer: sum across meals + activities + supplies
  const totalVolCounts = new Map<number, { name: string; id: number; meals: number; activities: number; supplies: number }>();
  for (const meal of meals) {
    for (const v of meal.volunteers) {
      const prev = totalVolCounts.get(v.familyId) ?? { name: v.family.name, id: v.familyId, meals: 0, activities: 0, supplies: 0 };
      totalVolCounts.set(v.familyId, { ...prev, meals: prev.meals + 1 });
    }
  }
  for (const act of activities) {
    for (const v of act.volunteers) {
      const prev = totalVolCounts.get(v.familyId) ?? { name: v.family.name, id: v.familyId, meals: 0, activities: 0, supplies: 0 };
      totalVolCounts.set(v.familyId, { ...prev, activities: prev.activities + 1 });
    }
  }
  for (const s of supplies) {
    for (const v of s.volunteers) {
      const prev = totalVolCounts.get(v.familyId) ?? { name: v.family.name, id: v.familyId, meals: 0, activities: 0, supplies: 0 };
      totalVolCounts.set(v.familyId, { ...prev, supplies: prev.supplies + 1 });
    }
  }
  const topVolunteer = [...totalVolCounts.values()]
    .map((v) => ({ ...v, total: v.meals + v.activities + v.supplies }))
    .sort((a, b) => b.total - a.total)[0];

  // Top supply volunteer (helper, distinct from who was assigned)
  const supplyVolCounts = new Map<number, { name: string; id: number; count: number }>();
  for (const s of supplies) {
    for (const v of s.volunteers) {
      const prev = supplyVolCounts.get(v.familyId) ?? { name: v.family.name, id: v.familyId, count: 0 };
      supplyVolCounts.set(v.familyId, { ...prev, count: prev.count + 1 });
    }
  }
  const topSupplyVol = [...supplyVolCounts.values()].sort((a, b) => b.count - a.count)[0];

  const biggestExpense = expenses[0];
  const totalVeg = event.signups.reduce((s, r) => s + r.vegetarians, 0);

  // ── Build UI ───────────────────────────────────────────────────────

  const highlights: { icon: React.ElementType; label: string; value: string; sub?: string }[] = [
    {
      icon: Users,
      label: "Attended",
      value: `${totalPeople} people`,
      sub: `${event.signups.length} families`,
    },
    {
      icon: CalendarDays,
      label: "Duration",
      value: `${tripNights} night${tripNights !== 1 ? "s" : ""}`,
    },
    ...(totalExpenses > 0
      ? [
          {
            icon: DollarSign,
            label: "Total Spent",
            value: formatCurrency(totalExpenses),
            sub: `${formatCurrency(perFamily)} / family`,
          },
        ]
      : []),
    ...(meals.length > 0
      ? [{ icon: UtensilsCrossed, label: "Meals", value: `${meals.length} meals` }]
      : []),
    ...(activities.length > 0
      ? [{ icon: TreePine, label: "Activities", value: `${activities.length} activities` }]
      : []),
    ...(supplies.length > 0
      ? [{ icon: TreePine, label: "Supplies", value: `${supplies.length} items` }]
      : []),
  ];

  const standouts: { emoji: string; text: string }[] = [];

  if (topPayer) {
    standouts.push({
      emoji: familyEmoji(topPayer.id),
      text: `${topPayer.name} covered the most — ${formatCurrency(topPayer.total)}`,
    });
  }

  if (biggestExpense) {
    standouts.push({
      emoji: "💸",
      text: `Biggest single expense: "${biggestExpense.description}" — ${formatCurrency(biggestExpense.amount)}`,
    });
  }

  if (topCategory && totalExpenses > 0) {
    const pct = Math.round((topCategory[1] / totalExpenses) * 100);
    standouts.push({
      emoji: "🧾",
      text: `Most money went to ${topCategory[0]} — ${formatCurrency(topCategory[1])} (${pct}% of trip cost)`,
    });
  }

  if (costPerPersonPerNight > 0) {
    standouts.push({
      emoji: "🏕️",
      text: `Trip cost ${formatCurrency(costPerPersonPerNight)} per person per night`,
    });
  }

  if (topHeadChef && topHeadChef[1] > 1) {
    standouts.push({
      emoji: "👑",
      text: `${topHeadChef[0]} ran the kitchen ${topHeadChef[1]} times — head chef of the trip`,
    });
  } else if (topHeadChef) {
    standouts.push({
      emoji: "👑",
      text: `${topHeadChef[0]} was head chef for a meal`,
    });
  }

  if (uniqueHeadChefs > 1) {
    standouts.push({
      emoji: "🍳",
      text: `${uniqueHeadChefs} different families ran the kitchen — everyone pitched in`,
    });
  }

  if (topVolunteer && topVolunteer.total >= 2) {
    const breakdown: string[] = [];
    if (topVolunteer.meals > 0) breakdown.push(`${topVolunteer.meals} meal${topVolunteer.meals !== 1 ? "s" : ""}`);
    if (topVolunteer.activities > 0) breakdown.push(`${topVolunteer.activities} activit${topVolunteer.activities !== 1 ? "ies" : "y"}`);
    if (topVolunteer.supplies > 0) breakdown.push(`${topVolunteer.supplies} supply item${topVolunteer.supplies !== 1 ? "s" : ""}`);
    standouts.push({
      emoji: familyEmoji(topVolunteer.id),
      text: `MVP volunteer: ${topVolunteer.name} signed up for ${breakdown.join(", ")} (${topVolunteer.total} total)`,
    });
  }

  if (topSupplyVol && topSupplyVol.count >= 2) {
    standouts.push({
      emoji: "🎒",
      text: `${topSupplyVol.name} helped with ${topSupplyVol.count} supply items — top grocery helper`,
    });
  }

  if (topChef && topChef.count > 1) {
    standouts.push({
      emoji: "👨‍🍳",
      text: `${topChef.name} volunteered for ${topChef.count} meals`,
    });
  }

  if (totalFoodItems > 0) {
    standouts.push({
      emoji: "🍽️",
      text: `${totalFoodItems} dishes planned across all meals`,
    });
  }

  if (topActivity && topActivity.volunteers.length > 0) {
    standouts.push({
      emoji: "🎉",
      text: `Most popular activity: "${topActivity.name}" with ${topActivity.volunteers.length} participants`,
    });
  }

  if (topSupplyFamily && topSupplyFamily.count > 1) {
    standouts.push({
      emoji: familyEmoji(topSupplyFamily.id),
      text: `${topSupplyFamily.name} brought the most supplies — ${topSupplyFamily.count} items`,
    });
  }

  if (
    biggestFamilySignup &&
    event.signups.length > 1 &&
    biggestFamilyCount > (totalPeople / event.signups.length) * 1.5
  ) {
    standouts.push({
      emoji: familyEmoji(biggestFamilySignup.familyId),
      text: `Biggest crew: ${biggestFamilySignup.family.name} with ${biggestFamilyCount} people`,
    });
  }

  if (totalKids > 0) {
    standouts.push({
      emoji: "🧒",
      text: `${totalKids} kid${totalKids !== 1 ? "s" : ""} came along — ${Math.round((totalKids / totalPeople) * 100)}% of the group`,
    });
  }

  if (totalVeg > 0) {
    standouts.push({
      emoji: "🥦",
      text: `${totalVeg} of ${totalPeople} campers ate vegetarian`,
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-400" />
        Trip Highlights
      </h2>

      {/* Key numbers */}
      <div className="grid grid-cols-3 gap-1.5">
        {highlights.map((h) => (
          <Card key={h.label}>
            <CardContent className="py-2 px-2.5">
              <div className="flex items-center gap-1 mb-0.5">
                <h.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="text-[10px] text-muted-foreground/60 truncate">{h.label}</div>
              </div>
              <div className="text-sm font-bold leading-tight truncate">{h.value}</div>
              {h.sub && <div className="text-[10px] text-muted-foreground leading-tight">{h.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Standout facts */}
      {standouts.length > 0 && (
        <div className="space-y-2">
          {standouts.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-sm">
              <span className="text-base leading-none mt-0.5">{s.emoji}</span>
              <span className="text-muted-foreground">{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
