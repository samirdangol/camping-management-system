import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UtensilsCrossed, DollarSign, UserCheck } from "lucide-react";
import { InviteLinkCard } from "@/components/shared/invite-link-card";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: eid } = await params;
  const eventId = parseInt(eid, 10);

  const event = await prisma.campingEvent.findUnique({
    where: { id: eventId },
    include: {
      organizer: true,
      signups: { include: { family: true } },
      _count: { select: { meals: true, activities: true, groceryItems: true, equipment: true, expenses: true } },
    },
  });

  if (!event) notFound();

  const totalAdults = event.signups.reduce((sum, s) => sum + s.adults, 0);
  const totalKids = event.signups.reduce((sum, s) => sum + s.kids, 0);
  const totalElderly = event.signups.reduce((sum, s) => sum + s.elderly, 0);
  const totalVegetarians = event.signups.reduce((sum, s) => sum + s.vegetarians, 0);
  const grandTotal = totalAdults + totalKids + totalElderly;

  const expenses = await prisma.expense.aggregate({
    where: { eventId },
    _sum: { amount: true },
  });
  const totalExpenses = Number(expenses._sum.amount || 0);

  return (
    <div className="space-y-6">
      {event.description && (
        <p className="text-sm text-muted-foreground">{event.description}</p>
      )}

      <InviteLinkCard inviteCode={event.inviteCode} />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Families
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{event.signups.length}</div>
            <p className="text-xs text-muted-foreground">{grandTotal} people total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Headcount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-0.5">
              <div>{totalAdults} adults</div>
              <div>{totalKids} kids</div>
              <div>{totalElderly} elderly</div>
              <div>{totalVegetarians} vegetarian</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-0.5">
              <div>{event._count.meals} meals</div>
              <div>{event._count.activities} activities</div>
              <div>{event._count.groceryItems} grocery items</div>
              <div>{event._count.equipment} equipment</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            {event.signups.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalExpenses / event.signups.length)} per family
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {event.signups.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Signed Up Families</h3>
          <div className="flex flex-wrap gap-2">
            {event.signups.map((s) => (
              <span key={s.id} className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
                {s.family.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
